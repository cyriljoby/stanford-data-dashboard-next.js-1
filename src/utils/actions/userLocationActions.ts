"use server";
import { prisma } from "../db";
import {
  selectUserLocationSchema,
  createLocationSchema,
  validateWithZodSchema,
  stanfordSelectUserLocationSchema,
} from "../schemas";
import { Roles } from "@prisma/client";
import { UserLocationWithoutId } from "../types";
import { renderError } from "../helpers";
import { getUser } from "./userActions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureStanfordUser } from "./userActions";
import { sendLocationApprovedEmail } from "../email/templates/locationStatusEmail";
import { sendLocationDeclinedEmail } from "../email/templates/locationStatusEmail";

export const fillUserLocationDetails = async (
  validatedFields: any,
  userLocation: UserLocationWithoutId
) => {
  if (validatedFields.state && validatedFields.city && validatedFields.school) {
    const completeLocation = await prisma.location.findFirst({
      where: {
        state: validatedFields.state,
        city: validatedFields.city,
        school: validatedFields.school,
      },
    });

    userLocation.state = validatedFields.state;
    if (completeLocation?.district && completeLocation?.county) {
      userLocation.district = completeLocation.district;
      userLocation.county = completeLocation.county;
    }
  }
};

const verifyLocationConsistency = async ({
  userId,
  role,
  isTeacher,
  userLocation,
  onMismatch,
  onSiteLimit,
  onGeneralLimit,
}: {
  userId: string;
  role: Roles;
  isTeacher: boolean;
  userLocation: UserLocationWithoutId;
  onMismatch: string;
  onSiteLimit: string;
  onGeneralLimit: string;
}) => {
  const dbUserLocation = await prisma.userLocation.findFirst({
    where: { userId },
  });

  if (!dbUserLocation || role === Roles.teacher || role === Roles.stanford || isTeacher)
    return;

  if (
    isTeacher &&
    role !== Roles.site &&
    userLocation[role] !== dbUserLocation[role]
  ) {
    throw Error(`${onMismatch} '${dbUserLocation[role]}'`);
  }

  if (role === Roles.site) {
    throw Error(onSiteLimit);
  }

  throw Error(onGeneralLimit);
};

export const addUserLocation = async (prevState: any, formData: FormData) => {
  try {
    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(
      selectUserLocationSchema,
      rawData
    );
    const { role, userId, isTeacher } = await getUser();

    const userLocation: UserLocationWithoutId = {
      userId,
      country: validatedFields.country,
      state: validatedFields.state || null,
      county: validatedFields.county || null,
      city: validatedFields.city || null,
      district: validatedFields.district || null,
      school: validatedFields.school || null,
      multiplePeriods: validatedFields.multiplePeriods,
      approved: true,
    };

    await fillUserLocationDetails(validatedFields, userLocation);
    await verifyLocationConsistency({
      userId,
      role,
      isTeacher,
      userLocation,
      onMismatch: `You can only add locations within the same ${role} of your first school: `,
      onSiteLimit:
        "You are not allowed to submit a location either because you already have a location or have a location pending.",
      onGeneralLimit: `${role} admin are only allowed to submit one location`,
    });
    await prisma.userLocation.create({
      data: {
        ...userLocation,
      },
    });

    const redirect = isTeacher ? "/dashboard" : "/dashboard/metrics";

    return { message: "Successfully added location", redirect };
  } catch (error) {
    return renderError(error);
  }
};

export const createLocation = async (prevState: any, formData: FormData) => {
  try {
    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(
      createLocationSchema,
      rawData
    );

    const { role, userId, isTeacher } = await getUser();
    if (!isTeacher && role !== Roles.site) {
      throw Error(`${role} admin are not allowed to create a location`);
    }

    const userLocation: UserLocationWithoutId = {
      userId,
      country: validatedFields.country,
      state: validatedFields.state || null,
      county: validatedFields.county || null,
      city: validatedFields.city,
      district: validatedFields.district || null,
      school: validatedFields.school,
      multiplePeriods: validatedFields.multiplePeriods,
      approved: false,
    };

    await verifyLocationConsistency({
      userId,
      role,
      isTeacher,
      userLocation,
      onMismatch: `You can only create locations within the same ${role} of your first school: `,
      onSiteLimit:
        "You are not allowed to create a location either because you already have a location or have a location pending.",
      onGeneralLimit: `${role} admin are not allowed to create a location`,
    });
    await prisma.userLocation.create({
      data: {
        ...userLocation,
      },
    });

    return {
      message: "Successfully requested location",
      redirect: "/pendingLocation",
    };
  } catch (error) {
    return renderError(error);
  }
};

export const getUserLocationCount = async () => {
  const { userId } = await getUser();

  const userLocations = await prisma.userLocation.findMany({
    where: {
      userId: userId as string,
    },
  });

  let numApprovedUserLocations = 0;
  let numPendingUserLocations = 0;

  for (let i = 0; i < userLocations.length; i++) {
    if (userLocations[i].approved) {
      numApprovedUserLocations += 1;
    } else {
      numPendingUserLocations += 1;
    }
  }

  return { numApprovedUserLocations, numPendingUserLocations };
};

export const getUserLocations = async (userId: string) => {
  const userLocations = await prisma.userLocation.findMany({
    where: {
      userId,
      approved: true,
    },
  });

  return userLocations;
};

export const getUserLocation = async (userId: string) => {
  const userLocation = await prisma.userLocation.findFirst({
    where: {
      userId,
      approved: true,
    },
  });

  if (userLocation) {
    return userLocation;
  }

  return redirect("/selectUserLocation");
};

export const getPendingUserLocations = async () => {
  const userLocations = await prisma.userLocation.findMany({
    where: {
      approved: false,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return userLocations;
};

export const declineLocationRequest = async (
  prevState: any,
  formData: FormData
) => {
  void formData;
  try {
    const { userLocationId } = prevState;

    const userLocation = await prisma.userLocation.delete({
      where: { id: userLocationId },
      include: { user: true },
    });

    if (userLocation?.user?.email) {
      const locationName =
        userLocation.school || userLocation.city || "your site";
      await sendLocationDeclinedEmail(
        userLocation.user.email,
        userLocation.user.name,
        locationName
      );
    }

    revalidatePath("/dashboard/manageLocations");
    return { message: "Location request declined" };
  } catch (error) {
    return renderError(error);
  }
};

export const approveLocationRequest = async (
  prevState: any,
  formData: FormData
) => {
  void formData;
  try {
    const { userLocationId } = prevState;

    const userLocation = await prisma.userLocation.update({
      where: { id: userLocationId },
      data: {
        approved: true,
      },
      include: { user: true },
    });

    await prisma.location.create({
      data: {
        country: userLocation.country,
        state: userLocation.state,
        county: userLocation.county,
        district: userLocation.district,
        city: userLocation.city as string,
        school: userLocation.school as string,
      },
    });
    console.log(userLocation);
    if (userLocation.user?.email) {
      const locationName =
        userLocation.school || userLocation.city || "your site";
      await sendLocationApprovedEmail(
        userLocation.user.email,
        userLocation.user.name,
        locationName
      );
    }

    revalidatePath("/dashboard/manageLocations");
    return {
      message: "Location request approved",
      redirect: "/dashboard/manageLocations",
    };
  } catch (error) {
    return renderError(error);
  }
};

export const stanfordAddUserLocation = async (
  prevState: any,
  formData: FormData
) => {
  try {
    await ensureStanfordUser();

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = validateWithZodSchema(
      stanfordSelectUserLocationSchema,
      rawData
    );

    const requestedUserLocation = await prisma.userLocation.findUnique({
      where: {
        id: validatedFields.locationId,
      },
      include: {
        user: true,
      },
    });

    if (!requestedUserLocation || requestedUserLocation.approved) {
      throw Error("Invalid location ID");
    }

    const { id: userId, role, isTeacher, name } = requestedUserLocation.user;
    if (
      validatedFields.country !== "UNITED STATES" &&
      role !== Roles.site &&
      role !== Roles.teacher
    ) {
      throw Error("This user's country must be 'UNITED STATES'");
    }

    const userLocation: UserLocationWithoutId = {
      userId: requestedUserLocation.userId,
      country: validatedFields.country,
      state: validatedFields.state || null,
      county: null,
      district: null,
      city: validatedFields.city,
      school: validatedFields.school,
      multiplePeriods: requestedUserLocation.multiplePeriods,
      approved: true,
    };

    await fillUserLocationDetails(validatedFields, userLocation);
    await prisma.userLocation.delete({
      where: {
        id: validatedFields.locationId,
      },
    });
    await verifyLocationConsistency({
      userId,
      role,
      isTeacher,
      userLocation,
      onMismatch: `This user can only have locations within the same ${role} as their first school: `,
      onSiteLimit:
        "This user is a site admin and already has a location or one that is pending approval.",
      onGeneralLimit: `As a ${role} admin, this user is only allowed to have one location.`,
    });
    await prisma.userLocation.create({
      data: {
        ...userLocation,
      },
    });

    return {
      message: `Location for ${name} added successfully`,
      redirect: "/dashboard/manageLocations",
    };
  } catch (error) {
    return renderError(error);
  }
};

export const getUserFromLocation = async (locationId: string) => {
  const userLocation = await prisma.userLocation.findUnique({
    where: {
      id: locationId,
    },
    include: {
      user: true,
    },
  });

  if (userLocation) {
    return userLocation;
  }

  return redirect("/dashboard/manageLocations");
};

import { Roles } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const authorizeRoute = async (
  request: NextRequest,
  userId: string,
  role: Roles,
  isTeacher: boolean
) => {
  const pathname = request.nextUrl.pathname;

  const url = new URL(`/api/userLocations?userId=${userId}`, request.url);
  const res = await fetch(url.toString());
  const { numApprovedUserLocations, numPendingUserLocations } =
    await res.json();

  const redirect = isTeacher ? "/dashboard" : "/dashboard/metrics";

  let roleClassification = "admin";
  if (role === "stanford") {
    roleClassification = "stanford";
  } else if (isTeacher) {
    if (role === "site") {
      roleClassification = "siteAndTeacher";
    } else {
      roleClassification = "teacher";
    }
  }

  if (
    numPendingUserLocations === 1 &&
    role === "site" &&
    pathname !== "/pendingLocation"
  ) {
    return NextResponse.redirect(new URL("/pendingLocation", request.url));
  }

  const routesAccessibleWithoutUserLocation =
    isTeacher || role === "site"
      ? ["/selectUserLocation", "/createLocation", "/pendingLocation"]
      : ["/selectUserLocation"];

  if (
    numApprovedUserLocations === 0 &&
    !routesAccessibleWithoutUserLocation.includes(pathname) &&
    role !== "stanford"
  ) {
    return NextResponse.redirect(new URL("/selectUserLocation", request.url));
  }

  if (
    numApprovedUserLocations === 0 &&
    (roleClassification === "admin" || roleClassification === "siteAndTeacher")
  ) {
    return;
  }

  const restrictedRoutes: Record<string, string[]> = {
    stanford: [
      "/createLocation",
      "/dashboard/home",
      "/pendingLocation",
      "/selectUserLocation",
    ],
    admin: [
      "/createLocation",
      "/dashboard/home",
      "/dashboard/manageForms",
      "/dashboard/manageLocations",
      "/pendingLocation",
      "/selectUserLocation/[id]",
      "/selectUserLocation"
    ],
    siteAndTeacher: [
      "/createLocation",
      "/dashboard/manageForms",
      "/dashboard/manageLocations",
      "/pendingLocation",
      "/selectUserLocation",
      "/selectUserLocation/[id]",
    ],
    teacher: [
      "/dashboard/manageForms",
      "/dashboard/manageLocations",
      "/selectUserLocation/[id]",
    ],
  };

  // Check if path is restricted for this role
  const isRestricted = restrictedRoutes[roleClassification].some((route) => {
    // Handle dynamic routes with [id]
    if (route.includes("[id]")) {
      const pattern = route.replace("[id]", "");
      return pathname.startsWith(pattern) && pathname !== pattern;
    }
    // Handle prefix matching for routes like /dashboard/manageForms
    if (route.endsWith("/manageForms") || route.endsWith("/manageLocations")) {
      return pathname.startsWith(route);
    }
    // Exact match for other routes
    return pathname === route;
  });

  if (isRestricted) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }
};

export default authorizeRoute;

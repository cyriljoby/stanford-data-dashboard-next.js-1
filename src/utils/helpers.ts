import { Roles } from "@prisma/client";

export const renderError = (
  error: unknown
): { message: string; errorMessage: boolean } => {
  console.log(error);
  return {
    message: error instanceof Error ? error.message : "an error occurred",
    errorMessage: true,
  };
};

export const getRequiredLocationFields = ({
  country,
  role,
  isTeacher,
}: {
  country: string;
  role: Roles;
  isTeacher: boolean;
}) => {
  const isUSA = country === "UNITED STATES";

  return {
    canAccessNonUS:
      role === Roles.stanford ||
      role === Roles.country ||
      role === Roles.site ||
      role === Roles.teacher,
    isUSA,
    requireState: isUSA && role !== Roles.country,
    requireCounty:
      isUSA && (role === Roles.county || role === Roles.district) && !isTeacher,
    requireDistrict: isUSA && role === Roles.district && !isTeacher,
    requireCityAndSchool:
      role === Roles.stanford || role === Roles.site || isTeacher,
  };
};

export const fetchLocations = async (
  returnType: string,
  query: Record<string, string>
): Promise<string[]> => {
  const params = new URLSearchParams({ ...query, returnType });
  const res = await fetch(`/api/locations?${params.toString()}`);
  const data: { locations: Record<string, string>[] } = await res.json();

  return [...new Set(data.locations.map((item) => item[returnType]).sort())];
};

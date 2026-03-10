import AdminMetricsFilters from "@/components/metrics/AdminMetricsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser, getUserLocation, getUserLocations } from "@/utils/actions";
import { Roles } from "@prisma/client";
import { getActiveForms } from "@/utils/actions";
import TeacherMetricsFilters from "@/components/metrics/TeacherMetricsFilters";
import { prisma } from "@/utils/db";

const MetricsPage = async () => {
  const { role, userId } = await getUser();
  const adminLocation =
    role !== Roles.stanford && role !== Roles.teacher
      ? await getUserLocation(userId)
      : null;
  const teacherLocations =
    role === Roles.teacher ? await getUserLocations(userId) : [];

  const forms = await getActiveForms();

  // Get first response date based on role
  let firstResponseDate: Date | undefined;

  if (role === Roles.teacher) {
    // For teachers: get THEIR earliest response
    const firstResponse = await prisma.responseWithTeacher.findFirst({
      where: { teacherId: userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    firstResponseDate = firstResponse?.createdAt;
  } else {
    // For admins: get earliest response across ALL data
    const firstResponse = await prisma.responseWithTeacher.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    firstResponseDate = firstResponse?.createdAt;
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Form Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {role === Roles.teacher ? (
            <TeacherMetricsFilters
              role={role}
              userId={userId}
              teacherLocations={teacherLocations}
              forms={[...forms]}
              firstResponseDate={firstResponseDate}
            />
          ) : (
            <AdminMetricsFilters
              role={role}
              userId={userId}
              adminLocation={adminLocation}
              forms={[...forms]}
              firstResponseDate={firstResponseDate}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsPage;

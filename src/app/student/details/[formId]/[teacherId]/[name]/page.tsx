import StudentDetailsForm from "@/components/studentDetails/StudentDetailsForm";
import { Card, CardContent } from "@/components/ui/card";
import { getSingleActiveForm, getUserLocations, getAllForms } from "@/utils/actions";
import { UserLocation } from "@prisma/client";
import Logo from "@/components/global/Logo";

const DetailsPage = async ({ params }: any) => {
  const routeParams = await params;
  const { formId, teacherId, name } = routeParams;

  const decodedName = decodeURIComponent(name);
  const joinedWithTeacherCode = teacherId !== "0" && name !== "notapplicable";
  const title = joinedWithTeacherCode
    ? `You have joined ${decodedName}'s class`
    : `Please enter your grade to continue`;

  const form = await getSingleActiveForm(formId);
  const allForms = await getAllForms();
  let teacherLocations: UserLocation[] = [];
  if (joinedWithTeacherCode) {
    teacherLocations = await getUserLocations(teacherId);
  }

  return (
    <div className="grid h-lvh place-items-center">
      <Card className="w-full max-w-lg">
        <Logo />
        <CardContent>
          <h3 className="font-semibold mb-6">{title}</h3>
          <StudentDetailsForm
            teacherLocations={teacherLocations}
            formTitle={form.title}
            formType={form.type}
            routeParams={routeParams}
            allForms={allForms}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailsPage;

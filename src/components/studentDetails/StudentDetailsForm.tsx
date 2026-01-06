"use client";

import SelectInput from "../form/SelectInput";
import { Form, UserLocation } from "@prisma/client";
import SchoolAndPeriodInput from "./SchoolAndPeriodInput";
import { SubmitButton } from "../form/Buttons";
import { redirect } from "next/navigation";

const StudentDetailsForm = ({
  teacherLocations,
  formTitle,
  formType,
  routeParams,
}: {
  teacherLocations: UserLocation[];
  formTitle: string;
  formType: Form["type"];
  routeParams: { formId: string; teacherId: string; name: string };
}) => {
  // Check if this is an elementary form
  const isElemForm = formTitle.toLowerCase().includes("(elem)");

  // For elementary forms: K-5, for others: K-12 + college
  const grades = isElemForm
    ? Array.from({ length: 5 }, (_, i) => {
        return { text: (i + 1).toString(), value: (i + 1).toString() };
      })
    : Array.from({ length: 12 }, (_, i) => {
        return { text: (i + 1).toString(), value: (i + 1).toString() };
      });

  grades.unshift({ text: "k", value: "k" });

  // Only add "college or above" for non-elem forms
  if (!isElemForm) {
    grades.push({ text: "college or above", value: "college or above" });
  }

  const formOptions = [{ text: formTitle, value: formTitle }];

  console.log(teacherLocations);

  const types = [
    { text: "before lesson", value: "pre" },
    { text: "after lesson", value: "post" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = Object.fromEntries(formData);

    const studentDetails = {
      locationId: data?.locationId,
      period: data?.period ?? "",
      grade: data.grade,
    };

    localStorage.setItem("studentDetails", JSON.stringify(studentDetails));
    redirect(`/student/form/${routeParams.formId}/${routeParams.teacherId}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      {teacherLocations.length > 0 && (
        <SchoolAndPeriodInput teacherLocations={teacherLocations} />
      )}
      <SelectInput
        name="grade"
        placeholder="select your grade"
        options={grades}
      />
      <SelectInput
        name="title"
        placeholder="select your form"
        options={formOptions}
        defaultValue={formTitle}
        disabled={true}
      />
      <SelectInput
        name="type"
        placeholder="select when you are taking this form"
        options={types}
        defaultValue={formType}
        disabled={true}
      />
      <SubmitButton text="next" className="w-full mt-4" />
    </form>
  );
};

export default StudentDetailsForm;

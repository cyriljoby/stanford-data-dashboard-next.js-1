"use client";

import SelectInput from "../form/SelectInput";
import { Form, UserLocation } from "@prisma/client";
import SchoolAndPeriodInput from "./SchoolAndPeriodInput";
import { SubmitButton } from "../form/Buttons";
import { redirect } from "next/navigation";
import { FORM_PAIRS } from "@/config/formMappings";

const StudentDetailsForm = ({
  teacherLocations,
  formTitle,
  formType,
  routeParams,
  allForms,
}: {
  teacherLocations: UserLocation[];
  formTitle: string;
  formType: Form["type"];
  routeParams: { formId: string; teacherId: string; name: string };
  allForms?: Form[];
}) => {
  // Strip version suffixes from form title for display
  let baseFormName = formTitle
    .replace(/\s*\(elem\)/i, "")
    .replace(/\s*\(elementary\)/i, "")
    .replace(/\s*\(middle school and above\)/i, "")
    .trim();

  // Check if this form has an explicit mapping - use the middle school name as display name
  const pairKey = Object.keys(FORM_PAIRS).find(key => {
    const pair = FORM_PAIRS[key];
    return formTitle === pair.elem || formTitle === pair.middleSchool;
  });

  if (pairKey) {
    // Use the middle school version's base name for display
    baseFormName = FORM_PAIRS[pairKey].middleSchool
      .replace(/\s*\(middle school and above\)/i, "")
      .trim();
  }

  // Show all grades K-12 + college
  // The form routing will happen automatically based on selected grade
  const grades: { text: string; value: string }[] = Array.from({ length: 12 }, (_, i) => ({
    text: (i + 1).toString(),
    value: (i + 1).toString(),
  }));
  grades.unshift({ text: "k", value: "k" });
  grades.push({ text: "college or above", value: "college or above" });

  // Display base form name without (elem) or (middle school and above) suffix
  const displayFormTitle = baseFormName;
  const formOptions = [{ text: displayFormTitle, value: displayFormTitle }];

  const types = [
    { text: "before lesson", value: "pre" },
    { text: "after lesson", value: "post" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = Object.fromEntries(formData);
    const selectedGrade = data.grade as string;

    const studentDetails = {
      locationId: data?.locationId,
      period: data?.period ?? "",
      grade: selectedGrade,
    };

    localStorage.setItem("studentDetails", JSON.stringify(studentDetails));

    // Determine if we should route to elem or non-elem version based on grade
    let targetFormId = routeParams.formId;

    if (allForms && allForms.length > 0) {
      // Check if grade is K-5 (elementary)
      const isElemGrade = selectedGrade === "k" || (parseInt(selectedGrade) >= 1 && parseInt(selectedGrade) <= 5);

      // First, check if this form has an explicit mapping (case-insensitive)
      const pairKey = Object.keys(FORM_PAIRS).find(key => {
        const pair = FORM_PAIRS[key];
        return formTitle.toLowerCase() === pair.elem.toLowerCase() ||
               formTitle.toLowerCase() === pair.middleSchool.toLowerCase();
      });

      if (pairKey) {
        // Use explicit mapping (case-insensitive)
        const targetTitle = isElemGrade ? FORM_PAIRS[pairKey].elem : FORM_PAIRS[pairKey].middleSchool;
        const mappedForm = allForms.find(f =>
          f.title.toLowerCase() === targetTitle.toLowerCase() && f.type === formType
        );
        if (mappedForm) targetFormId = mappedForm.id;
      } else {
        // Fall back to dynamic matching based on naming convention
        if (isElemGrade) {
          // Look for elementary version
          const elemForm = allForms.find(f => {
            const fBase = f.title.replace(/\s*\(elem\)/i, "").replace(/\s*\(elementary\)/i, "").trim();
            return (f.title.toLowerCase().includes("(elem)") || f.title.toLowerCase().includes("(elementary)")) &&
                   fBase.toLowerCase() === baseFormName.toLowerCase() &&
                   f.type === formType;
          });
          if (elemForm) targetFormId = elemForm.id;
        } else {
          // Look for non-elementary version (6-12+)
          const nonElemForm = allForms.find(f => {
            const fBase = f.title.replace(/\s*\(elem\)/i, "").replace(/\s*\(elementary\)/i, "").replace(/\s*\(middle school and above\)/i, "").trim();
            return !f.title.toLowerCase().includes("(elem)") &&
                   !f.title.toLowerCase().includes("(elementary)") &&
                   fBase.toLowerCase() === baseFormName.toLowerCase() &&
                   f.type === formType;
          });
          if (nonElemForm) targetFormId = nonElemForm.id;
        }
      }
    }

    redirect(`/student/form/${targetFormId}/${routeParams.teacherId}`);
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
        defaultValue=""
      />
      <SelectInput
        name="title"
        placeholder="select your form"
        options={formOptions}
        defaultValue={displayFormTitle}
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

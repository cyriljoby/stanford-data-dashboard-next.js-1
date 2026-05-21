"use client";

import React, { useEffect, useState } from "react";
import FormContainer from "../form/FormContainer";
import { SubmitButton } from "../form/Buttons";
import { Form } from "@prisma/client";
import Question from "./Question";
import MatrixQuestion from "./MatrixQuestion";
import { Input } from "../ui/input";
import {
  createResponseWithoutTeacher,
  createResponseWithTeacher,
} from "@/utils/actions";

type QuestionItem = Form["questions"][0];

type QuestionGroup =
  | { type: "single"; question: QuestionItem }
  | { type: "matrix"; group: string; questions: QuestionItem[] };

function groupQuestions(questions: Form["questions"]): QuestionGroup[] {
  const matrixMap = new Map<string, QuestionItem[]>();
  for (const q of questions) {
    if (q.matrixGroup) {
      if (!matrixMap.has(q.matrixGroup)) matrixMap.set(q.matrixGroup, []);
      matrixMap.get(q.matrixGroup)!.push(q);
    }
  }

  const result: QuestionGroup[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    if (!q.matrixGroup) {
      result.push({ type: "single", question: q });
    } else if (!seen.has(q.matrixGroup)) {
      seen.add(q.matrixGroup);
      result.push({ type: "matrix", group: q.matrixGroup, questions: matrixMap.get(q.matrixGroup)! });
    }
  }
  return result;
}

const StudentForm = ({
  questions,
  formId,
  teacherId,
}: {
  questions: Form["questions"];
  formId: string;
  teacherId: string;
}) => {
  const joinedWithTeacherCode = teacherId !== "0";
  const [studentLocation, setStudentLocation] = useState("");
  const [studentDetails, setStudentDetails] = useState("");

  useEffect(() => {
    setStudentLocation(localStorage.getItem("studentLocation") ?? "");
    setStudentDetails(localStorage.getItem("studentDetails") ?? "");
  }, []);

  if (!studentDetails) return;

  return (
    <FormContainer
      action={
        joinedWithTeacherCode
          ? createResponseWithTeacher
          : createResponseWithoutTeacher
      }
    >
      <Input name="formId" type="hidden" value={formId} />
      <Input name="teacherId" type="hidden" value={teacherId} />
      <Input name="location" type="hidden" value={studentLocation} />
      <Input name="details" type="hidden" value={studentDetails} />
      {groupQuestions(questions).map((item, i) => {
        if (item.type === "matrix") {
          return <MatrixQuestion key={item.group} questions={item.questions} />;
        }
        return <Question key={i} question={item.question} />;
      })}
      <SubmitButton text="submit" className="w-full mt-3" />
    </FormContainer>
  );
};

export default StudentForm;

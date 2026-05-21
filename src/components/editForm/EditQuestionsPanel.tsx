"use client";

import { type Question } from "@prisma/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QuestionCard from "@/components/studentForm/Question";

const EditQuestionsPanel = ({
  initialQuestions,
}: {
  initialQuestions: Question[];
}) => {
  const [questions, setQuestions] = useState(initialQuestions);

  const updateMatrixGroup = (id: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, matrixGroup: value || null } : q
      )
    );
  };

  return (
    <>
      <Input
        type="hidden"
        name="questions"
        value={JSON.stringify(questions)}
        readOnly
      />
      {questions.map((question) => (
        <QuestionCard key={question.id} question={question} disabled>
          <div className="border-t pt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Matrix Group</Label>
            <Input
              placeholder="Optional — same value groups questions into a matrix"
              value={question.matrixGroup ?? ""}
              onChange={(e) => updateMatrixGroup(question.id, e.target.value)}
            />
          </div>
        </QuestionCard>
      ))}
    </>
  );
};

export default EditQuestionsPanel;

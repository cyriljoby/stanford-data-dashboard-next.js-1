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

  const updateQuestionText = (id: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, question: value } : q))
    );
  };

  const updateOptionText = (questionId: string, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const newOptions = q.options.map((opt, i) =>
          i === optionIndex ? { ...opt, text: value } : opt
        );
        return { ...q, options: newOptions };
      })
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
          <div className="border-t pt-3 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Question Text</Label>
              <Input
                value={question.question}
                onChange={(e) => updateQuestionText(question.id, e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Option Text (codes are locked)</Label>
              <div className="space-y-1.5">
                {question.options.map((opt, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <Input
                      value={opt.text}
                      onChange={(e) => updateOptionText(question.id, i, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      code: {opt.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Matrix Group</Label>
              <Input
                placeholder="Optional — same value groups questions into a matrix"
                value={question.matrixGroup ?? ""}
                onChange={(e) => updateMatrixGroup(question.id, e.target.value)}
              />
            </div>
          </div>
        </QuestionCard>
      ))}
    </>
  );
};

export default EditQuestionsPanel;

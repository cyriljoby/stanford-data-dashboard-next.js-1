"use client";

import { type Question } from "@prisma/client";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { IoIosAddCircleOutline } from "react-icons/io";
import { CgTrash } from "react-icons/cg";
import { Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import QuestionCard from "@/components/studentForm/Question";
import QuestionInput from "@/components/addForm/QuestionInput";
import { question } from "@/utils/types";

// Client-side ids are for React keys and local editing only — updateForm mints
// the real question id server-side so a stale or duplicated id can never
// collide with an existing question.
const createQuestion = (): question => ({
  id: uuidv4(),
  question: "",
  showInTeacherExport: true,
  options: [
    { id: uuidv4(), text: "", code: 1 },
    { id: uuidv4(), text: "", code: 2 },
  ],
  name: "",
  matrixGroup: "",
});

const EditQuestionsPanel = ({
  initialQuestions,
  counterpartType,
  answeredQuestionIds,
}: {
  initialQuestions: Question[];
  counterpartType: "pre" | "post" | null;
  answeredQuestionIds: string[];
}) => {
  const answered = new Set(answeredQuestionIds);
  const [questions, setQuestions] = useState(initialQuestions);
  const [newQuestions, setNewQuestions] = useState<question[]>([]);
  const [mirror, setMirror] = useState(true);

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

  // Deletion is offered only on questions with no stored answers, so nothing
  // that already holds data can be orphaned.
  const deleteQuestion = (questionId: string) => {
    if (questions.length + newQuestions.length <= 1) {
      toast.error("A form must have at least 1 question");
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const addOptionToExisting = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                {
                  text: "",
                  code:
                    Math.max(0, ...q.options.map((o) => o.code)) + 1,
                  hidden: false,
                },
              ],
            }
          : q
      )
    );
  };

  const deleteOptionFromExisting = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const visibleLeft = q.options.filter(
          (o, i) => i !== optionIndex && !o.hidden
        ).length;
        if (visibleLeft < 2) {
          toast.error("Each question needs at least 2 visible options");
          return q;
        }
        return {
          ...q,
          options: q.options.filter((_, i) => i !== optionIndex),
        };
      })
    );
  };

  // Matrix rows render one shared set of columns, so hiding applies to the same
  // code on every row in the group.
  const toggleOptionHidden = (questionId: string, code: number) => {
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;

    const inScope = (q: Question) =>
      q.id === target.id ||
      (!!target.matrixGroup && q.matrixGroup === target.matrixGroup);
    const hide = !target.options.find((o) => o.code === code)?.hidden;

    const wouldLeaveTooFew = questions
      .filter(inScope)
      .some(
        (q) => q.options.filter((o) => !o.hidden && o.code !== code).length < 2
      );
    if (hide && wouldLeaveTooFew) {
      toast.error("Each question needs at least 2 visible options");
      return;
    }

    setQuestions((prev) =>
      prev.map((q) =>
        inScope(q)
          ? {
              ...q,
              options: q.options.map((o) =>
                o.code === code ? { ...o, hidden: hide } : o
              ),
            }
          : q
      )
    );
  };

  const updateOptionCode = (
    questionId: string,
    optionIndex: number,
    value: number
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const newOptions = q.options.map((opt, i) =>
          i === optionIndex ? { ...opt, code: value } : opt
        );
        return { ...q, options: newOptions };
      })
    );
  };

  const addNewQuestion = () =>
    setNewQuestions((prev) => [...prev, createQuestion()]);

  const updateNewQuestion = (
    id: string,
    text: string,
    showInTeacherExport: boolean,
    name: string,
    matrixGroup?: string
  ) =>
    setNewQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              question: text,
              showInTeacherExport,
              name,
              matrixGroup: matrixGroup ?? q.matrixGroup,
            }
          : q
      )
    );

  const deleteNewQuestion = (id: string) =>
    setNewQuestions((prev) => prev.filter((q) => q.id !== id));

  const addNewOption = (questionId: string) =>
    setNewQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: uuidv4(), text: "", code: q.options.length + 1 },
              ],
            }
          : q
      )
    );

  const updateNewOption = (
    questionId: string,
    optionId: string,
    text: string,
    code: number
  ) =>
    setNewQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, text, code } : o
              ),
            }
          : q
      )
    );

  const deleteNewOption = (questionId: string, optionId: string) =>
    setNewQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId && q.options.length > 2
          ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
          : q
      )
    );

  return (
    <>
      <Input
        type="hidden"
        name="questions"
        value={JSON.stringify(questions)}
        readOnly
      />
      <Input
        type="hidden"
        name="newQuestions"
        value={JSON.stringify(newQuestions)}
        readOnly
      />
      <Input
        type="hidden"
        name="mirrorNewQuestions"
        value={mirror ? "true" : "false"}
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
              <Label className="text-xs text-muted-foreground">
                {answered.has(question.id)
                  ? "Options (codes are locked — this question already has responses, but you can hide options from new respondents)"
                  : "Options (no responses yet, so codes can still be changed)"}
              </Label>
              <div className="space-y-1.5">
                {question.options.map((opt, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 items-center"
                  >
                    <Input
                      value={opt.text}
                      className={opt.hidden ? "opacity-50" : undefined}
                      onChange={(e) => updateOptionText(question.id, i, e.target.value)}
                    />
                    {answered.has(question.id) ? (
                      <>
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          code: {opt.code}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={
                            opt.hidden
                              ? "Show option to respondents"
                              : "Hide option from respondents"
                          }
                          title={
                            opt.hidden
                              ? "Hidden from respondents. Click to show."
                              : "Hide from respondents. Existing responses are kept."
                          }
                          className="w-8"
                          onClick={() => toggleOptionHidden(question.id, opt.code)}
                        >
                          {opt.hidden ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          type="number"
                          aria-label="Option code"
                          className="w-20"
                          value={opt.code}
                          onChange={(e) =>
                            updateOptionCode(question.id, i, Number(e.target.value))
                          }
                        />
                        <div className="flex items-center">
                        {/* Reachable via matrix sync, so it must be reversible here too. */}
                        {opt.hidden && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Show option to respondents"
                            title="Hidden from respondents. Click to show."
                            className="w-8"
                            onClick={() => toggleOptionHidden(question.id, opt.code)}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete option"
                          className="w-8"
                          onClick={() => deleteOptionFromExisting(question.id, i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {!answered.has(question.id) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => addOptionToExisting(question.id)}
                >
                  <IoIosAddCircleOutline /> Add option
                </Button>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Matrix Group</Label>
              <Input
                placeholder="Optional — same value groups questions into a matrix"
                value={question.matrixGroup ?? ""}
                onChange={(e) => updateMatrixGroup(question.id, e.target.value)}
              />
            </div>

            {!answered.has(question.id) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => deleteQuestion(question.id)}
              >
                <CgTrash /> Delete question
              </Button>
            )}
          </div>
        </QuestionCard>
      ))}

      {newQuestions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium">New questions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Responses already collected will be blank for these questions, since
            they were not asked at the time.
          </p>
          {newQuestions.map((q) => (
            <QuestionInput
              key={q.id}
              question={q}
              updateQuestion={updateNewQuestion}
              deleteQuestion={deleteNewQuestion}
              addOption={addNewOption}
              updateOption={updateNewOption}
              deleteOption={deleteNewOption}
            />
          ))}
          {counterpartType && (
            <label className="mt-4 flex items-center gap-2 text-sm">
              <Checkbox
                checked={mirror}
                onCheckedChange={(checked) => setMirror(checked === true)}
              />
              Also add these to the matching {counterpartType}-survey
            </label>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full"
        onClick={addNewQuestion}
      >
        <IoIosAddCircleOutline /> Add question
      </Button>
    </>
  );
};

export default EditQuestionsPanel;

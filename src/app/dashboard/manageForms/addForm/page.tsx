"use client";
import FormContainer from "@/components/form/FormContainer";
import { addForm } from "@/utils/actions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import QuestionInput from "@/components/addForm/QuestionInput";
import { SubmitButton } from "@/components/form/Buttons";
import { IoIosAddCircleOutline } from "react-icons/io";
import TitleInput from "@/components/addForm/TitleInput";
import { question } from "@/utils/types";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import FormDetailsInput from "@/components/addForm/FormDetailsInput";
import { toast } from "sonner";

const createQuestion = () => {
  return {
    id: uuidv4(),
    question: "",
    showInTeacherExport: true,
    options: [
      { id: uuidv4(), text: "", code: 0 },
      { id: uuidv4(), text: "", code: 0 },
    ],
    name: "",
    matrixGroup: "",
  };
};

const AddFormPage = () => {
  const [questions, setQuestions] = useState<question[]>([createQuestion()]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createQuestion()]);
  };

  const updateQuestion = (
    questionId: string,
    text: string,
    showInTeacherExport: boolean,
    name: string,
    matrixGroup?: string
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, question: text, showInTeacherExport, name, matrixGroup: matrixGroup ?? question.matrixGroup }
          : question
      )
    );
  };

  const deleteQuestion = (questionId: string) => {
    if (questions.length <= 1) {
      toast.error("Each form must have at least 1 question");
      return;
    }

    setQuestions((prev) =>
      prev.filter((question) => question.id !== questionId)
    );
  };

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [
                ...question.options,
                { id: uuidv4(), text: "", code: 0 },
              ],
            }
          : question
      )
    );
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    text: string,
    code: number
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, text, code } : option
              ),
            }
          : question
      )
    );
  };

  const deleteOption = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        if (question.options.length <= 1) {
          toast.error("Each question must have at least 1 option");
          return question;
        }

        return {
          ...question,
          options: question.options.filter((option) => option.id !== optionId),
        };
      })
    );
  };

  return (
    <FormContainer action={addForm}>
      <TitleInput />
      <FormDetailsInput />
      <Input type="hidden" name="questions" value={JSON.stringify(questions)} />
      {questions.map((question) => {
        return (
          <QuestionInput
            key={question.id}
            question={question}
            updateQuestion={updateQuestion}
            deleteQuestion={deleteQuestion}
            addOption={addOption}
            updateOption={updateOption}
            deleteOption={deleteOption}
          />
        );
      })}

      <div className="mt-4 space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full flex gap-x-0.5"
          onClick={() => addQuestion()}
        >
          <IoIosAddCircleOutline />
          Add Question
        </Button>
        <SubmitButton text="add form" className="w-full" />
      </div>
    </FormContainer>
  );
};

export default AddFormPage;

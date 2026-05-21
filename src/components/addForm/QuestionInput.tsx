"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoPlus } from "react-icons/go";
import OptionInput from "./OptionInput";
import { RadioGroup } from "../ui/radio-group";
import { Separator } from "../ui/separator";
import { question } from "@/utils/types";
import { Input } from "../ui/input";
import {
  updateQuestionFn,
  handleQuestionByIdFn,
  updateOptionFn,
  deleteOptionFn,
} from "@/utils/types";
import QuestionInputFooter from "./QuestionInputFooter";

const QuestionInput = ({
  question,
  updateQuestion,
  deleteQuestion,
  addOption,
  updateOption,
  deleteOption,
}: {
  question: question;
  updateQuestion: updateQuestionFn;
  deleteQuestion: handleQuestionByIdFn;
  addOption: handleQuestionByIdFn;
  updateOption: updateOptionFn;
  deleteOption: deleteOptionFn;
}) => {
  return (
    <Card className="relative mt-4 pb-3">
      <CardContent className="space-y-4">
        <Input
          placeholder="Short identifier (e.g., q_environment_1)"
          type="text"
          value={question.name??""}
          onChange={(e) =>
            updateQuestion(
              question.id,
              question.question,
              question.showInTeacherExport,
              e.target.value,
              question.matrixGroup
            )
          }
          required
        />

        <Input
          placeholder="Enter your question"
          type="text"
          value={question.question??""}
          onChange={(e) =>
            updateQuestion(
              question.id,
              e.target.value,
              question.showInTeacherExport,
              question.name ?? "",
              question.matrixGroup
            )
          }
          required
        />

        <Input
          placeholder="Matrix group (optional — same value groups questions into a matrix)"
          type="text"
          value={question.matrixGroup ?? ""}
          onChange={(e) =>
            updateQuestion(
              question.id,
              question.question,
              question.showInTeacherExport,
              question.name ?? "",
              e.target.value
            )
          }
        />
        <div className="flex items-center gap-x-1">
          <h4 className="text-sm font-medium">Options</h4>
          <Button
            className="h-5 w-5"
            type="button"
            onClick={() => addOption(question.id)}
          >
            <GoPlus />
          </Button>
        </div>
        <RadioGroup disabled>
          {question.options.map((option, index) => {
            return (
              <OptionInput
                key={option.id}
                optionNumber={index + 1}
                option={option}
                questionId={question.id}
                updateOption={updateOption}
                deleteOption={deleteOption}
              />
            );
          })}
        </RadioGroup>
        <Separator className="mb-1" />
        <QuestionInputFooter
          updateQuestion={updateQuestion}
          deleteQuestion={deleteQuestion}
          question={question}
        />
      </CardContent>
    </Card>
  );
};

export default QuestionInput;

import { CgTrash } from "react-icons/cg";
import { Switch } from "@/components/ui/switch";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  handleQuestionByIdFn,
  question,
  updateQuestionFn,
} from "@/utils/types";

const QuestionInputFooter = ({
  updateQuestion,
  deleteQuestion,
  question,
}: {
  updateQuestion: updateQuestionFn;
  deleteQuestion: handleQuestionByIdFn;
  question: question;
}) => {
  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex space-x-2">
        <Switch
          id="showInTeacherExport"
          checked={question.showInTeacherExport}
          onCheckedChange={(value) =>
            updateQuestion(question.id, question.question, value, question.name, question.matrixGroup)
          }
        />
        <Label htmlFor="showInTeacherExport">Show in teacher export</Label>
      </div>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => deleteQuestion(question.id)}
      >
        <CgTrash className="size-5" />
      </Button>
    </div>
  );
};

export default QuestionInputFooter;

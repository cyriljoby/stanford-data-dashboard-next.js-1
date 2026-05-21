import { type Question } from "@prisma/client";
import React from "react";
import { Card, CardContent } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { v4 as uuidv4 } from "uuid";

const Question = ({
  question,
  disabled = false,
  children,
}: {
  question: Question;
  disabled?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <Card className="mt-4">
      <CardContent className="space-y-4">
        <h3 className="text-lg">{question.question}</h3>
        <RadioGroup disabled={disabled} name={question.id}>
          {question.options.map((option, i) => {
            const id = uuidv4();

            return (
              <div key={i} className="flex items-center gap-3">
                <RadioGroupItem
                  value={option.code.toString()}
                  id={id}
                  className="h-5 w-5 border-2 border-gray-400"
                />
                <Label htmlFor={id} className="text-md">
                  {option.text} {disabled && `, Code: ${option.code}`}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        {children}
      </CardContent>
    </Card>
  );
};

export default Question;

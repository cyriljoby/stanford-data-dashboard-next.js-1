"use client";

import { type Question } from "@prisma/client";
import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { v4 as uuidv4 } from "uuid";

const SEPARATOR = "... ";

const MatrixQuestion = ({
  questions,
  disabled = false,
}: {
  questions: Question[];
  disabled?: boolean;
}) => {
  const firstQ = questions[0];
  const sepIdx = firstQ.question.indexOf(SEPARATOR);
  const stem =
    sepIdx >= 0 ? firstQ.question.substring(0, sepIdx) : firstQ.question;
  const options = firstQ.options;
  const isBinary = options.length === 2;

  // For binary questions: hidden input tracks 0/1 per row (default = not-selected code)
  const notSelectedCode = isBinary ? options[0].code.toString() : "";
  const selectedCode = isBinary ? options[1].code.toString() : "";
  const [selections, setSelections] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, notSelectedCode]))
  );

  const rowLabel = (q: Question) =>
    sepIdx >= 0 ? q.question.substring(sepIdx + SEPARATOR.length) : q.question;

  const rowBg = (idx: number) =>
    idx % 2 === 0 ? "bg-muted/40 rounded" : "";

  // ── Binary layout: single radio per row ─────────────────────────────────
  if (isBinary) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-4">
          <h3 className="text-lg mb-4">{stem}</h3>
          <div className="space-y-0.5">
            {questions.map((q, i) => {
              const isSelected = selections[q.id] === selectedCode;
              const radioId = q.id + "-radio";
              return (
                <div
                  key={q.id}
                  className={`flex items-center justify-between px-3 py-2.5 ${rowBg(i)}`}
                >
                  {/*
                    React keeps this hidden input's DOM value in sync with state.
                    FormData always gets the correct code (0 or 1) for every row.
                    RadioGroup has no `name` so its internal BubbleInput (type="radio")
                    has no name attribute and is never included in FormData.
                  */}
                  <input type="hidden" name={q.id} value={selections[q.id]} />
                  <label
                    htmlFor={radioId}
                    className="text-sm leading-snug cursor-pointer select-none flex-1 pr-4"
                  >
                    {rowLabel(q)}
                  </label>
                  <RadioGroup
                    value={isSelected ? selectedCode : ""}
                    onValueChange={() =>
                      setSelections((prev) => ({ ...prev, [q.id]: selectedCode }))
                    }
                    disabled={disabled}
                  >
                    <RadioGroupItem
                      id={radioId}
                      value={selectedCode}
                      onClick={() => {
                        if (isSelected)
                          setSelections((prev) => ({
                            ...prev,
                            [q.id]: notSelectedCode,
                          }));
                      }}
                      className="h-5 w-5 border-2 border-gray-400 shrink-0"
                    />
                  </RadioGroup>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Multi-option layout: radio columns ───────────────────────────────────
  const colTemplate = `1fr ${options.map(() => "100px").join(" ")}`;

  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <h3 className="text-lg mb-4">{stem}</h3>
        <div className="overflow-x-auto">
          <div
            className="grid text-sm font-semibold pb-2 border-b mb-1"
            style={{ gridTemplateColumns: colTemplate }}
          >
            <div />
            {options.map((opt) => (
              <div key={opt.code} className="text-center px-2">
                {opt.text}
              </div>
            ))}
          </div>

          {questions.map((q, i) => (
            <RadioGroup
              key={q.id}
              name={q.id}
              disabled={disabled}
              className={`grid items-center py-2 ${rowBg(i)}`}
              style={{ gridTemplateColumns: colTemplate }}
            >
              <span className="text-sm pr-4">{rowLabel(q)}</span>
              {options.map((opt) => {
                const id = uuidv4();
                return (
                  <div key={opt.code} className="flex justify-center">
                    <RadioGroupItem
                      value={opt.code.toString()}
                      id={id}
                      className="h-5 w-5 border-2 border-gray-400"
                    />
                  </div>
                );
              })}
            </RadioGroup>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatrixQuestion;

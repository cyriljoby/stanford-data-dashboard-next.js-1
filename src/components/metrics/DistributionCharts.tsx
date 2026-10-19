"use client";

import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import type {
  ComparisonResult,
  DistributionResult,
} from "@/utils/actions/distributionActions";

const MATRIX_SEPARATOR = "... ";

// Pre / post series. Light and dark steps are validated separately against their
// own surface: blue↔red separation holds under protanopia and deuteranopia, and
// the legend dots above mean identity never rests on colour alone.
const SERIES_COLORS = [
  "bg-[#2a78d6] dark:bg-[#3987e5]",
  "bg-[#d32f2f] dark:bg-[#e5484d]",
];

type SeriesMeta = {
  key: "pre" | "post";
  label: string;
  total: number;
  colorClass: string;
};

type ChartOption = {
  code: number;
  text: string;
  cells: Array<{ count: number; pct: number } | null>;
};

type ChartQuestion = {
  id: string;
  question: string;
  matrixGroup: string | null;
  answered: Array<number | null>;
  options: ChartOption[];
};

type NormalizedData = {
  series: SeriesMeta[];
  questions: ChartQuestion[];
  notices: string[];
};

const normalize = (
  data: DistributionResult | ComparisonResult
): NormalizedData => {
  if (data.mode === "single") {
    return {
      series: [
        {
          key: data.type,
          label: data.type === "pre" ? "Pre-survey" : "Post-survey",
          total: data.total,
          colorClass: SERIES_COLORS[0],
        },
      ],
      questions: data.questions.map((q) => ({
        id: q.id,
        question: q.question,
        matrixGroup: q.matrixGroup,
        answered: [q.answered],
        options: q.options.map((o) => ({
          code: o.code,
          text: o.text,
          cells: [{ count: o.count, pct: o.pct }],
        })),
      })),
      notices: [],
    };
  }

  const notices: string[] = [];
  const sides: Array<{ key: "pre" | "post"; label: string }> = [];

  for (const key of ["pre", "post"] as const) {
    const side = data[key];
    const label = key === "pre" ? "Pre-survey" : "Post-survey";
    if (!side.exists) {
      notices.push(`This form version has no ${label.toLowerCase()}.`);
    } else if (side.empty) {
      notices.push(`No ${label.toLowerCase()} responses match the filters.`);
    } else {
      sides.push({ key, label });
    }
  }

  const series: SeriesMeta[] = sides.map((s, i) => ({
    key: s.key,
    label: s.label,
    total: data[s.key].total,
    colorClass: SERIES_COLORS[sides.length === 1 ? 0 : i],
  }));

  const questions: ChartQuestion[] = data.questions
    .map((q) => ({
      id: q.id,
      question: q.question,
      matrixGroup: q.matrixGroup,
      answered: series.map((s) =>
        s.key === "pre" ? q.preAnswered : q.postAnswered
      ),
      options: q.options.map((o) => ({
        code: o.code,
        text: o.text,
        cells: series.map((s) => {
          const isPre = s.key === "pre";
          const answered = isPre ? q.preAnswered : q.postAnswered;
          if (answered === null) return null;
          return isPre
            ? { count: o.preCount, pct: o.prePct }
            : { count: o.postCount, pct: o.postPct };
        }),
      })),
    }))
    .filter((q) => q.answered.some((a) => a !== null));

  return { series, questions, notices };
};

type QuestionGroup = {
  key: string;
  title: string;
  questions: ChartQuestion[];
  isMatrix: boolean;
};

const groupQuestions = (questions: ChartQuestion[]): QuestionGroup[] => {
  const groups: QuestionGroup[] = [];
  const matrixIndex = new Map<string, QuestionGroup>();

  for (const q of questions) {
    if (q.matrixGroup) {
      let group = matrixIndex.get(q.matrixGroup);
      if (!group) {
        const sepIdx = q.question.indexOf(MATRIX_SEPARATOR);
        group = {
          key: `matrix-${q.matrixGroup}`,
          title: sepIdx >= 0 ? q.question.substring(0, sepIdx) : q.question,
          questions: [],
          isMatrix: true,
        };
        matrixIndex.set(q.matrixGroup, group);
        groups.push(group);
      }
      group.questions.push(q);
    } else {
      groups.push({
        key: q.id,
        title: q.question,
        questions: [q],
        isMatrix: false,
      });
    }
  }

  return groups;
};

const subLabel = (q: ChartQuestion) => {
  const sepIdx = q.question.indexOf(MATRIX_SEPARATOR);
  return sepIdx >= 0
    ? q.question.substring(sepIdx + MATRIX_SEPARATOR.length)
    : q.question;
};

const answeredSummary = (q: ChartQuestion, series: SeriesMeta[]) =>
  series
    .map((s, i) =>
      q.answered[i] === null
        ? null
        : series.length > 1
          ? `${s.label.replace("-survey", "")}: ${q.answered[i]!.toLocaleString()}`
          : `${q.answered[i]!.toLocaleString()} answered`
    )
    .filter(Boolean)
    .join(" · ");

const OptionBars = ({
  question,
  series,
}: {
  question: ChartQuestion;
  series: SeriesMeta[];
}) => {
  return (
    <div className="space-y-2">
      {question.options.map((o) => (
        <div
          key={o.code}
          className="flex items-center gap-3 rounded px-1 py-0.5 hover:bg-muted/50"
          title={series
            .map((s, i) =>
              o.cells[i]
                ? `${s.label} — ${o.text}: ${o.cells[i]!.count.toLocaleString()} (${o.cells[i]!.pct}%)`
                : null
            )
            .filter(Boolean)
            .join("\n")}
        >
          <div className="w-[38%] shrink-0 truncate text-sm text-muted-foreground">
            {o.text}
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            {series.map((s, i) =>
              o.cells[i] === null ? null : (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={`relative flex-1 rounded-r-[4px] bg-muted/40 ${series.length > 1 ? "h-3" : "h-4"}`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 rounded-r-[4px] ${s.colorClass}`}
                      style={{ width: `${Math.min(o.cells[i]!.pct, 100)}%` }}
                    />
                  </div>
                  <div className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {o.cells[i]!.pct}% ({o.cells[i]!.count.toLocaleString()})
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const QuestionCard = ({
  group,
  series,
  onSelect,
}: {
  group: QuestionGroup;
  series: SeriesMeta[];
  // When set the card is clickable and isolates this question. Omitted once a
  // question is already isolated, so the card stops being a control.
  onSelect?: () => void;
}) => {
  const interactive = onSelect
    ? {
        role: "button",
        tabIndex: 0,
        onClick: onSelect,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        },
        "aria-label": `View "${group.title}" on its own`,
        className:
          "rounded-lg border p-4 cursor-pointer transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      }
    : { className: "rounded-lg border p-4" };

  return (
    <div {...interactive}>
      <p className="mb-1 text-sm font-medium">{group.title}</p>
      {!group.isMatrix && (
        <p className="mb-3 text-xs text-muted-foreground">
          {answeredSummary(group.questions[0], series)}
        </p>
      )}
      {group.isMatrix ? (
        <div className="space-y-4">
          {group.questions.map((q) => (
            <div key={q.id}>
              <p className="mb-1.5 text-sm text-foreground/80">
                {subLabel(q)}{" "}
                <span className="text-xs text-muted-foreground">
                  ({answeredSummary(q, series)})
                </span>
              </p>
              <OptionBars question={q} series={series} />
            </div>
          ))}
        </div>
      ) : (
        <OptionBars question={group.questions[0]} series={series} />
      )}
    </div>
  );
};

const DistributionCharts = ({
  data,
}: {
  data: DistributionResult | ComparisonResult;
}) => {
  const [selectedGroup, setSelectedGroup] = useState("All");

  const normalized = useMemo(() => normalize(data), [data]);
  const groups = useMemo(
    () => groupQuestions(normalized.questions),
    [normalized]
  );

  if (data.mode === "single" && data.empty) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No responses match this selection. Try broadening the filters.
      </p>
    );
  }

  if (normalized.series.length === 0) {
    return (
      <div className="mt-4 space-y-1">
        {normalized.notices.map((n) => (
          <p key={n} className="text-sm text-muted-foreground">
            {n}
          </p>
        ))}
        <p className="text-sm text-muted-foreground">
          Nothing to chart for this selection. Try broadening the filters.
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        This form has no questions available to chart.
      </p>
    );
  }

  const visibleGroups =
    selectedGroup === "All"
      ? groups
      : groups.filter((g) => g.key === selectedGroup);

  const isCompare = normalized.series.length > 1;

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold">
            {data.formTitle}
            {data.mode === "single" ? ` (${data.type}-survey)` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {normalized.series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span
                  className={`inline-block size-2.5 rounded-full ${s.colorClass}`}
                />
                {s.label} · {s.total.toLocaleString()} responses
              </span>
            ))}
          </div>
          {isCompare && (
            <p className="mt-1 text-xs text-muted-foreground">
              Compares all pre-survey vs all post-survey responses matching the
              filters.
            </p>
          )}
          {normalized.notices.map((n) => (
            <p key={n} className="mt-1 text-xs text-muted-foreground">
              {n}
            </p>
          ))}
        </div>
        {selectedGroup === "All" ? (
          groups.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Select a question to view it on its own
            </p>
          )
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedGroup("All")}
          >
            ← All questions
          </Button>
        )}
      </div>
      <div
        className={
          visibleGroups.length > 1 ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"
        }
      >
        {visibleGroups.map((group) => (
          <QuestionCard
            key={group.key}
            group={group}
            series={normalized.series}
            onSelect={
              selectedGroup === "All"
                ? () => setSelectedGroup(group.key)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

export default DistributionCharts;

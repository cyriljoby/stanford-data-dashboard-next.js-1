"use client";

import type { ChartDataResponse } from "@/utils/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type PrePostChartProps = {
  data: ChartDataResponse;
  formName: string;
};

type TooltipPayloadEntry = {
  name: string;
  value: number;
  color: string;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-md p-3 shadow-md text-sm max-w-[200px]">
      <p className="font-medium mb-1 break-words">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

export default function PrePostChart({ data, formName }: PrePostChartProps) {
  const hasPre = data.preCount > 0;
  const hasPost = data.postCount > 0;

  const chartPoints = data.questions.map((name) => ({
    name,
    pre:
      data.preAverages[name] != null
        ? +data.preAverages[name].toFixed(2)
        : undefined,
    post:
      data.postAverages[name] != null
        ? +data.postAverages[name].toFixed(2)
        : undefined,
  }));

  const hasAnyData = chartPoints.some(
    (p) => p.pre !== undefined || p.post !== undefined
  );

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-semibold">{formName} — Pre / Post Comparison</h3>
        <span className="text-sm text-muted-foreground">
          Pre: {data.preCount} responses · Post: {data.postCount} responses
        </span>
      </div>

      {!hasAnyData ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground border rounded-md">
          No response data found for the selected filters.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={chartPoints}
            margin={{ top: 10, right: 30, left: 10, bottom: 90 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 12 }}
              height={100}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(v) => v.toFixed(1)}
              label={{
                value: "Avg Score",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 12 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" />
            {hasPre && (
              <Line
                type="monotone"
                dataKey="pre"
                name="Pre Survey"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            )}
            {hasPost && (
              <Line
                type="monotone"
                dataKey="post"
                name="Post Survey"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

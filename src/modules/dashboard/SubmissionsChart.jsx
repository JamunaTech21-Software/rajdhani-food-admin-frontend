import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatChartDay, formatDate } from "../../lib/format.js";

// SVG presentation attributes accept var(), so the chart follows primary_color
// at runtime like everything else — no reading computed styles in render.
//
// Each series carries a non-colour cue as well (dash pattern), so the three stay
// separable for a viewer who cannot distinguish green from gold.
const SERIES = [
  { key: "enquiries", label: "Enquiries", colour: "var(--color-brand)", dash: undefined },
  { key: "applications", label: "Applications", colour: "var(--color-gold)", dash: "6 3" },
  { key: "messages", label: "Messages", colour: "var(--color-info)", dash: "2 3" },
];

const AXIS = { fontSize: 12, fill: "var(--color-ink-muted)" };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-card">
      <p className="text-xs font-medium text-ink">{formatDate(label)}</p>
      <ul className="mt-1.5 space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2 text-xs text-ink-muted">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: entry.stroke }}
            />
            <span className="flex-1">{entry.name}</span>
            <span className="font-medium tabular-nums text-ink">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SubmissionsChart({ data = [] }) {
  const isAllZero = data.every((d) => !d.enquiries && !d.applications && !d.messages);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDay}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: "var(--color-line)" }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-line-strong)" }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "var(--color-ink-muted)" }}
          />
          {SERIES.map(({ key, label, colour, dash }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={colour}
              strokeWidth={2}
              strokeDasharray={dash}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {isAllZero ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-muted">
          No submissions in the last 30 days yet.
        </p>
      ) : null}
    </div>
  );
}

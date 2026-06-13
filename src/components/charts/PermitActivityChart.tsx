import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HouseEvolutionEvent } from "../../lib/parcelTypes";
import "./charts.css";

type Props = {
  events: HouseEvolutionEvent[];
  title?: string;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      <strong className="chart-tooltip-value">{payload[0].value} permit{payload[0].value !== 1 ? "s" : ""}</strong>
    </div>
  );
}

export function PermitActivityChart({ events, title = "Permit Activity" }: Props) {
  const permitEvents = events.filter((e) => e.event_type === "permit" && e.year);

  if (!permitEvents.length) {
    return (
      <div className="chart-empty">
        <p>No permit history in current data</p>
      </div>
    );
  }

  const byYear = new Map<number, number>();
  for (const ev of permitEvents) {
    if (!ev.year) continue;
    byYear.set(ev.year, (byYear.get(ev.year) ?? 0) + 1);
  }

  const data = Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year, count }));

  return (
    <div className="chart-wrap">
      {title && <h4 className="chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={24}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="rgba(251,191,36,0.60)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

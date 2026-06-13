import {
  LineChart,
  Line,
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

function formatK(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      <strong className="chart-tooltip-value">{formatK(payload[0].value)}</strong>
    </div>
  );
}

export function SalesPriceChart({ events, title = "Sale Price History" }: Props) {
  const saleEvents = events
    .filter((e) => e.event_type === "sale" && e.year && e.price && e.price > 0)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  if (saleEvents.length < 2) {
    return (
      <div className="chart-empty">
        <p>Insufficient sale history for chart</p>
      </div>
    );
  }

  const data = saleEvents.map((e) => ({ year: e.year, price: e.price }));

  return (
    <div className="chart-wrap">
      {title && <h4 className="chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#34d399", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

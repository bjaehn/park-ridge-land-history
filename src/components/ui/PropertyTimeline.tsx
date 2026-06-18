import {
  YearBuiltIcon,
  SubdivisionIcon,
  PermitIcon,
  SaleIcon,
  EventDotIcon,
} from "@/lib/icons";
import type { LucideIcon } from "lucide-react";
import type { PropertySale, PropertyPermit } from "@/lib/data/properties";

export type TimelineEvent = {
  eventType: "built" | "plat" | "permit" | "permit_aggregate" | "sale" | "sale_aggregate";
  year: number;
  title: string;
  detail?: string | null;
  sourceLabel: string;
};

const EVENT_ICONS: Record<TimelineEvent["eventType"], LucideIcon> = {
  built:             YearBuiltIcon,
  plat:              SubdivisionIcon,
  permit:            PermitIcon,
  permit_aggregate:  PermitIcon,
  sale:              SaleIcon,
  sale_aggregate:    SaleIcon,
};

const EVENT_COLORS: Record<TimelineEvent["eventType"], string> = {
  built:             "text-accent-purple",
  plat:              "text-text-secondary",
  permit:            "text-confidence-medium",
  permit_aggregate:  "text-confidence-medium",
  sale:              "text-confidence-high",
  sale_aggregate:    "text-confidence-high",
};

type Props = { events: TimelineEvent[] };

export function PropertyTimeline({ events }: Props) {
  if (!events.length) return null;

  const sorted = [...events].sort((a, b) => a.year - b.year);

  return (
    <ol className="relative ml-3.5 pl-6 border-l border-surface-border space-y-7">
      {sorted.map((event, i) => {
        const Icon = EVENT_ICONS[event.eventType] ?? EventDotIcon;
        const colorClass = EVENT_COLORS[event.eventType] ?? "text-text-muted";
        return (
          <li key={i} className="relative">
            <span className={`absolute -left-[1.9rem] flex items-center justify-center w-7 h-7 bg-surface-base border border-surface-border rounded-full ${colorClass}`}>
              <Icon size={13} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-mono text-text-muted mb-0.5">{event.year}</span>
              <p className="text-sm font-medium text-text-primary leading-snug">{event.title}</p>
              {event.detail && (
                <p className="text-xs text-text-secondary mt-0.5 leading-snug">{event.detail}</p>
              )}
              <p className="text-xs text-text-muted mt-1">{event.sourceLabel}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function buildTimelineEvents(
  props: Record<string, unknown>,
  subdivision?: { recorded_year?: number | null; name?: string; original_owner?: string | null } | null,
  sales?: PropertySale[],
  permits?: PropertyPermit[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Plat recorded
  if (subdivision?.recorded_year) {
    events.push({
      eventType: "plat",
      year: subdivision.recorded_year,
      title: `Lot created by plat: ${subdivision.name ?? "subdivision"}`,
      detail: subdivision.original_owner ? `Developer: ${subdivision.original_owner}` : null,
      sourceLabel: "Cook County Recorder of Deeds",
    });
  }

  // Home built
  const yearBuilt = props.year_built as number | null;
  if (yearBuilt) {
    events.push({
      eventType: "built",
      year: yearBuilt,
      title: "Home built",
      sourceLabel: "Cook County Assessor",
    });
  }

  if (permits && permits.length > 0) {
    // Individual permit events
    permits.forEach((p) => {
      const year = p.date_issued ? new Date(p.date_issued).getFullYear() : null;
      if (!year) return;
      const parts: string[] = [];
      if (p.local_permit_number) parts.push(`#${p.local_permit_number.trim()}`);
      if (p.status) parts.push(p.status);
      events.push({
        eventType: "permit",
        year,
        title: p.description ?? "Building permit",
        detail: parts.length ? parts.join(" · ") : null,
        sourceLabel: "City of Park Ridge",
      });
    });
  } else {
    // Fallback aggregate from parcel props
    const permitCount = props.permit_count as number | null;
    const latestPermitYear = props.latest_permit_year as number | null;
    if (permitCount && permitCount > 0 && latestPermitYear) {
      events.push({
        eventType: "permit_aggregate",
        year: latestPermitYear,
        title: `${permitCount} ${permitCount === 1 ? "permit" : "permits"} on record`,
        detail: `Most recent filed ${latestPermitYear}`,
        sourceLabel: "City of Park Ridge",
      });
    }
  }

  if (sales && sales.length > 0) {
    // Individual sale events
    sales.forEach((s) => {
      const year = s.sale_date
        ? new Date(s.sale_date).getFullYear()
        : s.sale_year ?? null;
      if (!year) return;
      const parts: string[] = [];
      if (s.sale_price != null) parts.push(`$${s.sale_price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
      if (s.deed_type) parts.push(s.deed_type);
      if (!s.is_market_sale) parts.push("non-market transfer");
      events.push({
        eventType: "sale",
        year,
        title: "Recorded sale",
        detail: parts.length ? parts.join(" · ") : null,
        sourceLabel: "Cook County Recorder of Deeds",
      });
    });
  } else {
    // Fallback aggregate from parcel props
    const latestSaleYear = props.latest_sale_year as number | null;
    const latestSalePrice = props.latest_sale_price as number | null;
    if (latestSaleYear) {
      const saleDetail = latestSalePrice
        ? `Recorded sale price: $${latestSalePrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : null;
      events.push({
        eventType: "sale_aggregate",
        year: latestSaleYear,
        title: "Most recent recorded sale",
        detail: saleDetail,
        sourceLabel: "Cook County Recorder of Deeds",
      });
    }
  }

  return events.sort((a, b) => a.year - b.year);
}

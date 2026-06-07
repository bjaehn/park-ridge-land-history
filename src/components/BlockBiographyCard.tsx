import { permitPressureCurrentYear } from "../lib/permitPressure";
import type { ParcelFeature } from "../lib/parcelTypes";

type BlockBiographyCardProps = {
  parcels: ParcelFeature[];
  isStreetBounded: boolean;
};

type BlockMetric = {
  label: string;
  value: string;
  detail: string;
};

export function BlockBiographyCard({ parcels, isStreetBounded }: BlockBiographyCardProps) {
  if (parcels.length === 0) return null;
  const metrics = blockMetrics(parcels);
  const personality = blockPersonality(parcels);

  return (
    <section className="block-biography-card" aria-label="Block biography">
      <div>
        <span>Block biography</span>
        <h3>{personality.title}</h3>
        <p>{personality.body}</p>
        <small>{isStreetBounded ? "Uses the real street-bounded block geography." : "Uses the parcel-fabric fallback until Census block data is synced."}</small>
      </div>
      <div className="block-biography-grid">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function blockMetrics(parcels: ParcelFeature[]): BlockMetric[] {
  const oldest = withKnownYear(parcels).sort((left, right) => Number(left.properties.year_built) - Number(right.properties.year_built))[0];
  const newest = withKnownYear(parcels).sort((left, right) => Number(right.properties.year_built) - Number(left.properties.year_built))[0];
  const mostChanged = [...parcels].sort((left, right) => (right.properties.permit_count ?? 0) - (left.properties.permit_count ?? 0))[0];
  const mostSold = [...parcels].sort((left, right) => (right.properties.sale_count ?? 0) - (left.properties.sale_count ?? 0))[0];
  const buildWave = dominantDecade(parcels);

  return [
    {
      label: "Build wave",
      value: buildWave.value,
      detail: buildWave.detail
    },
    {
      label: "Oldest home",
      value: oldest?.properties.year_built ? String(oldest.properties.year_built) : "Unknown",
      detail: parcelLabel(oldest)
    },
    {
      label: "Newest home",
      value: newest?.properties.year_built ? String(newest.properties.year_built) : "Unknown",
      detail: parcelLabel(newest)
    },
    {
      label: "Most changed",
      value: `${(mostChanged?.properties.permit_count ?? 0).toLocaleString()} permits`,
      detail: parcelLabel(mostChanged)
    },
    {
      label: "Most sold",
      value: `${(mostSold?.properties.sale_count ?? 0).toLocaleString()} sales`,
      detail: parcelLabel(mostSold)
    }
  ];
}

function blockPersonality(parcels: ParcelFeature[]): { title: string; body: string } {
  const count = parcels.length;
  const olderCount = parcels.filter((parcel) => {
    const year = parcel.properties.year_built;
    return typeof year === "number" && year > 0 && year <= 1945;
  }).length;
  const recentSales = parcels.filter((parcel) => {
    const year = parcel.properties.latest_sale_year;
    return typeof year === "number" && year >= permitPressureCurrentYear - 2;
  }).length;
  const reinvestment = parcels.filter((parcel) =>
    ["recent_permit", "remodel", "addition"].includes(String(parcel.properties.permit_pressure_type))
  ).length;
  const rebuild = parcels.filter((parcel) =>
    parcel.properties.permit_pressure_type === "direct_teardown" ||
    parcel.properties.permit_pressure_type === "new_construction"
  ).length;

  if (rebuild > 0) {
    return {
      title: "A block with rebuild signals",
      body: `${count.toLocaleString()} homes are in this block. ${rebuild.toLocaleString()} show demolition or new-construction signals, while ${reinvestment.toLocaleString()} show reinvestment permits.`
    };
  }
  if (olderCount >= Math.max(2, count * 0.35)) {
    return {
      title: "A block with older-home fabric",
      body: `${olderCount.toLocaleString()} of ${count.toLocaleString()} homes were built by 1945. Recent sales appear on ${recentSales.toLocaleString()} homes.`
    };
  }
  if (reinvestment > 0) {
    return {
      title: "A block being cared for",
      body: `${reinvestment.toLocaleString()} homes show remodeling, addition, or other permit activity without a strong rebuild signal.`
    };
  }
  return {
    title: "A mostly quiet block",
    body: `${count.toLocaleString()} homes are in this block, with limited recent sale or permit signals in the current record.`
  };
}

function dominantDecade(parcels: ParcelFeature[]): { value: string; detail: string } {
  const counts = new Map<string, number>();
  parcels.forEach((parcel) => {
    const decade = parcel.properties.decade_built;
    if (!decade || decade === "Unknown" || decade === "Suspicious") return;
    counts.set(String(decade), (counts.get(String(decade)) ?? 0) + 1);
  });
  const [decade, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!decade) return { value: "Mixed", detail: "No dominant build decade is clear yet." };
  return {
    value: decade,
    detail: `${count.toLocaleString()} homes share this build decade.`
  };
}

function withKnownYear(parcels: ParcelFeature[]): ParcelFeature[] {
  return parcels.filter((parcel) => typeof parcel.properties.year_built === "number");
}

function parcelLabel(parcel?: ParcelFeature): string {
  if (!parcel) return "No matching home found.";
  return parcel.properties.address || parcel.properties.pin_normalized || "Selected block home";
}

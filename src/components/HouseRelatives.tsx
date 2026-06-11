import { buildPhysicalBlock } from "../lib/physicalBlock";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";

type HouseRelativesProps = {
  parcel: ParcelFeature;
  parcels: ParcelCollection | null;
  onSelectRelative?: (feature: ParcelFeature) => void;
};

type RelativeGroup = {
  label: string;
  detail: string;
  relatives: ParcelFeature[];
};

export function HouseRelatives({ parcel, parcels, onSelectRelative }: HouseRelativesProps) {
  const groups = relativeGroups(parcel, parcels).filter((group) => group.relatives.length > 0);
  if (groups.length === 0) return null;

  return (
    <section className="house-relatives" aria-label="House relatives">
      <div>
        <span>House relatives</span>
        <h4>Homes Connected to This One</h4>
        <p>Similar homes, same-era neighbors, and historic matches that help place this house in a bigger family story.</p>
      </div>
      <div className="house-relative-groups">
        {groups.map((group) => (
          <article className="house-relative-group" key={group.label}>
            <div>
              <strong>{group.label}</strong>
              <p>{group.detail}</p>
            </div>
            <div className="house-relative-list">
              {group.relatives.slice(0, 4).map((relative) => (
                <RelativeCard
                  feature={relative}
                  key={relativeKey(relative)}
                  onSelectRelative={onSelectRelative}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelativeCard({
  feature,
  onSelectRelative
}: {
  feature: ParcelFeature;
  onSelectRelative?: (feature: ParcelFeature) => void;
}) {
  const body = (
    <>
      <strong>{feature.properties.address || "Nearby home"}</strong>
      <span>{relativeSummary(feature)}</span>
    </>
  );

  if (!onSelectRelative) return <div className="house-relative-card">{body}</div>;

  return (
    <button className="house-relative-card" type="button" onClick={() => onSelectRelative(feature)}>
      {body}
    </button>
  );
}

function relativeGroups(parcel: ParcelFeature, parcels: ParcelCollection | null): RelativeGroup[] {
  const features = parcels?.features.filter((feature) => relativeKey(feature) !== relativeKey(parcel)) ?? [];
  const blockRelatives = sameBlockRelatives(parcel, parcels);
  const sameEraRelatives = features
    .filter((feature) => feature.properties.decade_built && feature.properties.decade_built === parcel.properties.decade_built)
    .sort((left, right) => similarityScore(parcel, right) - similarityScore(parcel, left));
  const historicRelatives = features
    .filter((feature) => historicMatchScore(parcel, feature) > 0)
    .sort((left, right) => historicMatchScore(parcel, right) - historicMatchScore(parcel, left));

  return [
    {
      label: "Same block family",
      detail: "Other homes sharing the selected home's street-bounded block.",
      relatives: blockRelatives
    },
    {
      label: "Same-era cousins",
      detail: "Homes from the same build decade with similar size or lot clues.",
      relatives: sameEraRelatives
    },
    {
      label: "Historic/artifact matches",
      detail: "Homes with similar survey, style, builder, architect, or public-history artifacts.",
      relatives: historicRelatives
    }
  ];
}

function sameBlockRelatives(parcel: ParcelFeature, parcels: ParcelCollection | null): ParcelFeature[] {
  const blockId = parcel.properties.street_block_id;
  if (blockId) {
    return parcels?.features.filter(
      (feature) => feature.properties.street_block_id === blockId && relativeKey(feature) !== relativeKey(parcel)
    ) ?? [];
  }
  return buildPhysicalBlock(parcel, parcels)?.contextParcels ?? [];
}

function similarityScore(anchor: ParcelFeature, candidate: ParcelFeature): number {
  let score = 0;
  if (candidate.properties.decade_built === anchor.properties.decade_built) score += 50;
  score += closeness(anchor.properties.year_built, candidate.properties.year_built, 20);
  score += closeness(anchor.properties.building_sqft, candidate.properties.building_sqft, 2500);
  score += closeness(anchor.properties.land_sqft, candidate.properties.land_sqft, 8000);
  return score;
}

function historicMatchScore(anchor: ParcelFeature, candidate: ParcelFeature): number {
  let score = 0;
  if (anchor.properties.hargis_arch_class && anchor.properties.hargis_arch_class === candidate.properties.hargis_arch_class) {
    score += 40;
  }
  if (anchor.properties.hargis_architect && anchor.properties.hargis_architect === candidate.properties.hargis_architect) {
    score += 50;
  }
  if (anchor.properties.hargis_builder && anchor.properties.hargis_builder === candidate.properties.hargis_builder) {
    score += 50;
  }
  if ((anchor.properties.hargis_record_count ?? 0) > 0 && (candidate.properties.hargis_record_count ?? 0) > 0) {
    score += 20;
  }
  if (anchor.properties.decade_built && anchor.properties.decade_built === candidate.properties.decade_built) {
    score += 10;
  }
  return score;
}

function closeness(anchor?: number | null, candidate?: number | null, range = 1): number {
  if (typeof anchor !== "number" || typeof candidate !== "number") return 0;
  const distance = Math.abs(anchor - candidate);
  return Math.max(0, 20 - Math.round((distance / range) * 20));
}

function relativeSummary(feature: ParcelFeature): string {
  const parts = [
    feature.properties.year_built ? `built ${feature.properties.year_built}` : feature.properties.decade_built,
    feature.properties.hargis_arch_class,
    feature.properties.permit_count ? `${feature.properties.permit_count} permits` : null,
    feature.properties.sale_count ? `${feature.properties.sale_count} sales` : null
  ].filter(Boolean);
  return parts.join(" - ") || "Related parcel";
}

function relativeKey(feature: ParcelFeature): string {
  return feature.properties.pin_normalized || feature.properties.pin_original || feature.properties.address || "";
}

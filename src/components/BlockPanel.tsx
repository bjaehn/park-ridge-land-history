import { useMemo } from "react";
import type { PermitPressureWindow } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { buildPhysicalBlock, parcelCollectionFromFeatures } from "../lib/physicalBlock";
import { BlockBiographyCard } from "./BlockBiographyCard";
import { BlockChangeTable } from "./BlockChangeTable";
import { BuildoutMilestonesTable } from "./BuildoutMilestonesTable";
import { ChangeStoryCard } from "./ChangeStoryCard";
import { DecadeComparisonTable } from "./DecadeComparisonTable";
import { PermitWorkComparisonTable } from "./PermitWorkComparisonTable";
import { TimelineControl } from "./TimelineControl";
import { DataCaveat } from "./cards/DataCaveat";

type BlockPanelProps = {
  parcel: ParcelFeature | null;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
  activeView: BlockView;
  maxBuiltYear: number;
  minAvailableYear: number;
  maxAvailableYear: number;
  isBuildoutPlaying: boolean;
  animationSpeed: "slow" | "normal" | "fast";
  builtByYearCount: number;
  knownYearTotal: number;
  percentBuilt: number;
  onSetActiveView: (view: BlockView) => void;
  onSetMaxBuiltYear: (year: number) => void;
  onToggleBuildoutPlayback: () => void;
  onResetBuildout: () => void;
  onSetAnimationSpeed: (speed: "slow" | "normal" | "fast") => void;
};

export type BlockView = "age" | "buildout" | "stability" | "activity";

const blockViews: Array<{ id: BlockView; label: string; meta: string }> = [
  { id: "age", label: "How old are the homes on this block?", meta: "Compare the other homes by decade built." },
  { id: "buildout", label: "How did this block grow?", meta: "See when the block filled in over time." },
  { id: "stability", label: "Where is change happening on this block?", meta: "Separate quiet homes from active change." },
  { id: "activity", label: "What kind of work is happening on this block?", meta: "Compare remodeling, additions, and rebuild permits." }
];

export function BlockPanel({
  parcel,
  parcels,
  permitPressureWindow,
  activeView,
  maxBuiltYear,
  minAvailableYear,
  maxAvailableYear,
  isBuildoutPlaying,
  animationSpeed,
  builtByYearCount,
  knownYearTotal,
  percentBuilt,
  onSetActiveView,
  onSetMaxBuiltYear,
  onToggleBuildoutPlayback,
  onResetBuildout,
  onSetAnimationSpeed
}: BlockPanelProps) {
  const physicalBlock = useMemo(
    () => (parcel ? buildPhysicalBlock(parcel, parcels) : null),
    [parcel, parcels]
  );
  const contextCollection = useMemo(
    () => parcelCollectionFromFeatures(physicalBlock?.contextParcels ?? []),
    [physicalBlock]
  );
  const blockRead = useMemo(
    () => blockSummary(physicalBlock?.contextParcels ?? []),
    [physicalBlock]
  );

  return (
    <section className="panel-section block-panel" aria-label="Block analysis">
      <h2>Block</h2>
      <p className="block-panel-note">
        Start with one address. The block view compares the other homes on the same physical block before you zoom out to larger areas.
      </p>
      {!parcel ? (
        <p className="quiet-note block-empty">Search for an address or click a parcel on the map to read its block.</p>
      ) : (
        <>
          <div className="selected-place-card">
            <span>Starting place</span>
            <strong>{parcel.properties.address || "Selected parcel"}</strong>
          </div>
          <div className="scale-definition">
            <strong>What counts as this block?</strong>
            <p>
              {physicalBlock?.isStreetBounded
                ? "Homes inside the same street-bounded Census block as the selected parcel."
                : "Homes connected through the same parcel fabric, stopping at the gaps created by streets."}{" "}
              The selected home anchors the block; the analysis below compares the other {contextCollection.features.length.toLocaleString()} homes on that block.
            </p>
            {physicalBlock?.method && <p>{physicalBlock.method}</p>}
            {physicalBlock?.capped && (
              <p>This block group was capped at 120 parcels, so it may include a larger connected parcel area.</p>
            )}
            <DataCaveat caveatKey="census_block_proxy" />
          </div>
          <BlockBiographyCard
            parcels={physicalBlock?.allParcels ?? []}
            isStreetBounded={Boolean(physicalBlock?.isStreetBounded)}
          />
          <ChangeStoryCard scope="block" parcels={parcelCollectionFromFeatures(physicalBlock?.allParcels ?? [])} />
          <div className="block-readout">
            <strong>{blockRead.title}</strong>
            <p>{blockRead.body}</p>
          </div>
          <BlockComparisonSection
            blockParcels={physicalBlock?.allParcels ?? []}
            allParcels={parcels?.features ?? []}
          />
          <div className="preset-grid block-preset-grid" aria-label="Choose a block question">
            {blockViews.map((view) => (
              <button
                className={`preset-button ${activeView === view.id ? "is-active" : ""}`}
                type="button"
                aria-pressed={activeView === view.id}
                key={view.id}
                onClick={() => onSetActiveView(view.id)}
              >
                <span>{view.label}</span>
                <small>{view.meta}</small>
                {activeView === view.id && <em>Showing now</em>}
              </button>
            ))}
          </div>
          {contextCollection.features.length === 0 ? (
            <p className="quiet-note block-empty">No other homes were found on this parcel-defined block.</p>
          ) : (
            <>
              {activeView === "buildout" && (
                <TimelineControl
                  activePreset="buildout"
                  title="Block Snapshot"
                  homesLabel="Homes on block"
                  buildYearLabel="Build year known"
                  coverageLabel="Age coverage"
                  moveThroughTimeNote="Move through build years to watch just this physical block fill in on the map."
                  maxBuiltYear={maxBuiltYear}
                  minAvailableYear={minAvailableYear}
                  maxAvailableYear={maxAvailableYear}
                  isBuildoutPlaying={isBuildoutPlaying}
                  animationSpeed={animationSpeed}
                  builtByYearCount={builtByYearCount}
                  knownYearTotal={knownYearTotal}
                  percentBuilt={percentBuilt}
                  totalCount={physicalBlock?.allParcels.length ?? contextCollection.features.length}
                  onSetMaxBuiltYear={onSetMaxBuiltYear}
                  onToggleBuildoutPlayback={onToggleBuildoutPlayback}
                  onResetBuildout={onResetBuildout}
                  onSetAnimationSpeed={onSetAnimationSpeed}
                />
              )}
              <BlockViewContent
                activeView={activeView}
                parcels={contextCollection}
                permitPressureWindow={permitPressureWindow}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}

function BlockViewContent({
  activeView,
  parcels,
  permitPressureWindow
}: {
  activeView: BlockView;
  parcels: ParcelCollection;
  permitPressureWindow: PermitPressureWindow;
}) {
  if (activeView === "buildout") {
    return (
      <BuildoutMilestonesTable
        parcels={parcels}
        title="How This Block Grew"
        note="Shows when the other homes on this block appeared, decade by decade, as a block-level growth story."
      />
    );
  }

  if (activeView === "stability") {
    return <BlockChangeTable parcels={parcels} />;
  }

  if (activeView === "activity") {
    return (
      <PermitWorkComparisonTable
        parcels={parcels}
        permitPressureWindow={permitPressureWindow}
        title="Work Happening on This Block"
        note="Groups the other homes on this block by their strongest recent permit signal."
      />
    );
  }

  return (
    <DecadeComparisonTable
      parcels={parcels}
      title="Homes on This Block by Age"
      note="Groups the other homes on this block by decade built, then compares updates, older homes, recent sales, and rebuild signals."
    />
  );
}

function blockSummary(features: ParcelFeature[]): { title: string; body: string } {
  if (features.length === 0) {
    return {
      title: "This block needs more parcel context",
      body: "The selected parcel was found, but no connected neighboring homes were identified from the parcel fabric."
    };
  }

  const knownDecades = features
    .map((feature) => feature.properties.decade_built)
    .filter((decade): decade is string => Boolean(decade) && decade !== "Unknown" && decade !== "Suspicious");
  const dominantDecade = mostCommon(knownDecades) ?? "mixed decades";
  const updatedCount = features.filter((feature) =>
    ["recent_permit", "remodel", "addition"].includes(String(feature.properties.permit_pressure_type))
  ).length;
  const rebuildCount = features.filter((feature) =>
    feature.properties.permit_pressure_type === "direct_teardown" ||
    feature.properties.permit_pressure_type === "new_construction"
  ).length;

  if (rebuildCount > 0) {
    return {
      title: "This block has rebuild signals",
      body: `${features.length.toLocaleString()} other homes are on this physical block. The most common build era is ${dominantDecade}, with ${updatedCount.toLocaleString()} showing update permits and ${rebuildCount.toLocaleString()} showing demolition or new-construction signals.`
    };
  }

  if (updatedCount > 0) {
    return {
      title: "This block shows reinvestment",
      body: `${features.length.toLocaleString()} other homes are on this physical block. The most common build era is ${dominantDecade}, and ${updatedCount.toLocaleString()} have recent remodeling, addition, or permit activity.`
    };
  }

  return {
    title: "This block looks mostly quiet",
    body: `${features.length.toLocaleString()} other homes are on this physical block. The most common build era is ${dominantDecade}, with no strong recent permit signal in the current evidence window.`
  };
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function BlockComparisonSection({
  blockParcels,
  allParcels
}: {
  blockParcels: ParcelFeature[];
  allParcels: ParcelFeature[];
}) {
  const blockYears = blockParcels
    .map(f => f.properties.year_built)
    .filter((y): y is number => typeof y === "number" && y > 1800 && y <= 2026);
  const cityYears = allParcels
    .map(f => f.properties.year_built)
    .filter((y): y is number => typeof y === "number" && y > 1800 && y <= 2026);

  if (blockYears.length < 3 || cityYears.length < 100) return null;

  const blockMedian = Math.round(median(blockYears));
  const cityMedian = Math.round(median(cityYears));
  const diff = blockMedian - cityMedian;

  let ageLabel: string;
  if (Math.abs(diff) <= 4) {
    ageLabel = `This block was built around the same time as Park Ridge overall (median year: ${blockMedian}).`;
  } else if (diff <= -15) {
    ageLabel = `This block is much older than Park Ridge overall. Median year built: ${blockMedian} vs. ${cityMedian} citywide.`;
  } else if (diff < 0) {
    ageLabel = `This block is older than Park Ridge overall. Median year built: ${blockMedian} vs. ${cityMedian} citywide.`;
  } else if (diff >= 15) {
    ageLabel = `This block is much newer than Park Ridge overall. Median year built: ${blockMedian} vs. ${cityMedian} citywide.`;
  } else {
    ageLabel = `This block is newer than Park Ridge overall. Median year built: ${blockMedian} vs. ${cityMedian} citywide.`;
  }

  const blockPermitAvg = average(blockParcels.map(f => f.properties.permit_count ?? 0));
  const cityPermitAvg = average(allParcels.map(f => f.properties.permit_count ?? 0));
  const permitRatio = cityPermitAvg === 0 ? 0 : (blockPermitAvg - cityPermitAvg) / cityPermitAvg;
  let permitLabel: string;
  if (Math.abs(permitRatio) < 0.2) {
    permitLabel = `Permit activity on this block is similar to Park Ridge overall (avg: ${blockPermitAvg.toFixed(1)} vs. ${cityPermitAvg.toFixed(1)} citywide).`;
  } else if (permitRatio > 0.5) {
    permitLabel = `This block has more permit activity than Park Ridge overall (avg: ${blockPermitAvg.toFixed(1)} vs. ${cityPermitAvg.toFixed(1)} citywide).`;
  } else if (permitRatio > 0) {
    permitLabel = `This block has slightly more permit activity than Park Ridge overall (avg: ${blockPermitAvg.toFixed(1)} vs. ${cityPermitAvg.toFixed(1)} citywide).`;
  } else if (permitRatio < -0.5) {
    permitLabel = `This block has less permit activity than Park Ridge overall (avg: ${blockPermitAvg.toFixed(1)} vs. ${cityPermitAvg.toFixed(1)} citywide).`;
  } else {
    permitLabel = `This block has slightly less permit activity than Park Ridge overall (avg: ${blockPermitAvg.toFixed(1)} vs. ${cityPermitAvg.toFixed(1)} citywide).`;
  }

  return (
    <div className="block-comparison-section">
      <h3 className="block-comparison-title">How this block compares to Park Ridge</h3>
      <ul className="block-comparison-list">
        <li className="block-comparison-item">
          <span className="bci-label">Age</span>
          <span className="bci-value">{ageLabel}</span>
        </li>
        <li className="block-comparison-item">
          <span className="bci-label">Permits</span>
          <span className="bci-value">{permitLabel}</span>
        </li>
      </ul>
    </div>
  );
}

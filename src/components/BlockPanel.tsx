import { useMemo, useState } from "react";
import type { PermitPressureWindow } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { buildPhysicalBlock, parcelCollectionFromFeatures } from "../lib/physicalBlock";
import { BlockChangeTable } from "./BlockChangeTable";
import { BuildoutMilestonesTable } from "./BuildoutMilestonesTable";
import { DecadeComparisonTable } from "./DecadeComparisonTable";
import { PermitWorkComparisonTable } from "./PermitWorkComparisonTable";

type BlockPanelProps = {
  parcel: ParcelFeature | null;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
};

type BlockView = "age" | "buildout" | "stability" | "activity";

const blockViews: Array<{ id: BlockView; label: string; meta: string }> = [
  { id: "age", label: "How old are the homes on this block?", meta: "Compare the other homes by decade built." },
  { id: "buildout", label: "How did this block grow?", meta: "See when the block filled in over time." },
  { id: "stability", label: "Where is change happening on this block?", meta: "Separate quiet homes from active change." },
  { id: "activity", label: "What kind of work is happening on this block?", meta: "Compare remodeling, additions, and rebuild permits." }
];

export function BlockPanel({
  parcel,
  parcels,
  permitPressureWindow
}: BlockPanelProps) {
  const [activeView, setActiveView] = useState<BlockView>("age");
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
              Homes connected through the same parcel fabric, stopping at the gaps created by streets. The selected home anchors the block; the analysis below compares the other {contextCollection.features.length.toLocaleString()} homes on that block.
            </p>
            {physicalBlock?.capped && (
              <p>This block group was capped at 120 parcels, so it may include a larger connected parcel area.</p>
            )}
          </div>
          <div className="block-readout">
            <strong>{blockRead.title}</strong>
            <p>{blockRead.body}</p>
          </div>
          <div className="preset-grid block-preset-grid" aria-label="Choose a block question">
            {blockViews.map((view) => (
              <button
                className={`preset-button ${activeView === view.id ? "is-active" : ""}`}
                type="button"
                aria-pressed={activeView === view.id}
                key={view.id}
                onClick={() => setActiveView(view.id)}
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
            <BlockViewContent
              activeView={activeView}
              parcels={contextCollection}
              permitPressureWindow={permitPressureWindow}
            />
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

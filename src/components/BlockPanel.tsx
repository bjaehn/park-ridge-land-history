import type { PermitPressureWindow } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";
import { BlockStoryCard } from "./BlockStoryCard";
import { NearbyActivitySummary } from "./NearbyActivitySummary";

type BlockPanelProps = {
  parcel: ParcelFeature | null;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
};

export function BlockPanel({
  parcel,
  parcels,
  permitPressureWindow
}: BlockPanelProps) {
  return (
    <section className="panel-section block-panel" aria-label="Block analysis">
      <h2>Block</h2>
      <p className="block-panel-note">
        Start with one address. The block view looks at the nearby homes around it, so you can understand the street context before zooming out to larger areas.
      </p>
      <div className="scale-definition">
        <strong>What counts as the block?</strong>
        <p>
          For now, this means nearby parcels within about 500 feet. That usually captures the properties someone would notice from the street, across corners, and around the immediate block.
        </p>
      </div>
      {!parcel ? (
        <p className="quiet-note block-empty">Search for an address or click a parcel on the map to read its block.</p>
      ) : (
        <>
          <div className="selected-place-card">
            <span>Starting place</span>
            <strong>{parcel.properties.address || "Selected parcel"}</strong>
          </div>
          <BlockStoryCard
            parcel={parcel}
            parcels={parcels}
            permitPressureWindow={permitPressureWindow}
          />
          <NearbyActivitySummary
            parcel={parcel}
            parcels={parcels}
            permitPressureWindow={permitPressureWindow}
          />
        </>
      )}
    </section>
  );
}

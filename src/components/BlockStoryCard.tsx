import { buildBlockStory } from "../lib/blockStory";
import type { PermitPressureWindow } from "../lib/permitPressure";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";

type BlockStoryCardProps = {
  parcel: ParcelFeature;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
};

export function BlockStoryCard({
  parcel,
  parcels,
  permitPressureWindow
}: BlockStoryCardProps) {
  const story = buildBlockStory(parcel, parcels, permitPressureWindow);
  if (!story) return null;

  return (
    <div className="block-story" aria-label="Block story">
      <h4>{story.title}</h4>
      <p>{story.summary}</p>
      <ul>
        {story.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </div>
  );
}

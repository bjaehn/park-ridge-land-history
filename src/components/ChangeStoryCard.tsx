import {
  aggregateChangeStory,
  classifyParcelChangeStory,
  type AggregateChangeStory,
  type ChangeStory
} from "../lib/changeStory";
import type { ParcelCollection, ParcelFeature } from "../lib/parcelTypes";

type ChangeStoryCardProps =
  | {
      scope: "property";
      parcel: ParcelFeature;
      title?: string;
    }
  | {
      scope: "block" | "area" | "city";
      parcels: ParcelCollection | null;
      title?: string;
    };

export function ChangeStoryCard(props: ChangeStoryCardProps) {
  if (props.scope === "property") {
    const story = classifyParcelChangeStory(props.parcel.properties);
    return <PropertyChangeStory story={story} title={props.title ?? "What Kind of Change Is This?"} />;
  }

  const features = props.parcels?.features ?? [];
  if (features.length === 0) return null;
  const story = aggregateChangeStory(features, props.scope);
  return <AggregateStory story={story} title={props.title ?? "What Kind of Change Is This?"} />;
}

function PropertyChangeStory({ story, title }: { story: ChangeStory; title: string }) {
  return (
    <section className={`change-story-card change-story-${story.type}`} aria-label={title}>
      <div className="change-story-heading">
        <span>{title}</span>
        <h4>{story.label}</h4>
      </div>
      <p>{story.title}</p>
      <p>{story.body}</p>
      <div className="change-story-evidence">
        {story.evidence.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function AggregateStory({ story, title }: { story: AggregateChangeStory; title: string }) {
  return (
    <section className={`change-story-card change-story-${story.type}`} aria-label={title}>
      <div className="change-story-heading">
        <span>{title}</span>
        <h4>{story.label}</h4>
      </div>
      <p>{story.title}</p>
      <p>{story.body}</p>
      <div className="change-story-mix" aria-label="Change story mix">
        {story.counts.map((count) => (
          <article key={count.type}>
            <strong>{count.label}</strong>
            <span>{count.count.toLocaleString()} / {count.percent}%</span>
          </article>
        ))}
      </div>
    </section>
  );
}

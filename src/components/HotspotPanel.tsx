import {
  areaGroupingDefinitions,
  type AreaGroupingId,
  type AreaSummaryCollection,
  type AreaSummaryFeature
} from "../lib/areaGroups";
import type { PermitPressureWindow } from "../lib/permitPressure";
import type { HotspotCollection } from "../lib/hotspots";
import type { ParcelCollection } from "../lib/parcelTypes";
import { DataCaveat } from "./cards/DataCaveat";
import { BlockChangeTable } from "./BlockChangeTable";
import { BuildoutMilestonesTable } from "./BuildoutMilestonesTable";
import { ChangeStoryCard } from "./ChangeStoryCard";
import { DecadeComparisonTable } from "./DecadeComparisonTable";
import { DecadeDistributionChart } from "./DecadeDistributionChart";
import { PermitWorkComparisonTable } from "./PermitWorkComparisonTable";
import { TimelineControl } from "./TimelineControl";

export type AreaView = "age" | "buildout" | "stability" | "activity";

type HotspotPanelProps = {
  hotspots: HotspotCollection;
  areaSummaries: AreaSummaryCollection;
  activeGrouping: AreaGroupingId;
  activeView: AreaView;
  selectedAreaId: string | null;
  hasWardBoundaries: boolean;
  selectedAreaParcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
  maxBuiltYear: number;
  minAvailableYear: number;
  maxAvailableYear: number;
  isBuildoutPlaying: boolean;
  animationSpeed: "slow" | "normal" | "fast";
  builtByYearCount: number;
  knownYearTotal: number;
  percentBuilt: number;
  onSetGrouping: (grouping: AreaGroupingId) => void;
  onSetActiveView: (view: AreaView) => void;
  onSelectArea: (area: AreaSummaryFeature) => void;
  onSetMaxBuiltYear: (year: number) => void;
  onToggleBuildoutPlayback: () => void;
  onResetBuildout: () => void;
  onSetAnimationSpeed: (speed: "slow" | "normal" | "fast") => void;
};

const areaViews: Array<{ id: AreaView; label: string; meta: string }> = [
  { id: "age", label: "How old are the homes here?", meta: "Compare this area's homes by decade built." },
  { id: "buildout", label: "How did this area grow?", meta: "Move through time for only this area." },
  { id: "stability", label: "Where is change happening here?", meta: "Separate quiet homes from active change." },
  { id: "activity", label: "What kind of work is happening here?", meta: "Compare permits, additions, and rebuild signals." }
];

export function HotspotPanel({
  areaSummaries,
  activeGrouping,
  activeView,
  selectedAreaId,
  hasWardBoundaries,
  selectedAreaParcels,
  permitPressureWindow,
  maxBuiltYear,
  minAvailableYear,
  maxAvailableYear,
  isBuildoutPlaying,
  animationSpeed,
  builtByYearCount,
  knownYearTotal,
  percentBuilt,
  onSetGrouping,
  onSetActiveView,
  onSelectArea,
  onSetMaxBuiltYear,
  onToggleBuildoutPlayback,
  onResetBuildout,
  onSetAnimationSpeed
}: HotspotPanelProps) {
  const selectedArea = areaSummaries.features.find((area) => area.properties.id === selectedAreaId) ?? null;
  const activeDefinition = areaGroupingDefinitions.find((definition) => definition.id === activeGrouping) ?? areaGroupingDefinitions[0];

  return (
    <section className="panel-section hotspot-section" aria-label="Areas in Park Ridge">
      <h2>Areas</h2>

      <div className="area-lens-picker area-subtabs" aria-label="Choose area type">
        {areaGroupingDefinitions.map((definition) => (
          <button
            className={definition.id === activeGrouping ? "is-active" : ""}
            type="button"
            key={definition.id}
            onClick={() => onSetGrouping(definition.id)}
          >
            <strong>{definition.shortLabel}</strong>
          </button>
        ))}
      </div>

      <div className="cluster-view-heading">
        <h3>{activeDefinition.shortLabel}</h3>
        <p>{activeDefinition.description}</p>
        {activeGrouping === "neighborhoods" && (
          <DataCaveat caveatKey="neighborhood_boundary" />
        )}
        {activeGrouping === "change_zones" && (
          <DataCaveat caveatKey="census_block_proxy" />
        )}
      </div>

      <AreaList
        areas={areaSummaries.features}
        activeGrouping={activeGrouping}
        hasWardBoundaries={hasWardBoundaries}
        selectedAreaId={selectedAreaId}
        onSelectArea={onSelectArea}
      />

      {selectedArea ? (
        <>
          <AreaReadout area={selectedArea} />
          <div className="preset-grid area-question-grid" aria-label="Choose an area question">
            {areaViews.map((view) => (
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
          <AreaViewContent
            activeView={activeView}
            area={selectedArea}
            parcels={selectedAreaParcels}
            permitPressureWindow={permitPressureWindow}
            maxBuiltYear={maxBuiltYear}
            minAvailableYear={minAvailableYear}
            maxAvailableYear={maxAvailableYear}
            isBuildoutPlaying={isBuildoutPlaying}
            animationSpeed={animationSpeed}
            builtByYearCount={builtByYearCount}
            knownYearTotal={knownYearTotal}
            percentBuilt={percentBuilt}
            onSetMaxBuiltYear={onSetMaxBuiltYear}
            onToggleBuildoutPlayback={onToggleBuildoutPlayback}
            onResetBuildout={onResetBuildout}
            onSetAnimationSpeed={onSetAnimationSpeed}
          />
        </>
      ) : (
        <p className="quiet-note hotspot-empty">Pick one area to focus the map and analysis.</p>
      )}
    </section>
  );
}

function AreaList({
  areas,
  activeGrouping,
  hasWardBoundaries,
  selectedAreaId,
  onSelectArea
}: {
  areas: AreaSummaryFeature[];
  activeGrouping: AreaGroupingId;
  hasWardBoundaries: boolean;
  selectedAreaId: string | null;
  onSelectArea: (area: AreaSummaryFeature) => void;
}) {
  if (areas.length === 0 && activeGrouping === "wards" && !hasWardBoundaries) {
    return (
      <div className="scale-definition">
        <strong>Official ward file needed</strong>
        <p>
          Election wards will show here once the official Park Ridge ward boundary file is added. The app no longer uses approximate ward shapes.
        </p>
      </div>
    );
  }
  if (areas.length === 0) return <p className="quiet-note hotspot-empty">No areas found in this grouping.</p>;
  return (
    <div className="hotspot-list area-pick-list" aria-label="Pick an area">
      {areas.map((area) => (
        <button
          className={`hotspot-button ${area.properties.id === selectedAreaId ? "is-active" : ""}`}
          type="button"
          key={area.properties.id}
          onClick={() => onSelectArea(area)}
        >
          <span className="area-list-title">
            {area.properties.displayColor ? (
              <i className="area-color-dot" style={{ backgroundColor: area.properties.displayColor }} aria-hidden="true" />
            ) : null}
            {area.properties.label}
          </span>
          <small>
            {area.properties.changeStoryLabel} - {area.properties.parcelCount.toLocaleString()} homes
          </small>
        </button>
      ))}
    </div>
  );
}

function AreaReadout({ area }: { area: AreaSummaryFeature }) {
  return (
    <div className="area-readout">
      <h3>{area.properties.label}</h3>
      <p>{area.properties.evaluation || area.properties.description}</p>
      <div className={`area-change-story change-story-${area.properties.changeStoryType}`}>
        <strong>{area.properties.changeStoryLabel}</strong>
        <span>{area.properties.changeStoryRead}</span>
      </div>
      <dl className="detail-list cluster-detail-list">
        <div>
          <dt>Homes</dt>
          <dd>{area.properties.parcelCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Remodeling</dt>
          <dd>{countAndPercent(area.properties.remodelCount, area.properties.remodelPercent)}</dd>
        </div>
        <div>
          <dt>Older homes</dt>
          <dd>{countAndPercent(area.properties.olderHomeCount, area.properties.olderHomePercent)}</dd>
        </div>
        <div>
          <dt>Rebuild signals</dt>
          <dd>{countAndPercent(area.properties.teardownPressureCount, area.properties.teardownPressurePercent)}</dd>
        </div>
        <div>
          <dt>Sold recently</dt>
          <dd>{countAndPercent(area.properties.soldLastThreeYearsCount, area.properties.soldLastThreeYearsPercent)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{area.properties.sourceLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

function AreaViewContent({
  activeView,
  area,
  parcels,
  permitPressureWindow,
  maxBuiltYear,
  minAvailableYear,
  maxAvailableYear,
  isBuildoutPlaying,
  animationSpeed,
  builtByYearCount,
  knownYearTotal,
  percentBuilt,
  onSetMaxBuiltYear,
  onToggleBuildoutPlayback,
  onResetBuildout,
  onSetAnimationSpeed
}: {
  activeView: AreaView;
  area: AreaSummaryFeature;
  parcels: ParcelCollection | null;
  permitPressureWindow: PermitPressureWindow;
  maxBuiltYear: number;
  minAvailableYear: number;
  maxAvailableYear: number;
  isBuildoutPlaying: boolean;
  animationSpeed: "slow" | "normal" | "fast";
  builtByYearCount: number;
  knownYearTotal: number;
  percentBuilt: number;
  onSetMaxBuiltYear: (year: number) => void;
  onToggleBuildoutPlayback: () => void;
  onResetBuildout: () => void;
  onSetAnimationSpeed: (speed: "slow" | "normal" | "fast") => void;
}) {
  if (!parcels || parcels.features.length === 0) {
    return <p className="quiet-note hotspot-empty">No homes found for this area.</p>;
  }

  if (activeView === "buildout") {
    return (
      <>
        <TimelineControl
          activePreset="buildout"
          title="Area Snapshot"
          homesLabel="Homes in area"
          buildYearLabel="Build year known"
          coverageLabel="Age coverage"
          moveThroughTimeNote={`Move through build years to watch ${area.properties.label} fill in on the map.`}
          maxBuiltYear={maxBuiltYear}
          minAvailableYear={minAvailableYear}
          maxAvailableYear={maxAvailableYear}
          isBuildoutPlaying={isBuildoutPlaying}
          animationSpeed={animationSpeed}
          builtByYearCount={builtByYearCount}
          knownYearTotal={knownYearTotal}
          percentBuilt={percentBuilt}
          totalCount={parcels.features.length}
          onSetMaxBuiltYear={onSetMaxBuiltYear}
          onToggleBuildoutPlayback={onToggleBuildoutPlayback}
          onResetBuildout={onResetBuildout}
          onSetAnimationSpeed={onSetAnimationSpeed}
        />
        <BuildoutMilestonesTable
          parcels={parcels}
          title="How This Area Grew"
          note={`Shows when today's homes in ${area.properties.label} appeared, decade by decade.`}
        />
        <DecadeDistributionChart
          parcels={parcels}
          title="Area Build-Out by Decade"
          note="Shows how many of today's homes in this area were added in each decade."
        />
      </>
    );
  }

  if (activeView === "stability") {
    return (
      <>
        <ChangeStoryCard scope="area" parcels={parcels} />
        <BlockChangeTable
          parcels={parcels}
          title="Where Is Change Happening Here?"
          note="Groups homes in this area by whether they look quiet, recently updated, actively changing, or tied to rebuild permits."
        />
      </>
    );
  }

  if (activeView === "activity") {
    return (
      <PermitWorkComparisonTable
        parcels={parcels}
        permitPressureWindow={permitPressureWindow}
        title="Work Happening in This Area"
        note="Groups homes in this area by their strongest recent permit signal."
      />
    );
  }

  return (
    <>
      <DecadeComparisonTable
        parcels={parcels}
        title="Homes in This Area by Age"
        note={`Groups homes in ${area.properties.label} by decade built, then compares updates, older homes, recent sales, and rebuild signals.`}
      />
      <DecadeDistributionChart
        parcels={parcels}
        title="Area Age Mix"
        note="Shows the age mix for only the selected area."
      />
    </>
  );
}

function countAndPercent(count: number, percent: number): string {
  return `${count.toLocaleString()} / ${percent}%`;
}

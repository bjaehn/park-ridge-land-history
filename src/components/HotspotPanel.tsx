import {
  areaGroupingDefinitions,
  type AreaGroupingId,
  type AreaSummaryCollection,
  type AreaSummaryFeature,
  type AreaSummaryProperties
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

      {activeGrouping === "neighborhoods" ? (
        <NeighborhoodBrowser
          areas={areaSummaries.features}
          selectedAreaId={selectedAreaId}
          onSelectArea={onSelectArea}
        />
      ) : (
        <AreaList
          areas={areaSummaries.features}
          activeGrouping={activeGrouping}
          hasWardBoundaries={hasWardBoundaries}
          selectedAreaId={selectedAreaId}
          onSelectArea={onSelectArea}
        />
      )}

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

// ─── Neighborhood character helpers ─────────────────────────────────────────

type NeighborhoodCharacter = {
  label: string;
  description: string;
};

function neighborhoodCharacter(p: AreaSummaryProperties): NeighborhoodCharacter {
  if (p.teardownPressurePercent >= 5) {
    return { label: "In transition", description: "New homes replacing older ones — character is actively changing." };
  }
  if (p.olderHomePercent >= 35 && p.medianYearBuilt !== null && p.medianYearBuilt < 1950) {
    return { label: "Pre-war character", description: "Architecture and street scale from before WWII — hard to replicate." };
  }
  if (p.remodelPercent >= 20 && p.soldLastThreeYearsPercent < 12) {
    return { label: "Invested & stable", description: "Owners are improving their homes and staying put." };
  }
  if (p.soldLastThreeYearsPercent >= 12) {
    return { label: "Active turnover", description: "Homes change hands more often — a neighborhood still in motion." };
  }
  if (p.medianYearBuilt !== null && p.medianYearBuilt < 1960) {
    return { label: "Mid-century roots", description: "Post-war fabric with long-standing neighbors." };
  }
  return { label: "Settled", description: "Quiet, consistent Park Ridge character." };
}

// ─── Neighborhood browser cards ─────────────────────────────────────────────

function NeighborhoodBrowser({
  areas,
  selectedAreaId,
  onSelectArea
}: {
  areas: AreaSummaryFeature[];
  selectedAreaId: string | null;
  onSelectArea: (area: AreaSummaryFeature) => void;
}) {
  if (areas.length === 0) return <p className="quiet-note hotspot-empty">No neighborhoods found.</p>;
  return (
    <div className="nbr-grid" aria-label="Browse Park Ridge neighborhoods">
      {areas.map((area) => (
        <NeighborhoodCard
          key={area.properties.id}
          area={area}
          isSelected={area.properties.id === selectedAreaId}
          onSelect={() => onSelectArea(area)}
        />
      ))}
    </div>
  );
}

function MiniBar({ label, pct, value }: { label: string; pct: number; value: string }) {
  return (
    <div className="nbr-minibar">
      <span className="nbr-minibar-label">{label}</span>
      <div className="nbr-minibar-track">
        <div className="nbr-minibar-fill" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      </div>
      <span className="nbr-minibar-value">{value}</span>
    </div>
  );
}

function NeighborhoodCard({
  area,
  isSelected,
  onSelect
}: {
  area: AreaSummaryFeature;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const p = area.properties;
  const character = neighborhoodCharacter(p);

  // Normalize signals to 0–100 for mini bars
  const reinvestPct = Math.min(100, Math.round((p.remodelPercent / 35) * 100));
  const stabilityPct = Math.max(0, Math.min(100, 100 - p.soldLastThreeYearsPercent * 4));
  const prewarPct = Math.min(100, p.olderHomePercent);

  return (
    <button
      type="button"
      className={`nbr-card${isSelected ? " is-active" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="nbr-card-top">
        <div className="nbr-name-row">
          {p.displayColor && (
            <span className="nbr-dot" style={{ background: p.displayColor }} aria-hidden="true" />
          )}
          <span className="nbr-name">{p.label}</span>
          {p.peakDecade && <span className="nbr-era-chip">{p.peakDecade}</span>}
        </div>
        <div className="nbr-character-row">
          <span className="nbr-character-label">{character.label}</span>
          <span className="nbr-homes">{p.parcelCount.toLocaleString()} homes</span>
        </div>
      </div>
      <div className="nbr-signals">
        <MiniBar label="Reinvesting" pct={reinvestPct} value={`${p.remodelPercent}%`} />
        <MiniBar label="Staying put" pct={stabilityPct} value={`${Math.max(0, 100 - p.soldLastThreeYearsPercent * 4)}%`} />
        <MiniBar label="Pre-war homes" pct={prewarPct} value={`${p.olderHomePercent}%`} />
      </div>
    </button>
  );
}

// ─── Area list (wards / change zones) ───────────────────────────────────────

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
  const p = area.properties;
  const character = p.grouping === "neighborhoods" ? neighborhoodCharacter(p) : null;

  return (
    <div className="area-readout">
      <div className="area-readout-header">
        <div>
          <h3>{p.label}</h3>
          {p.medianYearBuilt && (
            <span className="area-readout-era">
              {p.peakDecade ? `${p.peakDecade} peak · ` : ""}Median year built: {p.medianYearBuilt}
            </span>
          )}
        </div>
        {character && (
          <div className="area-character-badge">
            <strong>{character.label}</strong>
            <span>{character.description}</span>
          </div>
        )}
      </div>
      <p className="area-readout-eval">{p.evaluation || p.description}</p>
      <div className={`area-change-story change-story-${p.changeStoryType}`}>
        <strong>{p.changeStoryLabel}</strong>
        <span>{p.changeStoryRead}</span>
      </div>
      <details className="area-stats-disclosure">
        <summary>Data details</summary>
        <dl className="detail-list cluster-detail-list">
          <div><dt>Homes</dt><dd>{p.parcelCount.toLocaleString()}</dd></div>
          <div><dt>Remodeling</dt><dd>{countAndPercent(p.remodelCount, p.remodelPercent)}</dd></div>
          <div><dt>Pre-war homes</dt><dd>{countAndPercent(p.olderHomeCount, p.olderHomePercent)}</dd></div>
          <div><dt>Rebuild signals</dt><dd>{countAndPercent(p.teardownPressureCount, p.teardownPressurePercent)}</dd></div>
          <div><dt>Sold recently</dt><dd>{countAndPercent(p.soldLastThreeYearsCount, p.soldLastThreeYearsPercent)}</dd></div>
          <div><dt>Source</dt><dd>{p.sourceLabel}</dd></div>
        </dl>
      </details>
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

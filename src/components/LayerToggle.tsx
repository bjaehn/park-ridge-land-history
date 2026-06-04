import {
  permitPressureMapModeLabels,
  permitPressureWindowLabels,
  type PermitPressureMapMode,
  type PermitPressureWindow
} from "../lib/permitPressure";

type LayerToggleProps = {
  showOutlines: boolean;
  showBoundary: boolean;
  showPermitPressure: boolean;
  showHotspots: boolean;
  permitPressureWindow: PermitPressureWindow;
  permitPressureMapMode: PermitPressureMapMode;
  onSetShowOutlines: (show: boolean) => void;
  onSetShowBoundary: (show: boolean) => void;
  onSetShowPermitPressure: (show: boolean) => void;
  onSetShowHotspots: (show: boolean) => void;
  onSetPermitPressureWindow: (window: PermitPressureWindow) => void;
  onSetPermitPressureMapMode: (mode: PermitPressureMapMode) => void;
};

export function LayerToggle({
  showOutlines,
  showBoundary,
  showPermitPressure,
  showHotspots,
  permitPressureWindow,
  permitPressureMapMode,
  onSetShowOutlines,
  onSetShowBoundary,
  onSetShowPermitPressure,
  onSetShowHotspots,
  onSetPermitPressureWindow,
  onSetPermitPressureMapMode
}: LayerToggleProps) {
  return (
    <section className="panel-section" aria-label="Layer controls">
      <h2>Layers</h2>
      <div className="layer-control-group">
        <label className="check-row check-row-strong">
          <input
            type="checkbox"
            checked={showPermitPressure}
            onChange={(event) => onSetShowPermitPressure(event.target.checked)}
          />
          <span>Permit pressure</span>
        </label>
        <label className="select-control">
          <span>Permit view</span>
          <select
            value={permitPressureMapMode}
            onChange={(event) => onSetPermitPressureMapMode(parsePermitPressureMapMode(event.target.value))}
          >
            {Object.entries(permitPressureMapModeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>Permit window</span>
          <select
            value={String(permitPressureWindow)}
            onChange={(event) => onSetPermitPressureWindow(parsePermitPressureWindow(event.target.value))}
          >
            {Object.entries(permitPressureWindowLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="check-row check-row-strong">
        <input
          type="checkbox"
          checked={showHotspots}
          onChange={(event) => onSetShowHotspots(event.target.checked)}
        />
        <span>Teardown and trend clusters</span>
      </label>
      <label className="check-row check-row-strong">
        <input
          type="checkbox"
          checked={showOutlines}
          onChange={(event) => onSetShowOutlines(event.target.checked)}
        />
        <span>Parcel outlines</span>
      </label>
      <label className="check-row check-row-strong">
        <input
          type="checkbox"
          checked={showBoundary}
          onChange={(event) => onSetShowBoundary(event.target.checked)}
        />
        <span>Park Ridge boundary</span>
      </label>
    </section>
  );
}

function parsePermitPressureMapMode(value: string): PermitPressureMapMode {
  return value === "activity" ? "activity" : "stability";
}

function parsePermitPressureWindow(value: string): PermitPressureWindow {
  if (value === "1" || value === "5" || value === "10") return Number(value) as PermitPressureWindow;
  return "all";
}

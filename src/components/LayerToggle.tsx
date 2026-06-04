import { permitPressureWindowLabels, type PermitPressureWindow } from "../lib/permitPressure";

type LayerToggleProps = {
  showOutlines: boolean;
  showBoundary: boolean;
  showPermitPressure: boolean;
  permitPressureWindow: PermitPressureWindow;
  onSetShowOutlines: (show: boolean) => void;
  onSetShowBoundary: (show: boolean) => void;
  onSetShowPermitPressure: (show: boolean) => void;
  onSetPermitPressureWindow: (window: PermitPressureWindow) => void;
};

export function LayerToggle({
  showOutlines,
  showBoundary,
  showPermitPressure,
  permitPressureWindow,
  onSetShowOutlines,
  onSetShowBoundary,
  onSetShowPermitPressure,
  onSetPermitPressureWindow
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

function parsePermitPressureWindow(value: string): PermitPressureWindow {
  if (value === "1" || value === "5" || value === "10") return Number(value) as PermitPressureWindow;
  return "all";
}

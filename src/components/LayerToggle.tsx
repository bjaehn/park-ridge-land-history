type LayerToggleProps = {
  showOutlines: boolean;
  showBoundary: boolean;
  onSetShowOutlines: (show: boolean) => void;
  onSetShowBoundary: (show: boolean) => void;
};

export function LayerToggle({
  showOutlines,
  showBoundary,
  onSetShowOutlines,
  onSetShowBoundary
}: LayerToggleProps) {
  return (
    <section className="panel-section" aria-label="Layer controls">
      <h2>Layers</h2>
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

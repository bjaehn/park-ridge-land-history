type OpacitySliderProps = {
  layerId: string;
  value: number;
  onChange: (value: number) => void;
};

export function OpacitySlider({ layerId, value, onChange }: OpacitySliderProps) {
  const percent = Math.round(value * 100);

  return (
    <label className="opacity-control" htmlFor={`opacity-${layerId}`}>
      <span>Opacity {percent}%</span>
      <input
        id={`opacity-${layerId}`}
        type="range"
        min={15}
        max={100}
        step={5}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  );
}

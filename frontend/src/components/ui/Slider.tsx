interface SliderProps {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  colorClassName?: string;
  onChange: (value: number) => void;
}

export default function Slider({
  label,
  value,
  unit = "%",
  min = 0,
  max = 100,
  disabled,
  colorClassName = "bg-indigo-500",
  onChange,
}: SliderProps) {
  return (
    <div className={`mb-6 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex justify-between text-[10px] text-gray-500 mb-2">
        <span>{label}</span>
        <span className="text-white font-mono">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative h-1.5 bg-gray-800 rounded-full">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className={`h-full rounded-full ${colorClassName}`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

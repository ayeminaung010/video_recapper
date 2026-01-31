interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export default function SliderRow({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: SliderRowProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <p className="text-sm font-semibold text-white">
          {value}
          {unit}
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="mt-4 w-full accent-indigo-500"
      />
    </div>
  );
}

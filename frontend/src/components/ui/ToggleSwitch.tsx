interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (nextValue: boolean) => void;
}

export default function ToggleSwitch({
  label,
  checked,
  onChange,
}: ToggleSwitchProps) {
  return (
    <label className="flex items-center gap-3 text-sm text-slate-300">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
          checked
            ? "border-indigo-400 bg-indigo-500/70"
            : "border-slate-700 bg-slate-800"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

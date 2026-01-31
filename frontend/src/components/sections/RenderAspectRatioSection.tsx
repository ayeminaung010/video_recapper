import type { AspectRatioOption } from "@/lib/options";
import SectionCard from "../ui/SectionCard";

interface AspectRatioMeta {
  value: AspectRatioOption;
  label: string;
  detail: string;
  ratio: string;
}

interface RenderAspectRatioSectionProps {
  aspectRatio: AspectRatioOption;
  options: ReadonlyArray<AspectRatioMeta>;
  ratioMeta?: AspectRatioMeta;
  onAspectRatioChange: (value: AspectRatioOption) => void;
}

export default function RenderAspectRatioSection({
  aspectRatio,
  options,
  ratioMeta,
  onAspectRatioChange,
}: RenderAspectRatioSectionProps) {
  return (
    <SectionCard
      title="Render Aspect Ratio"
      description="Match platform specifications for clean delivery."
    >
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div>
          <label className="text-sm font-medium text-slate-300">
            Aspect Ratio
          </label>
          <select
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={aspectRatio}
            onChange={(event) =>
              onAspectRatioChange(event.target.value as AspectRatioOption)
            }
          >
            {options.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm font-medium text-slate-300">Output Detail</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {ratioMeta?.ratio}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {ratioMeta?.detail}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

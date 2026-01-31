import type { AspectRatioOption } from "@/lib/options";

interface RenderAspectRatioSectionProps {
  aspectRatio: AspectRatioOption;
  options: ReadonlyArray<{ value: AspectRatioOption; label: string }>;
  onAspectRatioChange: (value: AspectRatioOption) => void;
}

export default function RenderAspectRatioSection({
  aspectRatio,
  options,
  onAspectRatioChange,
}: RenderAspectRatioSectionProps) {
  return (
    <section className="bg-[#0f111d] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-tighter">
          Render Aspect Ratio
        </h3>
      </div>
      <select
        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500"
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
    </section>
  );
}

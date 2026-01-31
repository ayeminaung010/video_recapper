import type { PositionOption } from "@/lib/options";
import SectionCard from "../ui/SectionCard";

interface BrandLogoOverlaySectionProps {
  logoFileName: string | null;
  logoPosition: PositionOption;
  positions: PositionOption[];
  onLogoFileChange: (fileName: string | null) => void;
  onLogoPositionChange: (position: PositionOption) => void;
}

export default function BrandLogoOverlaySection({
  logoFileName,
  logoPosition,
  positions,
  onLogoFileChange,
  onLogoPositionChange,
}: BrandLogoOverlaySectionProps) {
  return (
    <SectionCard
      title="Brand Logo Overlay"
      description="Apply channel branding across the recap."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4">
          <p className="text-sm font-medium text-slate-300">Upload Logo</p>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-6 text-center transition hover:border-slate-600">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Drop or browse
            </span>
            <span className="mt-2 text-sm text-slate-300">
              {logoFileName ?? "PNG or SVG up to 5MB"}
            </span>
            <input
              type="file"
              accept="image/png,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                onLogoFileChange(file ? file.name : null);
              }}
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <label className="text-sm font-medium text-slate-300">
            Logo Position
          </label>
          <select
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={logoPosition}
            onChange={(event) =>
              onLogoPositionChange(event.target.value as PositionOption)
            }
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-slate-500">
            Selected: <span className="text-slate-200">{logoPosition}</span>
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

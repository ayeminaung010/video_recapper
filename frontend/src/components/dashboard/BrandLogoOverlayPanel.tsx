import { Image as ImageIcon, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import type { PositionOption } from "@/lib/options";

interface BrandLogoOverlayPanelProps {
  logoFile: File | null;
  logoPosition: PositionOption;
  positions: PositionOption[];
  onLogoFileChange: (file: File | null) => void;
  onLogoPositionChange: (value: PositionOption) => void;
}

export default function BrandLogoOverlayPanel({
  logoFile,
  logoPosition,
  positions,
  onLogoFileChange,
  onLogoPositionChange,
}: BrandLogoOverlayPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile]);

  return (
    <section className="bg-[#0f111d] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-tighter mb-4">
        Brand Logo Overlay
      </h3>
      <div className="flex items-start gap-4">
        <input
          id="logo-upload"
          type="file"
          className="hidden"
          accept="image/png,image/svg+xml"
          onChange={(event) => onLogoFileChange(event.target.files?.[0] ?? null)}
        />
        <label
          htmlFor="logo-upload"
          className="relative w-20 h-24 bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 overflow-hidden"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Logo preview"
              className="h-full w-full object-contain p-2"
            />
          ) : logoFile ? (
            <ImageIcon className="text-green-500" size={24} />
          ) : (
            <Upload className="text-gray-600" size={20} />
          )}
          {previewUrl ? (
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] text-gray-200">
              Preview
            </span>
          ) : null}
        </label>
        <div className="flex-1">
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none mb-2"
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
          {logoFile ? (
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Selected: <span className="text-gray-200">{logoFile.name}</span>
            </p>
          ) : null}
          <p className="text-[10px] text-gray-500 leading-relaxed italic">
            Transparent PNG သုံးရန် အကြံပြုပါသည်။
          </p>
        </div>
      </div>
    </section>
  );
}

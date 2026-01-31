import Slider from "@/components/ui/Slider";
import Toggle from "@/components/ui/Toggle";

interface FilmstripBlurPanelProps {
  enabled: boolean;
  position: number;
  thickness: number;
  intensity: number;
  onToggle: () => void;
  onPositionChange: (value: number) => void;
  onThicknessChange: (value: number) => void;
  onIntensityChange: (value: number) => void;
}

export default function FilmstripBlurPanel({
  enabled,
  position,
  thickness,
  intensity,
  onToggle,
  onPositionChange,
  onThicknessChange,
  onIntensityChange,
}: FilmstripBlurPanelProps) {
  return (
    <section className="bg-[#0f111d] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-tighter">
          Filmstrip Blur
        </h3>
        <Toggle active={enabled} onClick={onToggle} />
      </div>

      <Slider
        label="POSITION"
        value={position}
        onChange={onPositionChange}
        colorClassName="bg-indigo-500"
        disabled={!enabled}
      />
      <Slider
        label="THICKNESS"
        value={thickness}
        onChange={onThicknessChange}
        colorClassName="bg-white"
        disabled={!enabled}
      />
      <Slider
        label="INTENSITY"
        value={intensity}
        onChange={onIntensityChange}
        colorClassName="bg-indigo-500"
        disabled={!enabled}
      />
    </section>
  );
}

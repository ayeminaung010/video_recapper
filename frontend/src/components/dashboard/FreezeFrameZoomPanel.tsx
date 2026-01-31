import Slider from "@/components/ui/Slider";
import Toggle from "@/components/ui/Toggle";

interface FreezeFrameZoomPanelProps {
  enabled: boolean;
  interval: number;
  duration: number;
  onToggle: () => void;
  onIntervalChange: (value: number) => void;
  onDurationChange: (value: number) => void;
}

export default function FreezeFrameZoomPanel({
  enabled,
  interval,
  duration,
  onToggle,
  onIntervalChange,
  onDurationChange,
}: FreezeFrameZoomPanelProps) {
  return (
    <section className="bg-[#0f111d] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-tighter">
          Freeze Frame Zoom
        </h3>
        <Toggle active={enabled} onClick={onToggle} />
      </div>

      <Slider
        label="INTERVAL"
        value={interval}
        unit="S"
        max={30}
        onChange={onIntervalChange}
        colorClassName="bg-indigo-500"
        disabled={!enabled}
      />
      <Slider
        label="DURATION"
        value={duration}
        unit="S"
        max={10}
        onChange={onDurationChange}
        colorClassName="bg-indigo-500"
        disabled={!enabled}
      />
    </section>
  );
}

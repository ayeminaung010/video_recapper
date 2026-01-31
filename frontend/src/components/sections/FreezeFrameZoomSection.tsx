import SectionCard from "../ui/SectionCard";
import SliderRow from "../ui/SliderRow";
import ToggleSwitch from "../ui/ToggleSwitch";

interface FreezeFrameZoomSectionProps {
  enabled: boolean;
  interval: number;
  duration: number;
  onEnabledChange: (value: boolean) => void;
  onIntervalChange: (value: number) => void;
  onDurationChange: (value: number) => void;
}

export default function FreezeFrameZoomSection({
  enabled,
  interval,
  duration,
  onEnabledChange,
  onIntervalChange,
  onDurationChange,
}: FreezeFrameZoomSectionProps) {
  return (
    <SectionCard
      title="Freeze Frame Zoom"
      description="Pause and zoom on highlight moments for emphasis."
      action={
        <ToggleSwitch
          label={enabled ? "Enabled" : "Disabled"}
          checked={enabled}
          onChange={onEnabledChange}
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <SliderRow
          label="Interval"
          description="Seconds between freeze frames."
          value={interval}
          min={5}
          max={60}
          step={1}
          unit="s"
          disabled={!enabled}
          onChange={onIntervalChange}
        />
        <SliderRow
          label="Duration"
          description="Length of each freeze moment."
          value={duration}
          min={0.5}
          max={3}
          step={0.1}
          unit="s"
          disabled={!enabled}
          onChange={onDurationChange}
        />
      </div>
    </SectionCard>
  );
}

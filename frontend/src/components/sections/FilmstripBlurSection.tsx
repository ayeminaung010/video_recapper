import SectionCard from "../ui/SectionCard";
import SliderRow from "../ui/SliderRow";
import ToggleSwitch from "../ui/ToggleSwitch";

interface FilmstripBlurSectionProps {
  enabled: boolean;
  position: number;
  thickness: number;
  intensity: number;
  onEnabledChange: (value: boolean) => void;
  onPositionChange: (value: number) => void;
  onThicknessChange: (value: number) => void;
  onIntensityChange: (value: number) => void;
}

export default function FilmstripBlurSection({
  enabled,
  position,
  thickness,
  intensity,
  onEnabledChange,
  onPositionChange,
  onThicknessChange,
  onIntensityChange,
}: FilmstripBlurSectionProps) {
  return (
    <SectionCard
      title="Filmstrip Blur"
      description="Add cinematic border softening for a stylized recap."
      action={
        <ToggleSwitch
          label={enabled ? "Enabled" : "Disabled"}
          checked={enabled}
          onChange={onEnabledChange}
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <SliderRow
          label="Position"
          description="Where the blur band begins."
          value={position}
          min={0}
          max={40}
          step={1}
          unit="%"
          disabled={!enabled}
          onChange={onPositionChange}
        />
        <SliderRow
          label="Thickness"
          description="Depth of the blur band."
          value={thickness}
          min={5}
          max={40}
          step={1}
          unit="%"
          disabled={!enabled}
          onChange={onThicknessChange}
        />
        <SliderRow
          label="Intensity"
          description="Amount of blur applied."
          value={intensity}
          min={0}
          max={100}
          step={1}
          unit="%"
          disabled={!enabled}
          onChange={onIntensityChange}
        />
      </div>
    </SectionCard>
  );
}

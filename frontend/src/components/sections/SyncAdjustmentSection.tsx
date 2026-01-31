import SectionCard from "../ui/SectionCard";
import SliderRow from "../ui/SliderRow";

interface SyncAdjustmentSectionProps {
  videoSpeed: number;
  audioSpeed: number;
  targetDuration: number;
  actualDuration: number;
  onVideoSpeedChange: (value: number) => void;
  onAudioSpeedChange: (value: number) => void;
  onTargetDurationChange: (value: number) => void;
  onActualDurationChange: (value: number) => void;
}

export default function SyncAdjustmentSection({
  videoSpeed,
  audioSpeed,
  targetDuration,
  actualDuration,
  onVideoSpeedChange,
  onAudioSpeedChange,
  onTargetDurationChange,
  onActualDurationChange,
}: SyncAdjustmentSectionProps) {
  return (
    <SectionCard
      title="Sync Adjustment"
      description="Fine tune pacing to align visuals with narration and music."
      action={
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Duration
          </p>
          <p className="text-sm text-slate-300">
            Target: <span className="text-white">{targetDuration}s</span>
          </p>
          <p className="text-sm text-slate-300">
            Actual: <span className="text-white">{actualDuration}s</span>
          </p>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <SliderRow
          label="Video Speed"
          description="Playback rate for visual montage."
          value={videoSpeed}
          min={0.7}
          max={1.6}
          step={0.01}
          unit="x"
          onChange={onVideoSpeedChange}
        />
        <SliderRow
          label="Audio Speed"
          description="Pitch-safe time stretch for soundtrack."
          value={audioSpeed}
          min={0.8}
          max={1.3}
          step={0.01}
          unit="x"
          onChange={onAudioSpeedChange}
        />
        <SliderRow
          label="Target Duration"
          description="Desired final recap length."
          value={targetDuration}
          min={30}
          max={180}
          step={1}
          unit="s"
          onChange={onTargetDurationChange}
        />
        <SliderRow
          label="Actual Duration"
          description="Estimated output after all effects."
          value={actualDuration}
          min={30}
          max={180}
          step={1}
          unit="s"
          onChange={onActualDurationChange}
        />
      </div>
    </SectionCard>
  );
}

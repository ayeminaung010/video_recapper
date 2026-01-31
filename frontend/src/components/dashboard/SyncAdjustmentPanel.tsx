interface SyncAdjustmentPanelProps {
  videoSpeed: number;
  audioSpeed: number;
  videoOutput: string;
  audioOutput: string;
  onVideoSpeedChange: (value: number) => void;
  onAudioSpeedChange: (value: number) => void;
}

export default function SyncAdjustmentPanel({
  videoSpeed,
  audioSpeed,
  videoOutput,
  audioOutput,
  onVideoSpeedChange,
  onAudioSpeedChange,
}: SyncAdjustmentPanelProps) {
  return (
    <section className="bg-[#0f111d] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-tighter">
          Sync Adjustment
        </h3>
        <button
          type="button"
          className="text-[10px] bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30"
        >
          AUTO MATCH VIDEO: {videoSpeed}X
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] text-gray-500 block mb-2 uppercase">
            Video Speed
          </label>
          <input
            type="number"
            value={videoSpeed}
            min={0.25}
            max={5}
            step={0.001}
            onChange={(event) => onVideoSpeedChange(Number(event.target.value))}
            className="w-full bg-gray-900 p-3 rounded-lg border border-gray-800 text-center font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-2 uppercase">
            Audio Speed
          </label>
          <input
            type="number"
            value={audioSpeed}
            min={0.25}
            max={5}
            step={0.001}
            onChange={(event) => onAudioSpeedChange(Number(event.target.value))}
            className="w-full bg-gray-900 p-3 rounded-lg border border-gray-800 text-center font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
        <div>
          VIDEO OUTPUT <br />
          <span className="text-indigo-400">{videoOutput}</span>
        </div>
        <div className="text-right">
          AUDIO OUTPUT <br />
          <span className="text-green-400">{audioOutput}</span>
        </div>
      </div>
    </section>
  );
}

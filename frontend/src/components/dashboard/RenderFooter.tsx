import { AlertCircle } from "lucide-react";

interface RenderFooterProps {
  isRendering: boolean;
  progress: number;
  status: string;
  errorMessage?: string | null;
  downloadUrl?: string | null;
  onStartRender: () => void;
}

export default function RenderFooter({
  isRendering,
  progress,
  status,
  errorMessage,
  downloadUrl,
  onStartRender,
}: RenderFooterProps) {
  return (
    <div className="mt-12 text-center pb-20">
      {isRendering ? (
        <div className="w-full">
          <div className="h-2 w-full bg-gray-800 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-indigo-400 text-sm animate-pulse">{status}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={onStartRender}
            className="group relative w-full py-5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white font-bold text-xl uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 transition-all active:scale-95"
          >
            Start Render (26 CRD)
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
          </button>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              className="inline-flex items-center justify-center w-full py-3 rounded-xl border border-indigo-500/40 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/10 transition"
            >
              Download Rendered Video
            </a>
          ) : null}
          {errorMessage ? (
            <p className="text-sm text-red-400">{errorMessage}</p>
          ) : null}
        </div>
      )}
      <p className="mt-6 text-gray-500 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
        <AlertCircle size={12} /> Processing may take 3-5 minutes depending on
        movie duration
      </p>
    </div>
  );
}

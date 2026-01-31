"use client";

import {
    CheckCircle2,
    Clock,
    FileSearch,
    FileText,
    Loader2,
    Upload,
    Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import SectionCard from "@/components/ui/SectionCard";

interface CaptionEntry {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface SrtFinderSectionProps {
  apiBaseUrl: string;
}

const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "my", label: "Burmese" },
  { value: "id", label: "Indonesian" },
  { value: "th", label: "Thai" },
  { value: "vi", label: "Vietnamese" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const formatTimestamp = (seconds: number) => {
  const rounded = Math.max(0, seconds);
  const hrs = Math.floor(rounded / 3600)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor((rounded % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(rounded % 60)
    .toString()
    .padStart(2, "0");
  const ms = Math.floor((rounded - Math.floor(rounded)) * 1000)
    .toString()
    .padStart(3, "0");
  return `${hrs}:${mins}:${secs},${ms}`;
};

export default function SrtFinderSection({ apiBaseUrl }: SrtFinderSectionProps) {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [status, setStatus] = useState("Upload MP4 or MP3 to begin.");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const [originalLanguage, setOriginalLanguage] = useState("my");
  const [targetLanguage, setTargetLanguage] = useState("my");

  const hasCaptions = captions.length > 0;

  const fileLabel = useMemo(() => {
    if (!mediaFile) return "Video or audio";
    return mediaFile.name;
  }, [mediaFile]);

  const uploadMedia = async (file: File) => {
    setIsUploading(true);
    setStatus("Uploading media...");
    setError(null);
    setMediaId(null);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(`${apiBaseUrl}/srt-finder/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed.");
      }

      const data = (await response.json()) as { video_id: string };
      setMediaId(data.video_id);
      setStatus("Upload complete. Ready to find SRT.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setStatus(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (file: File | null) => {
    setMediaFile(file);
    setCaptions([]);
    setStatus("Upload MP4 or MP3 to begin.");
    setProgress(0);
    setJobId(null);
    setError(null);

    if (file) {
      void uploadMedia(file);
    }
  };

  const handleFind = async () => {
    if (!mediaId) {
      alert("Please upload a video or audio file first.");
      return;
    }

    setIsFinding(true);
    setProgress(8);
    setStatus("Queued transcription job...");
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/srt-finder/transcribe-async`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: mediaId,
          model: "large-v3",
          language: originalLanguage,
          target_language: targetLanguage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Transcription failed.");
      }

      const data = (await response.json()) as { job_id: string };
      setJobId(data.job_id);
      setStatus("Finding speech segments and syncing...");

      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }

      pollRef.current = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${apiBaseUrl}/srt-finder/transcribe-status/${data.job_id}`
          );

          if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            throw new Error(errorText || "Failed to fetch status.");
          }

          const statusData = (await statusResponse.json()) as {
            status: string;
            progress: number;
            captions?: CaptionEntry[] | null;
            error?: string | null;
          };

          setProgress(statusData.progress ?? 0);
          setStatus(`Status: ${statusData.status}`);

          if (statusData.status === "completed") {
            setCaptions(statusData.captions ?? []);
            setStatus("SRT ready. Preview below.");
            setProgress(100);
            setIsFinding(false);
            if (pollRef.current) {
              window.clearInterval(pollRef.current);
            }
          }

          if (statusData.status === "failed") {
            const errorMessage = statusData.error || "Transcription failed.";
            setError(errorMessage);
            setStatus(errorMessage);
            setIsFinding(false);
            if (pollRef.current) {
              window.clearInterval(pollRef.current);
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unexpected error.";
          setError(message);
          setStatus(message);
          setIsFinding(false);
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
          }
        }
      }, 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setStatus(message);
      setProgress(0);
      setIsFinding(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  const handleExport = async () => {
    if (!captions.length) {
      alert("Generate captions before exporting.");
      return;
    }

    setIsExporting(true);
    setStatus("Building SRT file...");
    setError(null);

    const name = mediaFile?.name?.replace(/\.[^/.]+$/, "") ?? "transcript";
    const fileName = `${name}.${targetLanguage}.srt`;

    try {
      const response = await fetch(`${apiBaseUrl}/srt-finder/srt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captions,
          file_name: fileName,
          language: originalLanguage,
          target_language: targetLanguage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "SRT export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("SRT exported.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setStatus(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-200 text-xs font-semibold w-fit">
          <FileSearch size={14} /> SRT Finder
        </div>
        <h1 className="text-3xl font-bold text-white">Find & Export Subtitles</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Drop a video or MP3, let Whisper align speech, and download a clean SRT
          file ready for editors or social uploads.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-8">
        <div className="space-y-6">
          <SectionCard
            title="Upload"
            description="Accepts MP4, MOV, or MP3."
          >
            <div
              className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-950/40 hover:border-indigo-500 transition cursor-pointer"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0] ?? null;
                handleDrop(file);
              }}
            >
              <input
                id="srt-finder-upload"
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(event) => handleDrop(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="srt-finder-upload"
                className="flex flex-col items-center gap-3 text-slate-400"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center">
                  <Upload className="text-indigo-300" size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drag & drop media
                  </p>
                  <p className="text-xs">or click to browse</p>
                </div>
                <span className="text-xs text-slate-300 truncate max-w-[240px]">
                  {fileLabel}
                </span>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Find SRT"
            description="Run Whisper to locate speech segments."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">
                    Original language
                  </label>
                  <div className="bg-[#0a0b14] border border-slate-800 rounded-xl px-3 py-2">
                    <select
                      value={originalLanguage}
                      onChange={(event) => setOriginalLanguage(event.target.value)}
                      className="w-full bg-transparent text-sm text-slate-100 outline-none"
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-[#0a0b14]">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">
                    Export SRT language
                  </label>
                  <div className="bg-[#0a0b14] border border-slate-800 rounded-xl px-3 py-2">
                    <select
                      value={targetLanguage}
                      onChange={(event) => setTargetLanguage(event.target.value)}
                      className="w-full bg-transparent text-sm text-slate-100 outline-none"
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-[#0a0b14]">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFind}
                disabled={isFinding || isUploading || !mediaId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {isFinding ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {isFinding ? "Processing..." : "Find Subtitles"}
              </button>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{status}</p>
              {error ? (
                <p className="text-xs text-red-400">{error}</p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Export"
            description="Download aligned SRT once captions are ready."
          >
            <button
              type="button"
              onClick={handleExport}
              disabled={!hasCaptions || isExporting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 px-4 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10 disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {isExporting ? "Exporting..." : "Download SRT"}
            </button>
            <p className="text-[11px] text-slate-500 mt-2">
              Uses the same Whisper pipeline as Transcribe but tuned for subtitle-ready timestamps.
            </p>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="SRT Preview"
            description="Review timings before download."
            action={
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={14} />
                {progress}%
              </div>
            }
          >
            <div className="max-h-[520px] overflow-y-auto space-y-3 pr-2">
              {captions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No captions yet. Upload media and click Find Subtitles.
                </p>
              ) : (
                captions.map((caption) => (
                  <div
                    key={caption.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                  >
                    <div className="text-[10px] text-slate-400">
                      {formatTimestamp(caption.start)} →
                      {formatTimestamp(caption.end)}
                    </div>
                    <p className="mt-1 text-sm text-slate-100">{caption.text}</p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Pipeline"
            description="What happens under the hood"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {["Upload", "Detect", "Export"].map((step, index) => (
                <div
                  key={step}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Step {index + 1}
                  </div>
                  <p className="text-slate-100 font-semibold">{step}</p>
                  <p className="text-[12px] text-slate-400">
                    {step === "Upload"
                      ? "Send media to the FastAPI backend for preprocessing."
                      : step === "Detect"
                        ? "Whisper segments speech, aligns timestamps, and generates caption entries."
                        : "We package captions as SRT with millisecond precision ready to download."}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

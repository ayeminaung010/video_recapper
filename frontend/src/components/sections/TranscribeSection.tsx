"use client";

import { FileText, Upload, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import SectionCard from "@/components/ui/SectionCard";

interface CaptionEntry {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface TranscribeSectionProps {
  apiBaseUrl: string;
}

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

export default function TranscribeSection({ apiBaseUrl }: TranscribeSectionProps) {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [status, setStatus] = useState("Upload a video or audio file.");
  const [progress, setProgress] = useState(0);
  const [transcribeJobId, setTranscribeJobId] = useState<string | null>(null);

  const hasCaptions = captions.length > 0;

  const fileLabel = useMemo(() => {
    if (!mediaFile) {
      return "Video or audio file";
    }
    return mediaFile.name;
  }, [mediaFile]);

  const uploadMedia = async (file: File) => {
    setIsUploading(true);
    setStatus("Uploading media...");
    setMediaId(null);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(`${apiBaseUrl}/captioner/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed.");
      }

      const data = (await response.json()) as { video_id: string };
      setMediaId(data.video_id);
      setStatus("Upload complete. Ready to transcribe.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected upload error.";
      setStatus(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (file: File | null) => {
    setMediaFile(file);
    setCaptions([]);
    setProgress(0);
    setStatus("Upload a video or audio file.");
    setTranscribeJobId(null);

    if (file) {
      void uploadMedia(file);
    }
  };

  const handleTranscribe = async () => {
    if (!mediaId) {
      alert("Please upload a file first.");
      return;
    }

    setIsTranscribing(true);
    setProgress(5);
    setStatus("Queued transcription job...");

    try {
      const response = await fetch(`${apiBaseUrl}/captioner/transcribe-async`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: mediaId, model: "medium" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Transcription failed.");
      }

      const data = (await response.json()) as { job_id: string };
      setTranscribeJobId(data.job_id);
      setStatus("Transcribing with Whisper... please wait.");

      const pollInterval = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${apiBaseUrl}/captioner/transcribe-status/${data.job_id}`
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

          if (statusData.status === "completed") {
            setCaptions(statusData.captions ?? []);
            setStatus("Transcription complete.");
            setProgress(100);
            setIsTranscribing(false);
            window.clearInterval(pollInterval);
          }

          if (statusData.status === "failed") {
            setStatus(statusData.error || "Transcription failed.");
            setIsTranscribing(false);
            window.clearInterval(pollInterval);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unexpected error.";
          setStatus(message);
          setIsTranscribing(false);
          window.clearInterval(pollInterval);
        }
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error.";
      setStatus(message);
      setProgress(0);
    } finally {
      setIsTranscribing((prev) => prev);
    }
  };

  const handleDownload = async () => {
    if (!captions.length) {
      return;
    }

    const name = mediaFile?.name?.replace(/\.[^/.]+$/, "") ?? "transcript";
    try {
      const response = await fetch(`${apiBaseUrl}/captioner/srt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions, file_name: `${name}.srt` }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "SRT export failed.");
      }

      const content = await response.text();
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}.srt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected export error.";
      setStatus(message);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Transcribe to SRT</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Upload a video or audio file, generate Burmese transcripts, and export
          an SRT file for subtitles.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
        <div className="space-y-6">
          <SectionCard
            title="Import Media"
            description="Drag & drop video/audio to begin transcription."
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
                id="transcribe-upload"
                type="file"
                accept="video/*,audio/*"
                className="hidden"
                onChange={(event) =>
                  handleDrop(event.target.files?.[0] ?? null)
                }
              />
              <label
                htmlFor="transcribe-upload"
                className="flex flex-col items-center gap-3 text-slate-400"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center">
                  <Upload className="text-indigo-300" size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drag & drop files
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
            title="Transcription"
            description="Run Whisper to generate Burmese captions."
          >
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleTranscribe}
                disabled={isTranscribing || isUploading || !mediaId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                <Wand2 size={16} />
                {isTranscribing ? "Transcribing..." : "Generate Transcript"}
              </button>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{status}</p>
            </div>
          </SectionCard>

          <SectionCard
            title="Export"
            description="Download an SRT subtitle file."
          >
            <button
              type="button"
              onClick={handleDownload}
              disabled={!hasCaptions}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 px-4 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10 disabled:opacity-50"
            >
              <FileText size={16} /> Export SRT
            </button>
          </SectionCard>
        </div>

        <SectionCard
          title="Transcript Preview"
          description="Review the generated captions before exporting."
        >
          <div className="max-h-[520px] overflow-y-auto space-y-3 pr-2">
            {captions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No captions yet. Upload a file and click Generate Transcript.
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
                  <p className="mt-1 text-sm text-slate-100">
                    {caption.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

"use client";

import { Clock, Download, Edit3, Upload, Video, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import SectionCard from "@/components/ui/SectionCard";

interface CaptionEntry {
  id: string;
  start: number;
  end: number;
  text: string;
}

const formatTimestamp = (seconds: number) => {
  const rounded = Math.max(0, seconds);
  const mins = Math.floor(rounded / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(rounded % 60)
    .toString()
    .padStart(2, "0");
  const ms = Math.floor((rounded - Math.floor(rounded)) * 1000)
    .toString()
    .padStart(3, "0");
  return `${mins}:${secs}.${ms}`;
};

interface AutoCaptionerSectionProps {
  apiBaseUrl: string;
}

export default function AutoCaptionerSection({
  apiBaseUrl,
}: AutoCaptionerSectionProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] =
    useState<string | null>(null);
  const [activeCaptionId, setActiveCaptionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready to caption.");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("Ready to export.");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoFile) {
      setVideoUrl(null);
      return;
    }

    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const selectedCaption = useMemo(
    () => captions.find((caption) => caption.id === selectedCaptionId) ?? null,
    [captions, selectedCaptionId]
  );

  const activeCaption = useMemo(
    () => captions.find((caption) => caption.id === activeCaptionId) ?? null,
    [captions, activeCaptionId]
  );

  const uploadVideo = async (file: File) => {
    setIsUploading(true);
    setStatus("Uploading video...");
    setVideoId(null);

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
      setVideoId(data.video_id);
      setStatus("Upload complete. Ready to caption.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected upload error.";
      setStatus(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (file: File | null) => {
    setVideoFile(file);
    setCaptions([]);
    setSelectedCaptionId(null);
    setActiveCaptionId(null);
    setProgress(0);
    setDownloadUrl(null);
    setVideoId(null);
    setExportProgress(0);
    setExportStatus("Ready to export.");
    setStatus("Ready to caption.");

    if (file) {
      void uploadVideo(file);
    }
  };

  const handleCaption = async () => {
    if (!videoFile || !videoId) {
      alert("ကျေးဇူးပြု၍ MP4 ဗီဒီယိုဖိုင်ကို အရင်တင်ပါ။");
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setStatus("Analyzing audio and generating captions...");

    const progressTimer = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 6, 85));
    }, 700);

    try {
      const response = await fetch(`${apiBaseUrl}/captioner/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, model: "medium" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Transcription failed.");
      }

      const data = (await response.json()) as {
        captions: CaptionEntry[];
        device: string;
      };
      setCaptions(data.captions);
      setSelectedCaptionId(data.captions[0]?.id ?? null);
      setStatus(`Captions generated (${data.device}). Edit and fine-tune below.`);
      setProgress(100);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected caption error.";
      setStatus(message);
      setProgress(0);
    } finally {
      window.clearInterval(progressTimer);
      setIsProcessing(false);
    }
  };

  const handleTimeUpdate = () => {
    const current = videoRef.current?.currentTime ?? 0;
    const match = captions.find(
      (caption) => current >= caption.start && current <= caption.end
    );
    setActiveCaptionId(match?.id ?? null);
  };

  const handleCaptionClick = (caption: CaptionEntry) => {
    if (videoRef.current) {
      videoRef.current.currentTime = caption.start + 0.01;
      videoRef.current.play().catch(() => undefined);
    }
    setSelectedCaptionId(caption.id);
  };

  const updateCaptionText = (text: string) => {
    if (!selectedCaption) {
      return;
    }

    setCaptions((prev) =>
      prev.map((caption) =>
        caption.id === selectedCaption.id ? { ...caption, text } : caption
      )
    );
  };

  const handleExport = async () => {
    if (!videoId || captions.length === 0) {
      alert("အရင် caption ကို စစ်ပြီး Export ပြုလုပ်ပါ။");
      return;
    }

    setIsExporting(true);
    setExportStatus("Sending render job to backend...");
    setExportProgress(10);

    try {
      const response = await fetch(`${apiBaseUrl}/captioner/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, captions }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Export failed.");
      }

      const data = (await response.json()) as { job_id: string };

      const pollInterval = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${apiBaseUrl}/captioner/status/${data.job_id}`
          );
          if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            throw new Error(errorText || "Failed to fetch status.");
          }

          const statusData = (await statusResponse.json()) as {
            status: string;
            progress: number;
            output_url?: string | null;
            error?: string | null;
          };

          setExportProgress(statusData.progress ?? 0);
          if (statusData.status === "completed" && statusData.output_url) {
            setDownloadUrl(`${apiBaseUrl}${statusData.output_url}`);
            setExportStatus("Export complete. Ready to download.");
            setIsExporting(false);
            window.clearInterval(pollInterval);
          }

          if (statusData.status === "failed") {
            setExportStatus(statusData.error || "Export failed.");
            setIsExporting(false);
            window.clearInterval(pollInterval);
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unexpected export error.";
          setExportStatus(message);
          setIsExporting(false);
          window.clearInterval(pollInterval);
        }
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected export error.";
      setExportStatus(message);
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">
          AI Video Captioner
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Drag & drop a video, generate captions, edit the text, and export a
          final render. Myanmar Unicode is fully supported.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-6">
          <SectionCard
            title="Upload MP4"
            description="Drop your video file to begin the captioning flow."
          >
            <div
              className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-950/40 hover:border-indigo-500 transition cursor-pointer"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0] ?? null;
                if (file && file.type.includes("mp4")) {
                  handleDrop(file);
                } else {
                  alert("MP4 ဖိုင်သာ လက်ခံပါသည်။");
                }
              }}
            >
              <input
                id="captioner-upload"
                type="file"
                accept="video/mp4"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && !file.type.includes("mp4")) {
                    alert("MP4 ဖိုင်သာ လက်ခံပါသည်။");
                    return;
                  }
                  handleDrop(file);
                }}
              />
              <label
                htmlFor="captioner-upload"
                className="flex flex-col items-center gap-3 text-slate-400"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center">
                  <Upload className="text-indigo-300" size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drag & drop MP4
                  </p>
                  <p className="text-xs">or click to browse files</p>
                </div>
                {videoFile ? (
                  <span className="text-xs text-green-400 truncate max-w-[220px]">
                    {videoFile.name}
                  </span>
                ) : null}
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Captioning"
            description="Generate captions with realtime progress."
          >
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleCaption}
                disabled={isProcessing || isUploading || !videoId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                <Wand2 size={16} />
                {isProcessing ? "Processing..." : "Auto Caption"}
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
            description="Render the final video and download the output."
          >
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || captions.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 px-4 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10 disabled:opacity-50"
              >
                <Download size={16} />
                {isExporting ? "Rendering..." : "Render & Download"}
              </button>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{exportStatus}</p>
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  className="inline-flex items-center justify-center w-full rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200"
                >
                  Download Exported Video
                </a>
              ) : null}
              <p className="text-[11px] text-slate-500">
                Backend rendering runs on your local FastAPI server.
              </p>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Preview Player"
            description="Captions are synced with the video playback."
            action={
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Video size={14} />
                {videoFile ? "Loaded" : "No file"}
              </div>
            }
          >
            <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-slate-800">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Upload a video to preview captions.
                </div>
              )}
              {activeCaption ? (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-xl text-sm max-w-[80%] text-center">
                  {activeCaption.text}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Caption Editor"
            description="Click a caption to jump, then edit the text."
          >
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2">
                {captions.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    Generate captions to start editing.
                  </div>
                ) : (
                  captions.map((caption) => (
                    <button
                      key={caption.id}
                      type="button"
                      onClick={() => handleCaptionClick(caption)}
                      className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition ${
                        caption.id === selectedCaptionId
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                          : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Clock size={12} />
                        {formatTimestamp(caption.start)} -
                        {formatTimestamp(caption.end)}
                      </div>
                      <div className="mt-1 line-clamp-2">{caption.text}</div>
                    </button>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Edit3 size={14} />
                  Edit Caption
                </div>
                <textarea
                  value={selectedCaption?.text ?? ""}
                  onChange={(event) => updateCaptionText(event.target.value)}
                  placeholder="Select a caption to edit..."
                  className="min-h-[160px] w-full rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {selectedCaption ? (
                  <div className="text-[11px] text-slate-500">
                    {formatTimestamp(selectedCaption.start)} →
                    {formatTimestamp(selectedCaption.end)}
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

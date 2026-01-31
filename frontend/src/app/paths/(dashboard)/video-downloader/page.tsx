"use client";

import { Download, Link as LinkIcon, Loader2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DownloaderMode = "youtube" | "tiktok" | "xiaohongshu";
type DownloaderQuality = "720p" | "1080p";

const MODE_CONFIG: Record<
  DownloaderMode,
  {
    label: string;
    helper: string;
    placeholder: string;
    hint: string;
    domainMatch: RegExp;
  }
> = {
  youtube: {
    label: "YouTube",
    helper: "Paste a YouTube video link. We'll prepare the download request.",
    placeholder: "https://www.youtube.com/watch?v=...",
    hint: "Supported domains: youtube.com, youtu.be",
    domainMatch: /(^|\.)youtube\.com|youtu\.be/i,
  },
  tiktok: {
    label: "TikTok",
    helper: "Paste a TikTok video link. We'll prepare the download request.",
    placeholder: "https://www.tiktok.com/@user/video/...",
    hint: "Supported domains: tiktok.com",
    domainMatch: /(^|\.)tiktok\.com/i,
  },
  xiaohongshu: {
    label: "Xiaohongshu",
    helper:
      "Paste a Xiaohongshu link. We'll prepare the download request.",
    placeholder: "https://www.xiaohongshu.com/discovery/item/...",
    hint: "Supported domains: xiaohongshu.com, xhslink.com",
    domainMatch: /(^|\.)xiaohongshu\.com|xhslink\.com/i,
  },
};

export default function VideoDownloaderPage() {
  const [mode, setMode] = useState<DownloaderMode>("youtube");
  const [quality, setQuality] = useState<DownloaderQuality>("1080p");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to download.");
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const pollerRef = useRef<number | null>(null);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

  useEffect(() => {
    return () => {
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
      }
    };
  }, []);

  const handleDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a direct video URL.");
      return;
    }
    if (!MODE_CONFIG[mode].domainMatch.test(url)) {
      setError(`Please enter a valid ${MODE_CONFIG[mode].label} link.`);
      return;
    }
    setError(null);
    setStatus("Sending download request...");
    setProgress(5);
    setIsDownloading(true);
    setDownloadUrl(null);

    try {
      const response = await fetch(`${apiBaseUrl}/downloader/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode, quality }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Download request failed.");
      }

      const data = (await response.json()) as { job_id: string };

      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
      }

      pollerRef.current = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${apiBaseUrl}/downloader/status/${data.job_id}`
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
            quality_used?: string | null;
            container_used?: string | null;
          };

          setProgress(statusData.progress ?? 0);
          const qualityNote = statusData.quality_used
            ? ` ${statusData.quality_used}`
            : "";
          const containerNote = statusData.container_used
            ? ` ${statusData.container_used.toUpperCase()}`
            : "";
          const statusSuffix = qualityNote || containerNote
            ? ` (${[qualityNote, containerNote].filter(Boolean).join(" ")})`
            : "";
          setStatus(`Status: ${statusData.status}${statusSuffix}`);

          if (statusData.status === "completed" && statusData.output_url) {
            setDownloadUrl(`${apiBaseUrl}${statusData.output_url}`);
            setStatus("Download ready.");
            setIsDownloading(false);
            if (pollerRef.current) {
              window.clearInterval(pollerRef.current);
            }
          } else if (statusData.status === "failed") {
            setIsDownloading(false);
            setError(statusData.error ?? "Download failed.");
            if (pollerRef.current) {
              window.clearInterval(pollerRef.current);
            }
          }
        } catch (err) {
          setIsDownloading(false);
          setError(err instanceof Error ? err.message : "Status check failed.");
          if (pollerRef.current) {
            window.clearInterval(pollerRef.current);
          }
        }
      }, 1200);
    } catch (err) {
      setIsDownloading(false);
      setProgress(0);
      setStatus("Ready to download.");
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest">
          Video Downloader
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Paste a direct MP4 URL to download. For protected sources, use your
          backend to fetch the file.
        </p>
      </header>

      <div className="bg-[#0f111d] border border-gray-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {(
            Object.keys(MODE_CONFIG) as Array<DownloaderMode>
          ).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs uppercase tracking-wider transition-all ${
                mode === key
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  : "border-gray-800 text-gray-400 hover:border-indigo-500/60 hover:text-indigo-200"
              }`}
            >
              <Video size={14} />
              {MODE_CONFIG[key].label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-white">
            {MODE_CONFIG[mode].label} Downloader
          </h2>
          <p className="text-xs text-gray-400">
            {MODE_CONFIG[mode].helper}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Video URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 bg-[#0a0b14] border border-gray-800 rounded-xl px-3">
                <LinkIcon size={16} className="text-gray-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={MODE_CONFIG[mode].placeholder}
                  className="w-full bg-transparent py-3 text-sm text-gray-200 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Working...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Start Download
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Quality
            </label>
            <div className="flex gap-2">
              {(["720p", "1080p"] as DownloaderQuality[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuality(item)}
                  className={`px-4 py-3 rounded-xl border text-xs uppercase tracking-wider transition-all ${
                    quality === item
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                      : "border-gray-800 text-gray-400 hover:border-indigo-500/60 hover:text-indigo-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">{MODE_CONFIG[mode].hint}</p>
          <p className="text-xs text-gray-400">{status}</p>
          <div className="w-full h-2 bg-[#0a0b14] rounded-full overflow-hidden border border-gray-800">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            <Download size={14} />
            Download file
          </a>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

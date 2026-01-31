"use client";

import { useState } from "react";

import BrandLogoOverlayPanel from "@/components/dashboard/BrandLogoOverlayPanel";
import FilmstripBlurPanel from "@/components/dashboard/FilmstripBlurPanel";
import FreezeFrameZoomPanel from "@/components/dashboard/FreezeFrameZoomPanel";
import MediaInputSection from "@/components/dashboard/MediaInputSection";
import RenderAspectRatioSection from "@/components/dashboard/RenderAspectRatioSection";
import RenderFooter from "@/components/dashboard/RenderFooter";
import Sidebar, { type TabKey } from "@/components/dashboard/Sidebar";
import SyncAdjustmentPanel from "@/components/dashboard/SyncAdjustmentPanel";
import AutoCaptionerSection from "@/components/sections/AutoCaptionerSection";
import TranscribeSection from "@/components/sections/TranscribeSection";
import type { AspectRatioOption, PositionOption } from "@/lib/options";
import { ASPECT_RATIOS, LOGO_POSITIONS } from "@/lib/options";

export default function VideoRecapSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("recap");
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [movieFile, setMovieFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [movieTitle, setMovieTitle] = useState("");

  const [videoSpeed, setVideoSpeed] = useState(4.482);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [filmstripBlur, setFilmstripBlur] = useState({
    enabled: true,
    position: 80,
    thickness: 15,
    intensity: 25,
  });
  const [freezeFrame, setFreezeFrame] = useState({
    enabled: true,
    interval: 8,
    duration: 3,
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("tiktok");
  const [logoPosition, setLogoPosition] = useState<PositionOption>(
    "Bottom Right"
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

  const handleStartRender = async () => {
    if (!movieFile) {
      alert("ကျေးဇူးပြု၍ ဗီဒီယိုဖိုင်အရင်တင်ပါ");
      return;
    }

    if (videoSpeed < 0.25 || videoSpeed > 5 || audioSpeed < 0.25 || audioSpeed > 5) {
      alert("Sync adjustment values must be between 0.25x and 5x.");
      return;
    }

    if (
      filmstripBlur.position < 0 ||
      filmstripBlur.position > 100 ||
      filmstripBlur.thickness < 0 ||
      filmstripBlur.thickness > 100 ||
      filmstripBlur.intensity < 0 ||
      filmstripBlur.intensity > 100
    ) {
      alert("Filmstrip blur values must be between 0% and 100%.");
      return;
    }

    if (freezeFrame.interval < 1 || freezeFrame.duration < 0.1) {
      alert("Freeze frame interval and duration are out of range.");
      return;
    }

    setIsRendering(true);
    setProgress(0);
    setStatus("Uploading media...");
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      const payload = {
        video_speed: videoSpeed,
        audio_speed: audioSpeed,
        filmstrip_enabled: filmstripBlur.enabled,
        filmstrip_position_pct: filmstripBlur.position,
        filmstrip_thickness_pct: filmstripBlur.thickness,
        filmstrip_intensity_pct: filmstripBlur.intensity,
        freeze_frame_enabled: freezeFrame.enabled,
        freeze_frame_interval: freezeFrame.interval,
        freeze_frame_duration: freezeFrame.duration,
        logo_position: logoPosition,
        aspect_ratio: aspectRatio,
      };

      const formData = new FormData();
      formData.append("video", movieFile);
      if (audioFile) {
        formData.append("audio", audioFile);
      }
      if (logoFile) {
        formData.append("logo", logoFile);
      }
      formData.append("settings", JSON.stringify(payload));

      setProgress(20);
      setStatus("Sending render job...");

      const response = await fetch(`${apiBaseUrl}/render`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Render failed.");
      }

      const data = (await response.json()) as {
        output_url: string;
      };

      setProgress(100);
      setStatus("Render complete.");
      setDownloadUrl(`${apiBaseUrl}${data.output_url}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected render error.";
      setErrorMessage(message);
      setStatus("Render failed.");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0b14] text-gray-200 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto p-8 bg-[#0a0b14]">
        <div className={activeTab === "captioner" ? "max-w-6xl mx-auto" : "max-w-4xl mx-auto"}>
          {activeTab === "captioner" ? (
            <AutoCaptionerSection apiBaseUrl={apiBaseUrl} />
          ) : activeTab === "transcribe" ? (
            <TranscribeSection apiBaseUrl={apiBaseUrl} />
          ) : (
            <>
              <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-white uppercase tracking-widest">
                  Video Recap Settings
                </h1>
                <div className="flex gap-4">
                  <span className="px-4 py-2 bg-gray-800 rounded-lg text-xs flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    SERVER READY
                  </span>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <MediaInputSection
                    movieFile={movieFile}
                    audioFile={audioFile}
                    movieTitle={movieTitle}
                    onMovieFileChange={setMovieFile}
                    onAudioFileChange={setAudioFile}
                    onMovieTitleChange={setMovieTitle}
                  />

                  <SyncAdjustmentPanel
                    videoSpeed={videoSpeed}
                    audioSpeed={audioSpeed}
                    videoOutput="00:03:56.316"
                    audioOutput="00:03:56.290"
                    onVideoSpeedChange={setVideoSpeed}
                    onAudioSpeedChange={setAudioSpeed}
                  />

                  <RenderAspectRatioSection
                    aspectRatio={aspectRatio}
                    options={ASPECT_RATIOS}
                    onAspectRatioChange={setAspectRatio}
                  />
                </div>

                <div className="space-y-6">
                  <FilmstripBlurPanel
                    enabled={filmstripBlur.enabled}
                    position={filmstripBlur.position}
                    thickness={filmstripBlur.thickness}
                    intensity={filmstripBlur.intensity}
                    onToggle={() =>
                      setFilmstripBlur((prev) => ({
                        ...prev,
                        enabled: !prev.enabled,
                      }))
                    }
                    onPositionChange={(value) =>
                      setFilmstripBlur((prev) => ({ ...prev, position: value }))
                    }
                    onThicknessChange={(value) =>
                      setFilmstripBlur((prev) => ({ ...prev, thickness: value }))
                    }
                    onIntensityChange={(value) =>
                      setFilmstripBlur((prev) => ({ ...prev, intensity: value }))
                    }
                  />

                  <FreezeFrameZoomPanel
                    enabled={freezeFrame.enabled}
                    interval={freezeFrame.interval}
                    duration={freezeFrame.duration}
                    onToggle={() =>
                      setFreezeFrame((prev) => ({
                        ...prev,
                        enabled: !prev.enabled,
                      }))
                    }
                    onIntervalChange={(value) =>
                      setFreezeFrame((prev) => ({ ...prev, interval: value }))
                    }
                    onDurationChange={(value) =>
                      setFreezeFrame((prev) => ({ ...prev, duration: value }))
                    }
                  />

                  <BrandLogoOverlayPanel
                    logoFile={logoFile}
                    logoPosition={logoPosition}
                    positions={LOGO_POSITIONS}
                    onLogoFileChange={setLogoFile}
                    onLogoPositionChange={setLogoPosition}
                  />
                </div>
              </div>

              <RenderFooter
                isRendering={isRendering}
                progress={progress}
                status={status}
                errorMessage={errorMessage}
                downloadUrl={downloadUrl}
                onStartRender={handleStartRender}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

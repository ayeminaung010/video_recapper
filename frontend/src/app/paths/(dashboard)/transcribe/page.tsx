"use client";

import TranscribeSection from "@/components/sections/TranscribeSection";

export default function TranscribePage() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

  return (
    <div className="max-w-6xl mx-auto">
      <TranscribeSection apiBaseUrl={apiBaseUrl} />
    </div>
  );
}

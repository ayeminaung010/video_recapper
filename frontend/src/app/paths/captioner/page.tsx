"use client";

import AutoCaptionerSection from "@/components/sections/AutoCaptionerSection";

export default function CaptionerPage() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

  return (
    <div className="min-h-screen bg-[#0a0b14] text-gray-200 font-sans">
      <main className="max-w-6xl mx-auto px-8 py-8">
        <AutoCaptionerSection apiBaseUrl={apiBaseUrl} />
      </main>
    </div>
  );
}

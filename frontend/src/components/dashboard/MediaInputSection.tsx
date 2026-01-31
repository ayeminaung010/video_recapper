import { CheckCircle, Mic, Music, Upload, Video } from "lucide-react";

interface MediaInputSectionProps {
  movieFile: File | null;
  audioFile: File | null;
  movieTitle: string;
  onMovieFileChange: (file: File | null) => void;
  onAudioFileChange: (file: File | null) => void;
  onMovieTitleChange: (value: string) => void;
}

export default function MediaInputSection({
  movieFile,
  audioFile,
  movieTitle,
  onMovieFileChange,
  onAudioFileChange,
  onMovieTitleChange,
}: MediaInputSectionProps) {
  return (
    <section className="bg-[#0f111d] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2 uppercase">
        <Upload size={16} /> Media Input
      </h3>

      <input
        id="video-upload"
        type="file"
        className="hidden"
        accept="video/*"
        onChange={(event) => onMovieFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor="video-upload"
        className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors cursor-pointer mb-4 block"
      >
        {movieFile ? (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle size={20} />
            <span className="text-xs truncate max-w-[200px]">
              {movieFile.name}
            </span>
          </div>
        ) : (
          <div className="text-gray-500">
            <Video className="mx-auto mb-2 opacity-20" size={32} />
            <p className="text-[11px]">
              မူရင်းဗီဒီယို (MP4/MKV) တင်ရန် နှိပ်ပါ
            </p>
          </div>
        )}
      </label>

      <input
        id="audio-upload"
        type="file"
        className="hidden"
        accept="audio/*"
        onChange={(event) => onAudioFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor="audio-upload"
        className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-gray-900/30 block"
      >
        {audioFile ? (
          <div className="flex items-center justify-center gap-2 text-indigo-400">
            <Music size={20} />
            <span className="text-xs truncate max-w-[200px]">
              {audioFile.name}
            </span>
          </div>
        ) : (
          <div className="text-gray-500">
            <Mic className="mx-auto mb-2 opacity-20" size={32} />
            <p className="text-[11px]">
              အသံဖိုင် (MP3) တင်ရန် နှိပ်ပါ (Optional)
            </p>
          </div>
        )}
      </label>

      <input
        type="text"
        placeholder="Movie Title / Context..."
        className="w-full mt-4 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500"
        value={movieTitle}
        onChange={(event) => onMovieTitleChange(event.target.value)}
      />
    </section>
  );
}

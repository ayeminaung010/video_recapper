export const ASPECT_RATIOS = [
  {
    value: "tiktok",
    label: "TikTok (9:16)",
    detail: "Vertical full-screen format optimized for mobile viewing.",
    ratio: "9:16",
  },
  {
    value: "youtube",
    label: "YouTube (16:9)",
    detail: "Standard widescreen layout for desktop and TV playback.",
    ratio: "16:9",
  },
  {
    value: "shorts",
    label: "Shorts (3:4)",
    detail: "Compact vertical format with reduced top/bottom padding.",
    ratio: "3:4",
  },
  {
    value: "classic",
    label: "Classic (4:3)",
    detail: "Retro TV framing for archival or cinematic looks.",
    ratio: "4:3",
  },
  {
    value: "square",
    label: "Square (1:1)",
    detail: "Balanced square framing for grid-based feeds and previews.",
    ratio: "1:1",
  },
] as const;

export type AspectRatioOption = (typeof ASPECT_RATIOS)[number]["value"];

export type PositionOption =
  | "Top Left"
  | "Top Right"
  | "Bottom Left"
  | "Bottom Right";

export const LOGO_POSITIONS: PositionOption[] = [
  "Top Left",
  "Top Right",
  "Bottom Left",
  "Bottom Right",
];

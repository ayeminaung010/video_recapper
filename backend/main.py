from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import Optional
from uuid import uuid4
import logging
import tempfile

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from moviepy.editor import (
    AudioFileClip,
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    vfx,
)
from pydantic import BaseModel, Field
from PIL import Image

from backend.features.captioner import router as captioner_router

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "app.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("movie-recap")

# Pillow 10+ removed Image.ANTIALIAS; MoviePy 1.x still references it.
if not hasattr(Image, "ANTIALIAS"):
    Image.ANTIALIAS = Image.LANCZOS  # type: ignore[attr-defined]

app = FastAPI(title="Movie Recap Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(captioner_router)


class AspectRatio(str, Enum):
    tiktok = "tiktok"
    youtube = "youtube"
    shorts = "shorts"
    classic = "classic"
    square = "square"


class LogoPosition(str, Enum):
    top_left = "Top Left"
    top_right = "Top Right"
    bottom_left = "Bottom Left"
    bottom_right = "Bottom Right"


class RenderSettings(BaseModel):
    video_speed: float = Field(1.0, ge=0.25, le=5.0)
    audio_speed: float = Field(1.0, ge=0.25, le=5.0)
    filmstrip_enabled: bool = True
    filmstrip_position_pct: float = Field(80, ge=0, le=100)
    filmstrip_thickness_pct: float = Field(15, ge=0, le=100)
    filmstrip_intensity_pct: float = Field(25, ge=0, le=100)
    freeze_frame_enabled: bool = True
    freeze_frame_interval: float = Field(8, ge=1, le=120)
    freeze_frame_duration: float = Field(3, ge=0.1, le=10)
    logo_position: LogoPosition = LogoPosition.bottom_right
    aspect_ratio: AspectRatio = AspectRatio.tiktok


class RenderResponse(BaseModel):
    output_path: str
    output_url: str
    aspect_ratio: AspectRatio


ASPECT_RATIO_MAP = {
    AspectRatio.tiktok: (9, 16),
    AspectRatio.youtube: (16, 9),
    AspectRatio.shorts: (3, 4),
    AspectRatio.classic: (4, 3),
    AspectRatio.square: (1, 1),
}


def aspect_ratio_value(ratio: AspectRatio) -> float:
    width, height = ASPECT_RATIO_MAP[ratio]
    return float(width) / float(height)


def resize_to_aspect(clip: VideoFileClip, ratio: AspectRatio) -> VideoFileClip:
    target_ratio = aspect_ratio_value(ratio)
    width, height = clip.size
    current_ratio = width / height

    if abs(current_ratio - target_ratio) < 0.001:
        return clip

    if current_ratio > target_ratio:
        new_width = int(height * target_ratio)
        x_center = width / 2
        return clip.crop(
            x_center=x_center,
            width=new_width,
        )

    new_height = int(width / target_ratio)
    y_center = height / 2
    return clip.crop(
        y_center=y_center,
        height=new_height,
    )


def apply_filmstrip_blur(
    clip: VideoFileClip,
    enabled: bool,
    position_pct: float,
    thickness_pct: float,
    intensity_pct: float,
    aspect_ratio: AspectRatio,
) -> VideoFileClip:
    if not enabled or aspect_ratio_value(aspect_ratio) >= 1:
        return clip

    width, height = clip.size
    blur_height = max(1, int(height * thickness_pct / 100))
    top_offset = int(height * position_pct / 100)

    blur_radius = max(0.0, intensity_pct / 10)
    blurred = clip.fx(vfx.blur, blur_radius)
    blurred_strip = blurred.crop(y1=top_offset, y2=top_offset + blur_height)
    base = CompositeVideoClip([clip, blurred_strip.set_position((0, top_offset))])
    return base.set_duration(clip.duration)


def overlay_logo(
    clip: VideoFileClip,
    logo_path: Optional[Path],
    position: LogoPosition,
) -> VideoFileClip:
    if not logo_path:
        return clip

    logo = ImageClip(str(logo_path)).set_duration(clip.duration)
    logo = logo.resize(height=int(clip.h * 0.12))

    margin = int(clip.h * 0.03)
    x_left = margin
    x_right = clip.w - logo.w - margin
    y_top = margin
    y_bottom = clip.h - logo.h - margin

    positions = {
        LogoPosition.top_left: (x_left, y_top),
        LogoPosition.top_right: (x_right, y_top),
        LogoPosition.bottom_left: (x_left, y_bottom),
        LogoPosition.bottom_right: (x_right, y_bottom),
    }

    return CompositeVideoClip(
        [clip, logo.set_position(positions[position])]
    ).set_duration(clip.duration)


def process_video(
    input_path: Path,
    output_path: Path,
    settings: RenderSettings,
    logo_path: Optional[Path],
    audio_path: Optional[Path],
) -> None:
    logger.info("Starting render for %s", input_path.name)
    logger.info(
        "Settings | sync: v=%sx a=%sx | filmstrip: %s pos=%s%% thick=%s%% intensity=%s%% | freeze: %s interval=%ss duration=%ss | logo: %s | ratio: %s",
        settings.video_speed,
        settings.audio_speed,
        settings.filmstrip_enabled,
        settings.filmstrip_position_pct,
        settings.filmstrip_thickness_pct,
        settings.filmstrip_intensity_pct,
        settings.freeze_frame_enabled,
        settings.freeze_frame_interval,
        settings.freeze_frame_duration,
        settings.logo_position,
        settings.aspect_ratio,
    )
    clip = VideoFileClip(str(input_path))

    clip = clip.fx(vfx.speedx, factor=settings.video_speed)
    if audio_path:
        logger.info("Using uploaded audio: %s", audio_path.name)
        audio_clip = AudioFileClip(str(audio_path))
        clip = clip.set_audio(audio_clip)
    elif clip.audio:
        clip = clip.set_audio(clip.audio.fx(vfx.speedx, factor=settings.audio_speed))

    clip = apply_filmstrip_blur(
        clip,
        enabled=settings.filmstrip_enabled,
        position_pct=settings.filmstrip_position_pct,
        thickness_pct=settings.filmstrip_thickness_pct,
        intensity_pct=settings.filmstrip_intensity_pct,
        aspect_ratio=settings.aspect_ratio,
    )

    clip = overlay_logo(clip, logo_path, settings.logo_position)
    clip = resize_to_aspect(clip, settings.aspect_ratio)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        ffmpeg_params = [
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-profile:v",
            "baseline",
            "-level",
            "3.1",
            "-ac",
            "2",
            "-ar",
            "44100",
        ]
        output_fps = getattr(clip, "fps", None) or 30
        clip.write_videofile(
            str(output_path),
            codec="libx264",
            audio_codec="aac",
            fps=output_fps,
            ffmpeg_params=ffmpeg_params,
        )
        logger.info("Render complete: %s", output_path.name)
    except Exception:
        logger.exception("Render failed for %s", input_path.name)
        raise
    finally:
        clip.close()


def get_temp_dir() -> Path:
    return Path(tempfile.gettempdir())


@app.post("/render", response_model=RenderResponse)
async def render_video(
    video: UploadFile = File(...),
    audio: UploadFile | None = File(None),
    logo: UploadFile | None = File(None),
    settings: str = Form(...),
):
    """
    Render a recap video based on uploaded video and settings.

    - video: main video file
    - logo: optional logo image
    - settings: JSON string representing RenderSettings
    """
    logger.info("Render request received")
    try:
        parsed_settings = RenderSettings.model_validate_json(settings)
    except Exception:
        logger.exception("Invalid render settings payload")
        raise

    logger.info("Render requested: %s", video.filename)

    temp_dir = get_temp_dir()
    input_path = temp_dir / Path(video.filename).name
    with input_path.open("wb") as buffer:
        buffer.write(await video.read())
    logger.info("Uploaded video saved: %s", input_path)

    logo_path: Optional[Path] = None
    if logo:
        logo_path = temp_dir / Path(logo.filename).name
        with logo_path.open("wb") as buffer:
            buffer.write(await logo.read())
        logger.info("Uploaded logo saved: %s", logo_path)

    audio_path: Optional[Path] = None
    if audio:
        audio_path = temp_dir / Path(audio.filename).name
        with audio_path.open("wb") as buffer:
            buffer.write(await audio.read())
        logger.info("Uploaded audio saved: %s", audio_path)

    output_name = f"rendered_{uuid4().hex}_{Path(video.filename).stem}.mp4"
    output_path = temp_dir / output_name
    try:
        process_video(input_path, output_path, parsed_settings, logo_path, audio_path)
    except Exception:
        logger.exception("Render pipeline failed for %s", video.filename)
        raise

    return RenderResponse(
        output_path=str(output_path),
        output_url=f"/download/{output_name}",
        aspect_ratio=parsed_settings.aspect_ratio,
    )


@app.get("/download/{file_name}")
def download_render(file_name: str):
    temp_dir = get_temp_dir()
    file_path = temp_dir / Path(file_name).name
    return FileResponse(path=file_path, filename=file_path.name, media_type="video/mp4")

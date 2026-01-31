from __future__ import annotations

import gc
import logging
import os
import tempfile
import threading
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from moviepy.editor import CompositeVideoClip, ImageClip, VideoFileClip
from pydantic import BaseModel, Field
from PIL import Image, ImageDraw, ImageFont
import numpy as np

try:
    from faster_whisper import WhisperModel
except Exception:
    WhisperModel = None

try:
    import torch
except Exception:
    torch = None

logger = logging.getLogger("movie-recap")
router = APIRouter(prefix="/captioner", tags=["captioner"])

CAPTION_TEMP_DIR = Path(tempfile.gettempdir()) / "video_recap_captioner"
CAPTION_TEMP_DIR.mkdir(parents=True, exist_ok=True)

REPO_ROOT = Path(__file__).resolve().parents[2]
REPO_FONT_PATH = REPO_ROOT / "Pyidaungsu-1.8.3_Regular.ttf"
CAPTION_FONT_PATH = os.getenv("CAPTION_FONT_PATH", str(REPO_FONT_PATH))
WINDOWS_MYANMAR_FONT = "C:/Windows/Fonts/Pyidaungsu.ttf"

caption_video_store: Dict[str, Path] = {}
caption_job_store: Dict[str, Dict[str, str | int | None]] = {}
transcribe_job_store: Dict[str, Dict[str, object]] = {}
whisper_model_cache: Dict[str, "WhisperModel"] = {}


class CaptionEntry(BaseModel):
    id: str
    start: float
    end: float
    text: str


class CaptionUploadResponse(BaseModel):
    video_id: str
    filename: str


class CaptionTranscribeRequest(BaseModel):
    video_id: str
    model: str = Field("medium", pattern="^(small|medium)$")


class CaptionTranscribeResponse(BaseModel):
    video_id: str
    captions: list[CaptionEntry]
    device: str


class CaptionTranscribeAsyncResponse(BaseModel):
    job_id: str
    status: str
    status_url: str


class CaptionTranscribeStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    captions: Optional[list[CaptionEntry]] = None
    error: Optional[str] = None


class CaptionExportRequest(BaseModel):
    video_id: str
    captions: list[CaptionEntry]


class CaptionExportResponse(BaseModel):
    job_id: str
    status: str
    status_url: str


class CaptionJobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    output_url: Optional[str] = None
    error: Optional[str] = None


class SrtExportRequest(BaseModel):
    captions: list[CaptionEntry]
    file_name: Optional[str] = None


def resolve_caption_video(video_id: str) -> Path:
    if video_id not in caption_video_store:
        raise HTTPException(status_code=404, detail="Video not found")
    video_path = caption_video_store[video_id]
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file missing")
    return video_path


def get_whisper_device() -> str:
    if torch and torch.cuda.is_available():
        return "cuda"
    return "cpu"


def load_whisper_model(model_size: str) -> "WhisperModel":
    if WhisperModel is None:
        raise HTTPException(
            status_code=500,
            detail="faster-whisper is not installed. Please install it.",
        )
    device = get_whisper_device()
    compute_type = "float16" if device == "cuda" else "int8"
    cache_key = f"{model_size}:{device}:{compute_type}"
    if cache_key not in whisper_model_cache:
        logger.info(
            "Loading faster-whisper model %s on %s (%s)",
            model_size,
            device,
            compute_type,
        )
        whisper_model_cache[cache_key] = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )
    return whisper_model_cache[cache_key]


def cleanup_caption_assets(video_id: str, output_path: Optional[Path] = None) -> None:
    video_path = caption_video_store.pop(video_id, None)
    if video_path and video_path.exists():
        try:
            video_path.unlink(missing_ok=True)
        except Exception:
            logger.warning("Failed to delete temp video: %s", video_path)

    if output_path and output_path.exists():
        try:
            output_path.unlink(missing_ok=True)
        except Exception:
            logger.warning("Failed to delete output: %s", output_path)


def schedule_cleanup(
    video_id: str, output_path: Optional[Path] = None, delay: int = 900
) -> None:
    threading.Timer(delay, cleanup_caption_assets, args=(video_id, output_path)).start()


def resolve_font(font_size: int) -> ImageFont.FreeTypeFont:
    font_candidates = [
        CAPTION_FONT_PATH,
        str(REPO_FONT_PATH),
        WINDOWS_MYANMAR_FONT,
    ]

    for font_path in font_candidates:
        if font_path and Path(font_path).exists():
            return ImageFont.truetype(font_path, font_size)

    return ImageFont.load_default()


def split_graphemes(text: str) -> list[str]:
    if not text:
        return [""]

    clusters: list[str] = []
    current = ""
    for char in text:
        if not current:
            current = char
            continue

        if unicodedata.combining(char) or char == "\u1039":
            current += char
            continue

        if current.endswith("\u1039"):
            current += char
            continue

        clusters.append(current)
        current = char

    if current:
        clusters.append(current)
    return clusters


def is_myanmar_text(text: str) -> bool:
    return any("\u1000" <= char <= "\u109F" for char in text)


def myanmar_ratio(text: str) -> float:
    if not text:
        return 0.0
    my_count = sum(1 for char in text if "\u1000" <= char <= "\u109F")
    total = sum(1 for char in text if not char.isspace())
    return my_count / max(1, total)


def filter_myanmar_captions(
    captions: list[CaptionEntry], threshold: float = 0.1
) -> list[CaptionEntry]:
    filtered: list[CaptionEntry] = []
    for caption in captions:
        ratio = myanmar_ratio(caption.text)
        if ratio >= threshold:
            filtered.append(caption)
    return filtered


def wrap_text_myanmar(
    text: str,
    draw: ImageDraw.ImageDraw,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    if not text:
        return [""]

    words = text.split()
    if is_myanmar_text(text):
        tokens: list[str] = []
        for word in words:
            tokens.extend(split_graphemes(word))
            tokens.append(" ")
        if tokens:
            tokens.pop()
    else:
        tokens = words if words else list(text)

    lines: list[str] = []
    current = ""
    for token in tokens:
        candidate = f"{current}{token}" if token == " " else f"{current} {token}".strip()
        width = draw.textbbox((0, 0), candidate, font=font)[2]
        if width <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = token.strip()

    if current:
        lines.append(current)

    return lines


@lru_cache(maxsize=256)
def render_caption_array(text: str, max_width: int, font_size: int) -> np.ndarray:
    font = resolve_font(font_size)
    dummy = Image.new("RGBA", (max_width, 10), (0, 0, 0, 0))
    draw = ImageDraw.Draw(dummy)
    lines = wrap_text_myanmar(text, draw, font, max_width)

    line_height = draw.textbbox((0, 0), "Hg", font=font)[3]
    line_spacing = int(font_size * 0.25)
    padding_x = 20
    padding_y = 14
    height = (
        padding_y * 2
        + len(lines) * line_height
        + max(0, len(lines) - 1) * line_spacing
    )
    width = max_width + padding_x * 2

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    y = padding_y
    for line in lines:
        draw.text(
            (padding_x, y),
            line,
            font=font,
            fill=(255, 255, 255, 255),
            stroke_width=2,
            stroke_fill=(0, 0, 0, 255),
        )
        y += line_height + line_spacing

    return np.array(img)


def build_caption_image(text: str, max_width: int, font_size: int = 40) -> Image.Image:
    return Image.fromarray(render_caption_array(text, max_width, font_size))


def format_srt_timestamp(seconds: float) -> str:
    rounded = max(0.0, seconds)
    hrs = int(rounded // 3600)
    mins = int((rounded % 3600) // 60)
    secs = int(rounded % 60)
    ms = int((rounded - int(rounded)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def build_srt(captions: list[CaptionEntry]) -> str:
    lines: list[str] = []
    for index, caption in enumerate(captions, start=1):
        lines.append(str(index))
        lines.append(
            f"{format_srt_timestamp(caption.start)} --> {format_srt_timestamp(caption.end)}"
        )
        lines.append(caption.text)
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def normalize_captions(captions: list[CaptionEntry]) -> list[CaptionEntry]:
    if not captions:
        return []

    ordered = sorted(captions, key=lambda c: c.start)
    merged: list[CaptionEntry] = []

    for caption in ordered:
        if caption.end <= caption.start or not caption.text.strip():
            continue
        if not merged:
            merged.append(caption)
            continue

        last = merged[-1]
        if caption.text.strip() == last.text.strip() and caption.start <= last.end + 0.2:
            last.end = max(last.end, caption.end)
        else:
            merged.append(caption)

    return merged


def render_captioned_video(
    job_id: str, video_id: str, captions: list[CaptionEntry], output_path: Path
) -> None:
    try:
        caption_job_store[job_id]["status"] = "processing"
        caption_job_store[job_id]["progress"] = 5

        if not captions:
            raise ValueError("No captions provided")

        video_path = resolve_caption_video(video_id)
        video = VideoFileClip(str(video_path))
        video_width, video_height = video.size

        normalized = normalize_captions(captions)
        caption_clips: list[ImageClip] = []
        total = len(normalized) if normalized else 1
        max_text_width = int(video_width * 0.9)

        for index, caption in enumerate(normalized, start=1):
            caption_image = build_caption_image(
                caption.text,
                max_width=max_text_width,
                font_size=40,
            )
            clip = (
                ImageClip(np.array(caption_image))
                .set_start(caption.start)
                .set_duration(max(0.01, caption.end - caption.start))
                .set_position(("center", int(video_height * 0.82)))
            )
            caption_clips.append(clip)

            progress = 5 + int((index / total) * 60)
            caption_job_store[job_id]["progress"] = progress

        final_video = CompositeVideoClip([video] + caption_clips, use_bgclip=True)
        caption_job_store[job_id]["progress"] = 75

        output_path.parent.mkdir(parents=True, exist_ok=True)
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
        output_fps = getattr(video, "fps", None) or 30
        final_video.write_videofile(
            str(output_path),
            codec="libx264",
            audio_codec="aac",
            threads=2,
            preset="ultrafast",
            fps=output_fps,
            ffmpeg_params=ffmpeg_params,
        )
        final_video.close()
        video.close()
        for clip in caption_clips:
            clip.close()
        caption_clips.clear()
        gc.collect()

        caption_job_store[job_id]["status"] = "completed"
        caption_job_store[job_id]["progress"] = 100
        caption_job_store[job_id]["output_path"] = str(output_path)
        caption_job_store[job_id]["output_url"] = f"/captioner/download/{job_id}"

        schedule_cleanup(video_id, output_path)
    except MemoryError:
        caption_job_store[job_id]["status"] = "failed"
        caption_job_store[job_id]["error"] = "Memory error during export."
        caption_job_store[job_id]["progress"] = 0
    except Exception as exc:
        logger.exception("Caption export failed")
        caption_job_store[job_id]["status"] = "failed"
        caption_job_store[job_id]["error"] = str(exc)
        caption_job_store[job_id]["progress"] = 0


@router.post("/upload", response_model=CaptionUploadResponse)
async def caption_upload(video: UploadFile = File(...)):
    allowed_ext = {".mp4", ".mov", ".mkv", ".mp3", ".wav", ".m4a", ".aac"}
    ext = Path(video.filename).suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail="Only video/audio files are supported (mp4, mov, mkv, mp3, wav, m4a, aac).",
        )

    video_id = uuid4().hex
    target_path = CAPTION_TEMP_DIR / f"{video_id}_{Path(video.filename).name}"
    with target_path.open("wb") as buffer:
        buffer.write(await video.read())

    caption_video_store[video_id] = target_path
    return CaptionUploadResponse(video_id=video_id, filename=video.filename)


@router.post("/transcribe", response_model=CaptionTranscribeResponse)
def caption_transcribe(payload: CaptionTranscribeRequest):
    video_path = resolve_caption_video(payload.video_id)

    try:
        target_model = "medium" if payload.model == "medium" else "small"
        model = load_whisper_model(target_model)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    device = get_whisper_device()
    logger.info(
        "Transcribing %s with Whisper %s on %s",
        video_path.name,
        payload.model,
        device,
    )
    try:
        segments_iter, info = model.transcribe(
            str(video_path),
            language="my",
            task="transcribe",
            initial_prompt="မြန်မာစကားပြောကို မြန်မာစာသားအဖြစ် ပြန်ဆိုပေးပါ။",
            vad_filter=True,
        )
    except MemoryError as exc:
        logger.exception("Transcription failed with memory error")
        raise HTTPException(status_code=507, detail="Out of memory") from exc
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    detected_language = getattr(info, "language", None)
    language_prob = getattr(info, "language_probability", None)
    if detected_language and detected_language != "my":
        logger.warning("Detected language is %s (expected my)", detected_language)
    if language_prob is not None:
        logger.info("Language probability: %s", language_prob)

    segments = list(segments_iter)
    if not segments:
        logger.warning("No segments returned. Retrying without language hint...")
        try:
            retry_iter, retry_info = model.transcribe(
                str(video_path),
                task="transcribe",
                vad_filter=True,
            )
        except MemoryError as exc:
            logger.exception("Transcription retry failed with memory error")
            raise HTTPException(status_code=507, detail="Out of memory") from exc
        except Exception as exc:
            logger.exception("Transcription retry failed")
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        detected_language = getattr(retry_info, "language", None)
        if detected_language:
            logger.warning("Retry detected language: %s", detected_language)
        segments = list(retry_iter)
    captions = [
        CaptionEntry(
            id=f"cap-{index+1}",
            start=float(segment.start),
            end=float(segment.end),
            text=str(segment.text).strip(),
        )
        for index, segment in enumerate(segments)
    ]

    raw_count = len(captions)
    if captions:
        preview = " | ".join(c.text[:60] for c in captions[:3])
        logger.info("Caption preview: %s", preview)
    filtered = filter_myanmar_captions(captions, threshold=0.1)
    if filtered:
        captions = filtered
        logger.info("Transcription completed: %s raw, %s kept", raw_count, len(captions))
    else:
        logger.warning("Myanmar filter removed all segments; returning raw output")
        logger.info("Transcription completed: %s raw", raw_count)

    return CaptionTranscribeResponse(
        video_id=payload.video_id, captions=captions, device=device
    )


def transcribe_with_progress(
    job_id: str, video_path: Path, model_name: str, device: str
) -> None:
    try:
        model = load_whisper_model(model_name)
        segments_iter, info = model.transcribe(
            str(video_path),
            language="my",
            task="transcribe",
            initial_prompt="မြန်မာစကားပြောကို မြန်မာစာသားအဖြစ် ပြန်ဆိုပေးပါ။",
            vad_filter=True,
        )

        duration = getattr(info, "duration", None)
        transcribe_job_store[job_id]["status"] = "processing"
        transcribe_job_store[job_id]["progress"] = 5

        segments = []
        last_log_progress = 0
        for segment in segments_iter:
            segments.append(segment)
            if duration:
                progress = min(95, int((float(segment.end) / float(duration)) * 100))
                transcribe_job_store[job_id]["progress"] = progress
                if progress - last_log_progress >= 10:
                    logger.info("Transcribe progress: %s%%", progress)
                    last_log_progress = progress

        captions = [
            CaptionEntry(
                id=f"cap-{index+1}",
                start=float(segment.start),
                end=float(segment.end),
                text=str(segment.text).strip(),
            )
            for index, segment in enumerate(segments)
        ]

        raw_count = len(captions)
        filtered = filter_myanmar_captions(captions, threshold=0.1)
        if filtered:
            captions = filtered
            logger.info("Transcription completed: %s raw, %s kept", raw_count, len(captions))
        else:
            logger.warning("Myanmar filter removed all segments; returning raw output")
            logger.info("Transcription completed: %s raw", raw_count)

        transcribe_job_store[job_id]["status"] = "completed"
        transcribe_job_store[job_id]["progress"] = 100
        transcribe_job_store[job_id]["captions"] = captions
    except MemoryError:
        logger.exception("Transcription failed with memory error")
        transcribe_job_store[job_id]["status"] = "failed"
        transcribe_job_store[job_id]["error"] = "Out of memory"
        transcribe_job_store[job_id]["progress"] = 0
    except Exception as exc:
        logger.exception("Transcription failed")
        transcribe_job_store[job_id]["status"] = "failed"
        transcribe_job_store[job_id]["error"] = str(exc)
        transcribe_job_store[job_id]["progress"] = 0


@router.post("/transcribe-async", response_model=CaptionTranscribeAsyncResponse)
def caption_transcribe_async(payload: CaptionTranscribeRequest):
    video_path = resolve_caption_video(payload.video_id)
    device = get_whisper_device()
    target_model = "medium" if payload.model == "medium" else "small"

    job_id = uuid4().hex
    transcribe_job_store[job_id] = {
        "status": "queued",
        "progress": 0,
        "captions": None,
        "error": None,
    }

    thread = threading.Thread(
        target=transcribe_with_progress,
        args=(job_id, video_path, target_model, device),
        daemon=True,
    )
    thread.start()

    return CaptionTranscribeAsyncResponse(
        job_id=job_id,
        status="queued",
        status_url=f"/captioner/transcribe-status/{job_id}",
    )


@router.get("/transcribe-status/{job_id}", response_model=CaptionTranscribeStatusResponse)
def caption_transcribe_status(job_id: str):
    if job_id not in transcribe_job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    job = transcribe_job_store[job_id]
    return CaptionTranscribeStatusResponse(
        job_id=job_id,
        status=str(job.get("status")),
        progress=int(job.get("progress", 0)),
        captions=job.get("captions"),
        error=job.get("error"),
    )


@router.post("/export", response_model=CaptionExportResponse)
def caption_export(payload: CaptionExportRequest):
    resolve_caption_video(payload.video_id)

    job_id = uuid4().hex
    caption_job_store[job_id] = {
        "status": "queued",
        "progress": 0,
        "output_path": None,
        "output_url": None,
        "error": None,
    }

    output_path = CAPTION_TEMP_DIR / f"captioned_{job_id}.mp4"
    thread = threading.Thread(
        target=render_captioned_video,
        args=(job_id, payload.video_id, payload.captions, output_path),
        daemon=True,
    )
    thread.start()

    return CaptionExportResponse(
        job_id=job_id,
        status="queued",
        status_url=f"/captioner/status/{job_id}",
    )


@router.get("/status/{job_id}", response_model=CaptionJobStatusResponse)
def caption_status(job_id: str):
    if job_id not in caption_job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    job = caption_job_store[job_id]
    return CaptionJobStatusResponse(
        job_id=job_id,
        status=str(job.get("status")),
        progress=int(job.get("progress", 0)),
        output_url=job.get("output_url"),
        error=job.get("error"),
    )


@router.get("/download/{job_id}")
def caption_download(job_id: str):
    if job_id not in caption_job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    output_path = caption_job_store[job_id].get("output_path")
    if not output_path:
        raise HTTPException(status_code=404, detail="Output not ready")
    file_path = Path(str(output_path))
    return FileResponse(path=file_path, filename=file_path.name, media_type="video/mp4")


@router.post("/srt")
def export_srt(payload: SrtExportRequest):
    if not payload.captions:
        raise HTTPException(status_code=400, detail="No captions to export")
    content = build_srt(payload.captions)
    filename = payload.file_name or "transcript.srt"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return PlainTextResponse(content, headers=headers, media_type="text/plain")



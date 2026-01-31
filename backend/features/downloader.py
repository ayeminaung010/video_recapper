from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

try:
    from yt_dlp import YoutubeDL
except Exception:  # pragma: no cover - optional dependency at runtime
    YoutubeDL = None  # type: ignore[assignment]

logger = logging.getLogger("movie-recap")

router = APIRouter(prefix="/downloader", tags=["downloader"])

DOWNLOAD_DIR = Path(__file__).resolve().parent.parent / "downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


class DownloaderMode(str):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    XIAOHONGSHU = "xiaohongshu"


MODE_DOMAINS = {
    DownloaderMode.YOUTUBE: ("youtube.com", "youtu.be"),
    DownloaderMode.TIKTOK: ("tiktok.com",),
    DownloaderMode.XIAOHONGSHU: ("xiaohongshu.com", "xhslink.com"),
}


downloader_job_store: Dict[str, Dict[str, object]] = {}


class DownloaderStartRequest(BaseModel):
    url: str = Field(..., min_length=5)
    mode: str = Field(..., pattern="^(youtube|tiktok|xiaohongshu)$")
    quality: str = Field(..., pattern="^(720p|1080p)$")


class DownloaderStartResponse(BaseModel):
    job_id: str
    status: str
    status_url: str


class DownloaderStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    output_url: Optional[str] = None
    error: Optional[str] = None
    quality_used: Optional[str] = None
    container_used: Optional[str] = None


class DownloaderDownloadResponse(BaseModel):
    job_id: str
    output_url: str


def _validate_url(url: str, mode: str) -> None:
    if not url:
        raise HTTPException(status_code=400, detail="URL is required.")
    domains = MODE_DOMAINS.get(mode)
    if not domains:
        raise HTTPException(status_code=400, detail="Unsupported download mode.")
    if not any(domain in url for domain in domains):
        raise HTTPException(
            status_code=400,
            detail=f"URL does not match {mode} domain(s).",
        )


def _schedule_cleanup(job_id: str, output_path: Path, delay: int = 60 * 30) -> None:
    def _cleanup() -> None:
        try:
            if output_path.exists():
                output_path.unlink()
        finally:
            downloader_job_store.pop(job_id, None)

    timer = threading.Timer(delay, _cleanup)
    timer.daemon = True
    timer.start()


def _run_download(
    job_id: str, url: str, mode: str, quality: str, output_base_path: Path
) -> None:
    if YoutubeDL is None:
        downloader_job_store[job_id]["status"] = "failed"
        downloader_job_store[job_id]["error"] = "yt-dlp is not installed."
        downloader_job_store[job_id]["progress"] = 0
        return

    def _progress_hook(data: dict) -> None:
        if data.get("status") == "downloading":
            downloaded = float(data.get("downloaded_bytes") or 0)
            total = float(data.get("total_bytes") or data.get("total_bytes_estimate") or 0)
            if total > 0:
                downloader_job_store[job_id]["progress"] = min(
                    95, int((downloaded / total) * 100)
                )
            else:
                downloader_job_store[job_id]["progress"] = min(
                    95, downloader_job_store[job_id].get("progress", 0) + 1
                )
        elif data.get("status") == "finished":
            downloader_job_store[job_id]["progress"] = 98

    try:
        downloader_job_store[job_id]["status"] = "processing"
        downloader_job_store[job_id]["progress"] = 5

        output_template = str(output_base_path.with_suffix(".%(ext)s"))

        requested_height = 1080 if quality == "1080p" else 720
        requested_container = "webm" if quality == "1080p" else "mp4"
        quality_used = quality
        container_used = requested_container

        # Build format string with fallback chain
        if quality == "1080p":
            # 1080p: prefer WebM (supports 1080p+), fallback to best
            format_string = "bestvideo[ext=webm]/bestvideo/best"
        else:
            # 720p: prefer MP4, fallback to best
            format_string = "bestvideo[ext=mp4]/bestvideo/best"

        ydl_opts = {
            "format": format_string,
            "outtmpl": output_template,
            "quiet": False,
            "no_warnings": False,
            "progress_hooks": [_progress_hook],
            "http_headers": {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/122.0.0.0 Safari/537.36"
                )
            },
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "web"],
                }
            },
        }

        try:
            logger.info(f"Starting download: quality={quality}, container={requested_container}, format={format_string}")
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
            logger.info(f"Download successful. File info: {info}")
        except Exception as exc:
            message = str(exc)
            logger.error(f"Download failed with error: {message}")
            raise

        # Find the downloaded file
        # yt-dlp will create a file with the extension based on the format/merge_output_format
        downloaded_files = list(output_base_path.parent.glob(f"{output_base_path.name}.*"))
        if not downloaded_files:
            raise RuntimeError(f"No downloaded file found in {output_base_path.parent}")
        
        # Use the most recently created file (in case of multiple)
        downloaded_path = max(downloaded_files, key=lambda p: p.stat().st_mtime)
        
        # Update container_used based on actual file extension
        actual_ext = downloaded_path.suffix.lstrip(".")
        if actual_ext in ["webm", "mp4", "mkv", "m4a"]:
            container_used = actual_ext
        
        logger.info(f"Found downloaded file: {downloaded_path} (ext: {actual_ext})")

        downloader_job_store[job_id]["status"] = "completed"
        downloader_job_store[job_id]["progress"] = 100
        downloader_job_store[job_id]["output_path"] = str(downloaded_path)
        downloader_job_store[job_id]["output_url"] = f"/downloader/download/{job_id}"
        downloader_job_store[job_id]["quality_used"] = quality_used
        downloader_job_store[job_id]["container_used"] = container_used

        _schedule_cleanup(job_id, downloaded_path)
    except Exception as exc:
        logger.exception("Download failed: %s", exc)
        downloader_job_store[job_id]["status"] = "failed"
        downloader_job_store[job_id]["error"] = str(exc)
        downloader_job_store[job_id]["progress"] = 0


@router.post("/start", response_model=DownloaderStartResponse)
def start_download(payload: DownloaderStartRequest):
    _validate_url(payload.url, payload.mode)

    job_id = uuid4().hex
    output_path = DOWNLOAD_DIR / f"download_{job_id}"

    downloader_job_store[job_id] = {
        "status": "queued",
        "progress": 0,
        "output_path": None,
        "output_url": None,
        "error": None,
        "mode": payload.mode,
        "url": payload.url,
        "quality": payload.quality,
        "quality_used": None,
        "container_used": None,
    }

    thread = threading.Thread(
        target=_run_download,
        args=(job_id, payload.url, payload.mode, payload.quality, output_path),
        daemon=True,
    )
    thread.start()

    return DownloaderStartResponse(
        job_id=job_id,
        status="queued",
        status_url=f"/downloader/status/{job_id}",
    )


@router.get("/status/{job_id}", response_model=DownloaderStatusResponse)
def download_status(job_id: str):
    if job_id not in downloader_job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    job = downloader_job_store[job_id]
    return DownloaderStatusResponse(
        job_id=job_id,
        status=str(job.get("status")),
        progress=int(job.get("progress", 0)),
        output_url=job.get("output_url"),
        error=job.get("error"),
        quality_used=job.get("quality_used"),
        container_used=job.get("container_used"),
    )


@router.get("/download/{job_id}")
def download_file(job_id: str):
    if job_id not in downloader_job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    output_path = downloader_job_store[job_id].get("output_path")
    if not output_path:
        raise HTTPException(status_code=404, detail="Output not ready")
    file_path = Path(str(output_path))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")
    media_type = "video/webm" if file_path.suffix.lower() == ".webm" else "video/mp4"
    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type=media_type,
    )

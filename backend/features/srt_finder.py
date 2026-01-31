from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from backend.features import captioner
from backend.features.captioner import (
    CaptionTranscribeAsyncResponse,
    CaptionTranscribeRequest,
    CaptionTranscribeStatusResponse,
    CaptionUploadResponse,
    SrtExportRequest,
)

router = APIRouter(prefix="/srt-finder", tags=["srt-finder"])


@router.post("/upload", response_model=CaptionUploadResponse)
async def srt_upload(video: UploadFile = File(...)):
    # Delegate to captioner upload to keep storage and validation consistent.
    return await captioner.caption_upload(video)  # type: ignore[arg-type]


@router.post("/transcribe-async", response_model=CaptionTranscribeAsyncResponse)
def srt_transcribe_async(payload: CaptionTranscribeRequest):
    # Reuse captioner async transcription with language and target language hints.
    return captioner.caption_transcribe_async(payload)


@router.get("/transcribe-status/{job_id}", response_model=CaptionTranscribeStatusResponse)
def srt_transcribe_status(job_id: str):
    return captioner.caption_transcribe_status(job_id)


@router.post("/srt")
def srt_export(payload: SrtExportRequest):
    return captioner.export_srt(payload)

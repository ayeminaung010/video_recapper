# Backend

FastAPI service for video recap rendering.

## Prerequisites

- Python 3.10+ (recommended)
- FFmpeg available in PATH (required by MoviePy)
- ImageMagick (required by MoviePy TextClip for captions)

## Setup

From the repository root:

1. Create a virtual environment (one-time).

   - Windows (PowerShell or CMD):
     - python -m venv .venv

2. Activate the virtual environment.

   - PowerShell:
     - .venv\Scripts\Activate.ps1
   - CMD:
     - .venv\Scripts\activate

3. Install dependencies.

   - pip install -r backend\requirements.txt

  4. (Optional) Install PyTorch with CUDA if you have a compatible GPU.

     - CPU only (default):
       - pip install torch==2.3.1
     - CUDA (example):
       - pip install torch==2.3.1 --index-url https://download.pytorch.org/whl/cu121

  5. Set a Myanmar font path (optional, but recommended).

     - PowerShell:
       - $env:CAPTION_FONT_PATH="C:\Windows\Fonts\Pyidaungsu.ttf"
     - CMD:
       - set CAPTION_FONT_PATH=C:\Windows\Fonts\Pyidaungsu.ttf

## Run the API

From the repository root (with venv activated):

- python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

The API will be available at:

- http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs

## Captioner Endpoints

- POST /captioner/upload
  - Form-data: video (MP4)
  - Returns: video_id

- POST /captioner/transcribe
  - JSON: {"video_id": "...", "model": "small"|"medium"}
  - Returns: captions list with timestamps

- POST /captioner/export
  - JSON: {"video_id": "...", "captions": [...]}
  - Returns: job_id

- GET /captioner/status/{job_id}
  - Returns: status, progress, output_url

- GET /captioner/download/{job_id}
  - Streams the exported MP4

## Notes

- Logs are written to backend/logs/app.log.
- If MoviePy fails to render, ensure FFmpeg is installed and accessible from PATH.
- If caption rendering fails, verify ImageMagick is installed and configured for MoviePy.


- cd /d C:\Users\Aye MIn Aung\Downloads\Tiktok-work\video_recap_tools && backend\.venv\Scripts\activate && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
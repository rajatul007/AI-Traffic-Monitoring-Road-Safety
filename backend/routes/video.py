from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
import os
import uuid
import aiofiles
from datetime import datetime
from backend.models.database import get_database, in_memory_store

router = APIRouter(prefix="/api/video", tags=["Video Processing"])

UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory progress tracker
video_jobs = {}

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported video format: {ext}. Supported formats: MP4, AVI, MOV, MKV")

    video_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{video_id}_{filename}")

    try:
        async with aiofiles.open(save_path, 'wb') as out_file:
            content = await file.read()
            # 100MB max validation
            if len(content) > 100 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Video file exceeds 100MB size limit.")
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    video_jobs[video_id] = {
        "id": video_id,
        "filename": filename,
        "path": save_path,
        "size": len(content),
        "status": "Uploaded",
        "progress": 0,
        "uploadedAt": datetime.utcnow().isoformat()
    }

    return {
        "videoId": video_id,
        "filename": filename,
        "sizeBytes": len(content),
        "status": "Uploaded",
        "previewUrl": f"/api/video/file/{video_id}"
    }

@router.get("/{video_id}")
async def get_video_status(video_id: str):
    if video_id not in video_jobs:
        raise HTTPException(status_code=404, detail="Video job not found")
    return video_jobs[video_id]

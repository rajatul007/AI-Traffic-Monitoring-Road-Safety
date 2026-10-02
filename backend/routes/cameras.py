from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime
import uuid
from backend.models.schemas import CameraCreate, CameraResponse
from backend.models.database import get_database, in_memory_store

router = APIRouter(prefix="/api/cameras", tags=["Camera Management"])

DEFAULT_CAMERAS = [
    {
        "id": "cam-01",
        "name": "Local Laptop Webcam",
        "location": "Control Room / Demo Station",
        "source": "Local Webcam",
        "status": "Active",
        "createdAt": datetime.utcnow()
    },
    {
        "id": "cam-02",
        "name": "Junction 4 - Northbound",
        "location": "North Corridor Checkpoint",
        "source": "RTSP Stream / Mock Feed 1",
        "status": "Active",
        "createdAt": datetime.utcnow()
    },
    {
        "id": "cam-03",
        "name": "Highway Overpass 08",
        "location": "Sector 14 Expressway",
        "source": "RTSP Stream / Mock Feed 2",
        "status": "Inactive",
        "createdAt": datetime.utcnow()
    }
]

# Initialize default cameras if empty
if not in_memory_store["cameras"]:
    in_memory_store["cameras"].extend(DEFAULT_CAMERAS)

@router.get("/")
async def list_cameras():
    db = get_database()
    if db is not None:
        cursor = db.cameras.find({})
        items = await cursor.to_list(length=100)
        for i in items:
            i["id"] = str(i.pop("_id", ""))
        return items
    return in_memory_store["cameras"]

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_camera(camera: CameraCreate):
    db = get_database()
    cam_doc = {
        "id": f"cam-{uuid.uuid4().hex[:6]}",
        "name": camera.name,
        "location": camera.location,
        "source": camera.source,
        "status": camera.status,
        "createdAt": datetime.utcnow()
    }
    if db is not None:
        await db.cameras.insert_one(cam_doc)
    else:
        in_memory_store["cameras"].append(cam_doc)
    return cam_doc

@router.put("/{camera_id}")
async def update_camera(camera_id: str, camera: CameraCreate):
    db = get_database()
    if db is not None:
        res = await db.cameras.update_one(
            {"id": camera_id},
            {"$set": camera.dict()}
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Camera not found")
        return {"message": "Camera updated", "id": camera_id}
    else:
        target = next((c for c in in_memory_store["cameras"] if c["id"] == camera_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Camera not found")
        target.update(camera.dict())
        return target

@router.delete("/{camera_id}")
async def delete_camera(camera_id: str):
    db = get_database()
    if db is not None:
        res = await db.cameras.delete_one({"id": camera_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Camera not found")
    else:
        in_memory_store["cameras"] = [c for c in in_memory_store["cameras"] if c["id"] != camera_id]
    return {"message": "Camera deleted successfully", "id": camera_id}

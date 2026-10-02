from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List
from datetime import datetime
from backend.models.schemas import TrafficEventCreate, TrafficEventResponse
from backend.models.database import get_database, in_memory_store

router = APIRouter(prefix="/api/violations", tags=["Violations"])

@router.get("/")
async def get_violations(
    violation_type: Optional[str] = Query(None, alias="type"),
    status: Optional[str] = Query(None),
    vehicle: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None, alias="camera")
):
    db = get_database()
    query = {}
    if violation_type:
        query["eventType"] = violation_type
    if status:
        query["status"] = status
    if vehicle:
        query["vehicleType"] = vehicle
    if source:
        query["source"] = source
    if camera_id:
        query["cameraId"] = camera_id

    if db is not None:
        cursor = db.traffic_events.find(query).sort("timestamp", -1)
        events = await cursor.to_list(length=100)
        # Convert _id to id
        for e in events:
            e["id"] = str(e.pop("_id", ""))
        return events
    else:
        results = in_memory_store["traffic_events"]
        # Apply filters
        filtered = []
        for r in results:
            if violation_type and r.get("eventType") != violation_type:
                continue
            if status and r.get("status") != status:
                continue
            if vehicle and r.get("vehicleType") != vehicle:
                continue
            if source and r.get("source") != source:
                continue
            if camera_id and r.get("cameraId") != camera_id:
                continue
            filtered.append(r)
        return sorted(filtered, key=lambda x: str(x.get("timestamp", "")), reverse=True)

@router.get("/{violation_id}")
async def get_violation(violation_id: str):
    db = get_database()
    if db is not None:
        doc = await db.traffic_events.find_one({"id": violation_id})
        if not doc:
            doc = await db.traffic_events.find_one({"_id": violation_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Violation record not found")
        doc["id"] = str(doc.pop("_id", ""))
        return doc
    else:
        doc = next((e for e in in_memory_store["traffic_events"] if e.get("id") == violation_id), None)
        if not doc:
            raise HTTPException(status_code=404, detail="Violation record not found")
        return doc

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_violation(event: TrafficEventCreate):
    db = get_database()
    event_dict = event.dict()
    event_dict["id"] = f"EVT-{datetime.utcnow().strftime('%Y%m%d')}-{len(in_memory_store['traffic_events']) + 101}"
    event_dict["timestamp"] = event.timestamp.isoformat()

    if db is not None:
        await db.traffic_events.insert_one(event_dict)
    else:
        in_memory_store["traffic_events"].append(event_dict)

    return event_dict

@router.patch("/{violation_id}/status")
async def update_violation_status(violation_id: str, new_status: str = Query(...)):
    db = get_database()
    if db is not None:
        res = await db.traffic_events.update_one({"id": violation_id}, {"$set": {"status": new_status}})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Violation not found")
    else:
        doc = next((e for e in in_memory_store["traffic_events"] if e.get("id") == violation_id), None)
        if not doc:
            raise HTTPException(status_code=404, detail="Violation not found")
        doc["status"] = new_status
    return {"message": "Status updated successfully", "id": violation_id, "status": new_status}

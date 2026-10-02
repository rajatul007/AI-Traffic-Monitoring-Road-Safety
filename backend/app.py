import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.models.database import connect_to_mongo, close_mongo_connection
from backend.routes import auth, video, traffic, violations, cameras, analytics
from backend.ai.helmet_detector import HelmetDetector

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("traffic_app")

app = FastAPI(
    title="AI-Based Intelligent Traffic Monitoring and Road Safety System",
    description="Full-stack FastAPI backend for YOLOv8 traffic analysis, object tracking, and ANPR plate recognition",
    version="1.0.0"
)

# CORS setup
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allow all during college demo/development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for evidence snapshots & uploaded videos
os.makedirs("backend/evidence", exist_ok=True)
os.makedirs("backend/uploads", exist_ok=True)
app.mount("/evidence", StaticFiles(directory="backend/evidence"), name="evidence")

# Include API Routers
app.include_router(auth.router)
app.include_router(video.router)
app.include_router(traffic.router)
app.include_router(violations.router)
app.include_router(cameras.router)
app.include_router(analytics.router)

# Model status check endpoint
helmet_detector = HelmetDetector("models/helmet_model.pt")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "system": "AI-Based Intelligent Traffic Monitoring and Road Safety System",
        "yolo_engine": "Ultralytics YOLOv8",
        "helmet_model": helmet_detector.get_status()
    }

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing Traffic Monitoring System...")
    await connect_to_mongo()

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Shutting down Traffic Monitoring System...")
    await close_mongo_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)

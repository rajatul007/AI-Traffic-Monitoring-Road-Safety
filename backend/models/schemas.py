from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "Traffic Officer"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    createdAt: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TrafficEventBase(BaseModel):
    eventType: str # "Wrong Way", "Red Signal", "Helmet Violation", "Speeding"
    vehicleType: str # "Car", "Motorcycle", "Bus", "Truck"
    vehicleNumber: Optional[str] = "Number Plate Not Clearly Recognized"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str = "Live Camera" # "Upload Video" or "Live Camera"
    cameraId: Optional[str] = "CAM-01"
    confidence: float
    evidenceImage: Optional[str] = None
    status: str = "Pending" # "Pending", "Verified", "Dismissed"

class TrafficEventCreate(TrafficEventBase):
    pass

class TrafficEventResponse(TrafficEventBase):
    id: str

class TrafficStatistics(BaseModel):
    id: Optional[str] = None
    source: str
    cameraId: Optional[str] = "CAM-01"
    vehicleCount: int
    vehicleTypes: Dict[str, int] = {
        "cars": 0,
        "motorcycles": 0,
        "buses": 0,
        "trucks": 0,
        "bicycles": 0
    }
    trafficLevel: str = "LOW" # "LOW", "MODERATE", "HIGH"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CameraBase(BaseModel):
    name: str
    location: str
    source: str = "Local Webcam"
    status: str = "Active" # "Active", "Inactive"

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: str
    createdAt: datetime

class SettingsConfig(BaseModel):
    confidenceThreshold: float = 0.50
    countingLineY: float = 0.65
    densityThresholdLow: int = 10
    densityThresholdModerate: int = 25
    enableHelmetDetection: bool = True
    enableWrongWayDetection: bool = True
    enableSignalViolation: bool = True
    allowedDirection: str = "top-to-bottom" # or "bottom-to-top"

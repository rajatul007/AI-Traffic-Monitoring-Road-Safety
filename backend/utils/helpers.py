import base64
import os
import uuid
from datetime import datetime
from typing import Dict, Any

def calculate_traffic_density(vehicle_count: int, low_thresh: int = 10, mod_thresh: int = 25) -> str:
    """Calculates density level based on configurable thresholds"""
    if vehicle_count <= low_thresh:
        return "LOW"
    elif vehicle_count <= mod_thresh:
        return "MODERATE"
    else:
        return "HIGH"

def save_evidence_image(base64_or_bytes, evidence_dir: str = "evidence") -> str:
    """Saves image bytes or base64 to evidence directory and returns path or relative URL"""
    os.makedirs(evidence_dir, exist_ok=True)
    filename = f"violation_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.jpg"
    filepath = os.path.join(evidence_dir, filename)

    if isinstance(base64_or_bytes, str):
        if "," in base64_or_bytes:
            base64_or_bytes = base64_or_bytes.split(",")[1]
        image_data = base64.b64decode(base64_or_bytes)
    else:
        image_data = base64_or_bytes

    with open(filepath, "wb") as f:
        f.write(image_data)
    
    return f"/evidence/{filename}"

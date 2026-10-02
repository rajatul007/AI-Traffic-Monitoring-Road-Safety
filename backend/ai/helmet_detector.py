import os
import logging
from typing import Dict, Any, List

logger = logging.getLogger("helmet_detector")

class HelmetDetector:
    def __init__(self, model_path: str = "models/helmet_model.pt"):
        self.model_path = model_path
        self.is_installed = os.path.exists(model_path)
        self.model = None

        if self.is_installed:
            try:
                from ultralytics import YOLO
                self.model = YOLO(model_path)
                logger.info(f"Custom Helmet Detection model loaded from {model_path}")
            except Exception as e:
                logger.error(f"Failed to load custom helmet model: {e}")
                self.is_installed = False
        else:
            logger.info("Custom helmet model (helmet_model.pt) not installed. Feature disabled per project specification.")

    def get_status(self) -> Dict[str, Any]:
        return {
            "installed": self.is_installed,
            "model_path": self.model_path,
            "message": "Helmet Detection Model Installed" if self.is_installed else "Helmet Detection Model Not Installed. Place custom weights at models/helmet_model.pt to enable."
        }

    def detect_helmets(self, rider_crop) -> List[Dict[str, Any]]:
        """
        Runs inference ONLY if custom model is installed.
        Returns list of detections with classes: 'Helmet' or 'No Helmet'.
        No fake detections are returned if model is missing.
        """
        if not self.is_installed or self.model is None:
            return []
        
        try:
            results = self.model(rider_crop, conf=0.45)
            detections = []
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = self.model.names.get(cls_id, f"class_{cls_id}")
                    conf = float(box.conf[0])
                    coords = box.xyxy[0].tolist()
                    detections.append({
                        "class": cls_name,
                        "confidence": conf,
                        "bbox": coords
                    })
            return detections
        except Exception as e:
            logger.error(f"Error during helmet detection: {e}")
            return []

import logging
from typing import List, Dict, Any
import numpy as np

logger = logging.getLogger("yolo_detector")

# COCO vehicle & safety relevant class IDs:
# 0: person, 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck, 9: traffic light
TARGET_CLASSES = {
    0: "Person",
    1: "Bicycle",
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck",
    9: "Traffic Light"
}

class YOLODetector:
    def __init__(self, model_path: str = "yolov8n.pt", conf_thresh: float = 0.50):
        self.model_path = model_path
        self.conf_thresh = conf_thresh
        self.model = None
        self.load_model()

    def load_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            logger.info(f"Ultralytics YOLO model loaded successfully ({self.model_path}).")
        except Exception as e:
            logger.error(f"Failed to initialize Ultralytics YOLO: {e}. Fallback to OpenCV DNN if needed.")
            self.model = None

    def detect(self, frame: np.ndarray, conf_override: float = None) -> List[Dict[str, Any]]:
        threshold = conf_override if conf_override is not None else self.conf_thresh
        if self.model is None:
            return []

        try:
            results = self.model(frame, conf=threshold, verbose=False)
            detections = []
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    if cls_id in TARGET_CLASSES:
                        conf = float(box.conf[0])
                        xyxy = box.xyxy[0].tolist()
                        detections.append({
                            "class": TARGET_CLASSES[cls_id],
                            "confidence": round(conf, 3),
                            "bbox": [round(c, 1) for c in xyxy] # [x1, y1, x2, y2]
                        })
            return detections
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return []

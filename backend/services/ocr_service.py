import re
import logging
import cv2
import numpy as np
from typing import Dict, Any, Optional

logger = logging.getLogger("ocr_service")

class ANPRService:
    def __init__(self, languages: list = ['en']):
        self.reader = None
        try:
            import easyocr
            self.reader = easyocr.Reader(languages, gpu=False)
            logger.info("EasyOCR initialized successfully.")
        except Exception as e:
            logger.warning(f"EasyOCR initialization deferred or failed: {e}")

    def preprocess_plate(self, plate_crop: np.ndarray) -> np.ndarray:
        """
        Applies grayscale conversion, bilateral filtering to reduce noise while preserving edges,
        and adaptive thresholding.
        """
        if plate_crop is None or plate_crop.size == 0:
            return plate_crop
        try:
            gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
            # Bilateral filter for edge-preserving noise reduction
            filtered = cv2.bilateralFilter(gray, 11, 17, 17)
            # Contrast enhancement with CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(filtered)
            return enhanced
        except Exception:
            return plate_crop

    def extract_license_plate(self, image: np.ndarray, vehicle_bbox: list) -> Dict[str, Any]:
        """
        Crops lower portion of vehicle bounding box (where plates are typically mounted),
        preprocesses the image, and invokes EasyOCR.
        """
        if self.reader is None or image is None:
            return {
                "recognized": False,
                "plate_number": "Number Plate Not Clearly Recognized",
                "confidence": 0.0
            }

        try:
            x1, y1, x2, y2 = [int(v) for v in vehicle_bbox]
            h = y2 - y1
            w = x2 - x1
            if h <= 20 or w <= 20:
                return {
                    "recognized": False,
                    "plate_number": "Number Plate Not Clearly Recognized",
                    "confidence": 0.0
                }

            # Plate is predominantly in the lower 40% of the vehicle box
            plate_y1 = int(y1 + h * 0.6)
            plate_crop = image[plate_y1:y2, x1:x2]

            preprocessed = self.preprocess_plate(plate_crop)
            results = self.reader.readtext(preprocessed)

            best_text = ""
            best_conf = 0.0

            for (_, text, conf) in results:
                cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
                # Standard license plate alphanumeric pattern (typically 6 to 11 chars)
                if len(cleaned) >= 5 and conf > best_conf:
                    best_text = cleaned
                    best_conf = conf

            if best_conf > 0.40 and len(best_text) >= 5:
                return {
                    "recognized": True,
                    "plate_number": best_text,
                    "confidence": round(best_conf, 2)
                }
            else:
                return {
                    "recognized": False,
                    "plate_number": "Number Plate Not Clearly Recognized",
                    "confidence": round(best_conf, 2)
                }
        except Exception as e:
            logger.error(f"License plate OCR error: {e}")
            return {
                "recognized": False,
                "plate_number": "Number Plate Not Clearly Recognized",
                "confidence": 0.0
            }

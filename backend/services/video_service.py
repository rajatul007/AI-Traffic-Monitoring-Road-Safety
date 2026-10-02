import cv2
import os
import time
import logging
from typing import Dict, Any, Callable
from backend.ai.yolo_detector import YOLODetector
from backend.ai.tracker import VehicleTracker
from backend.services.ocr_service import ANPRService
from backend.utils.helpers import calculate_traffic_density, save_evidence_image

logger = logging.getLogger("video_service")

class VideoProcessingService:
    def __init__(self, yolo_detector: YOLODetector, ocr_service: ANPRService):
        self.detector = yolo_detector
        self.ocr_service = ocr_service

    def process_video_file(
        self,
        video_path: str,
        settings: Dict[str, Any],
        on_progress: Callable[[Dict[str, Any]], None] = None
    ) -> Dict[str, Any]:
        """
        Processes an uploaded video file frame-by-frame with real YOLO inference,
        object tracking, line crossing vehicle counts, and violation detection.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        tracker = VehicleTracker(max_disappeared=12, max_distance=100.0)
        line_y = height * settings.get("countingLineY", 0.65)
        conf_thresh = settings.get("confidenceThreshold", 0.50)

        vehicle_totals = {"cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0}
        total_vehicles_counted = 0
        violations_detected = []
        frame_index = 0

        # Sample every Nth frame to optimize processing speed on standard laptop hardware
        frame_step = max(1, int(round(fps / 10.0))) # ~10 FPS target detection rate

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_index += 1
            if frame_index % frame_step != 0:
                continue

            # Run YOLO Detection
            detections = self.detector.detect(frame, conf_override=conf_thresh)
            tracked_boxes = tracker.update(detections)

            # Check line crossing
            new_crossed, increments = tracker.check_line_crossing(line_y)
            if new_crossed > 0:
                total_vehicles_counted += new_crossed
                for k, v in increments.items():
                    vehicle_totals[k] += v

            # Check Wrong-Way Violations if enabled
            if settings.get("enableWrongWayDetection", True):
                wrong_way_ids = tracker.check_wrong_way(
                    allowed_direction=settings.get("allowedDirection", "top-to-bottom")
                )
                for w_id in wrong_way_ids:
                    # Check if already recorded
                    if not any(v.get("track_id") == w_id and v.get("type") == "Wrong Way" for v in violations_detected):
                        # Capture evidence snapshot
                        _, buffer = cv2.imencode('.jpg', frame)
                        evidence_url = save_evidence_image(buffer.tobytes())
                        v_type = tracker.object_classes.get(w_id, "Vehicle")
                        
                        # OCR Plate check
                        plate_result = {"plate_number": "Number Plate Not Clearly Recognized", "confidence": 0.0}
                        # Find corresponding box
                        for box in tracked_boxes:
                            if box.get("track_id") == w_id:
                                plate_result = self.ocr_service.extract_license_plate(frame, box["bbox"])
                                break

                        violations_detected.append({
                            "track_id": w_id,
                            "type": "Wrong Way",
                            "vehicle": v_type,
                            "confidence": 0.88,
                            "evidence": evidence_url,
                            "plate_number": plate_result["plate_number"],
                            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                        })

            current_density = calculate_traffic_density(
                len(tracked_boxes),
                settings.get("densityThresholdLow", 10),
                settings.get("densityThresholdModerate", 25)
            )

            if on_progress:
                on_progress({
                    "frame": frame_index,
                    "total_frames": total_frames,
                    "active_vehicles": len(tracked_boxes),
                    "total_counted": total_vehicles_counted,
                    "traffic_level": current_density,
                    "violations_count": len(violations_detected)
                })

        cap.release()

        return {
            "total_frames_analyzed": frame_index,
            "total_vehicles_counted": total_vehicles_counted,
            "vehicle_breakdown": vehicle_totals,
            "violations": violations_detected,
            "final_traffic_density": calculate_traffic_density(
                total_vehicles_counted,
                settings.get("densityThresholdLow", 10),
                settings.get("densityThresholdModerate", 25)
            )
        }

import numpy as np
from typing import List, Dict, Tuple, Any

class VehicleTracker:
    def __init__(self, max_disappeared: int = 15, max_distance: float = 80.0):
        self.next_object_id = 1
        # object_id -> centroid (x, y)
        self.objects: Dict[int, Tuple[float, float]] = {}
        # object_id -> list of centroids [(x, y), ...]
        self.trajectories: Dict[int, List[Tuple[float, float]]] = {}
        # object_id -> object class (e.g., 'car')
        self.object_classes: Dict[int, str] = {}
        # object_id -> disappeared count
        self.disappeared: Dict[int, int] = {}
        # set of object IDs that have already crossed the counting line
        self.counted_ids = set()
        
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid: Tuple[float, float], obj_class: str) -> int:
        obj_id = self.next_object_id
        self.next_object_id += 1
        self.objects[obj_id] = centroid
        self.trajectories[obj_id] = [centroid]
        self.object_classes[obj_id] = obj_class
        self.disappeared[obj_id] = 0
        return obj_id

    def deregister(self, obj_id: int):
        if obj_id in self.objects:
            del self.objects[obj_id]
        if obj_id in self.disappeared:
            del self.disappeared[obj_id]
        if obj_id in self.object_classes:
            del self.object_classes[obj_id]
        if obj_id in self.trajectories:
            del self.trajectories[obj_id]

    def update(self, detected_boxes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Updates tracked objects based on new bounding box detections.
        Each detected_box: {"bbox": [x1, y1, x2, y2], "class": "car", "confidence": 0.89}
        Returns list of detections augmented with "track_id".
        """
        if len(detected_boxes) == 0:
            for obj_id in list(self.disappeared.keys()):
                self.disappeared[obj_id] += 1
                if self.disappeared[obj_id] > self.max_disappeared:
                    self.deregister(obj_id)
            return []

        input_centroids = []
        for box in detected_boxes:
            b = box["bbox"]
            cx = (b[0] + b[2]) / 2.0
            cy = (b[1] + b[3]) / 2.0
            input_centroids.append((cx, cy))

        if len(self.objects) == 0:
            for i, box in enumerate(detected_boxes):
                obj_id = self.register(input_centroids[i], box["class"])
                box["track_id"] = obj_id
            return detected_boxes

        object_ids = list(self.objects.keys())
        object_centroids = list(self.objects.values())

        # Compute euclidean distance between existing object centroids and new input centroids
        D = np.zeros((len(object_centroids), len(input_centroids)))
        for i, (ox, oy) in enumerate(object_centroids):
            for j, (ix, iy) in enumerate(input_centroids):
                D[i, j] = np.sqrt((ox - ix) ** 2 + (oy - iy) ** 2)

        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        used_rows = set()
        used_cols = set()

        for (row, col) in zip(rows, cols):
            if row in used_rows or col in used_cols:
                continue

            if D[row, col] > self.max_distance:
                continue

            obj_id = object_ids[row]
            self.objects[obj_id] = input_centroids[col]
            self.trajectories[obj_id].append(input_centroids[col])
            if len(self.trajectories[obj_id]) > 30:
                self.trajectories[obj_id].pop(0)
            self.disappeared[obj_id] = 0
            self.object_classes[obj_id] = detected_boxes[col]["class"]
            detected_boxes[col]["track_id"] = obj_id

            used_rows.add(row)
            used_cols.add(col)

        unused_rows = set(range(0, D.shape[0])).difference(used_rows)
        unused_cols = set(range(0, D.shape[1])).difference(used_cols)

        for row in unused_rows:
            obj_id = object_ids[row]
            self.disappeared[obj_id] += 1
            if self.disappeared[obj_id] > self.max_disappeared:
                self.deregister(obj_id)

        for col in unused_cols:
            obj_id = self.register(input_centroids[col], detected_boxes[col]["class"])
            detected_boxes[col]["track_id"] = obj_id

        return detected_boxes

    def check_line_crossing(self, line_y: float) -> Tuple[int, Dict[str, int]]:
        """
        Checks if any tracked vehicle crossed the counting line in the recent frame.
        Returns: (new_crossed_count, vehicle_type_increments)
        """
        new_crossed = 0
        increments = {"cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0}

        for obj_id, traj in self.trajectories.items():
            if obj_id in self.counted_ids or len(traj) < 2:
                continue
            prev_y = traj[-2][1]
            curr_y = traj[-1][1]

            # Crossed downwards or upwards across line_y
            if (prev_y < line_y <= curr_y) or (prev_y > line_y >= curr_y):
                self.counted_ids.add(obj_id)
                new_crossed += 1
                cls = self.object_classes.get(obj_id, "car").lower()
                if "motorcycle" in cls or "bike" in cls:
                    increments["motorcycles"] += 1
                elif "bus" in cls:
                    increments["buses"] += 1
                elif "truck" in cls:
                    increments["trucks"] += 1
                else:
                    increments["cars"] += 1

        return new_crossed, increments

    def check_wrong_way(self, allowed_direction: str = "top-to-bottom", min_delta_y: float = 20.0) -> List[int]:
        """
        Detects if vehicles are moving opposite to configured traffic flow.
        """
        violator_ids = []
        for obj_id, traj in self.trajectories.items():
            if len(traj) < 4:
                continue
            start_y = traj[0][1]
            end_y = traj[-1][1]
            delta_y = end_y - start_y

            if allowed_direction == "top-to-bottom" and delta_y < -min_delta_y:
                violator_ids.append(obj_id)
            elif allowed_direction == "bottom-to-top" and delta_y > min_delta_y:
                violator_ids.append(obj_id)

        return violator_ids

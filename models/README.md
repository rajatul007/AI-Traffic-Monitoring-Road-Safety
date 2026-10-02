# AI Models Directory

This directory stores the neural network model weights for the Traffic Monitoring and Road Safety System.

## Supported Models

### 1. Primary Vehicle & Road User Detection (YOLOv8)
- **Model**: `yolov8n.pt` / `yolov8s.pt` (Ultralytics YOLOv8)
- **Classes**: Car, Motorcycle, Bus, Truck, Bicycle, Person, Traffic Light
- Automatically downloaded by Ultralytics on first run if not present.

### 2. Custom Helmet Detection Model (Optional / Modular)
- **Expected File**: `models/helmet_model.pt`
- **Classes Required**:
  - `0`: Rider
  - `1`: Helmet
  - `2`: No Helmet

### Important Note on Integrity
In accordance with project integrity standards:
If `models/helmet_model.pt` is **not installed**, the system explicitly displays:
```
Helmet Detection Model Not Installed
```
The application will not fake helmet detection results.

### Training Your Own Helmet Model
To train your own helmet detection model using YOLOv8:
1. Prepare dataset in YOLO format (images + labels in `data.yaml`).
2. Run training:
   ```bash
   yolo detect train model=yolov8n.pt data=helmet_dataset.yaml epochs=50 imgsz=640
   ```
3. Copy the resulting `best.pt` file to this folder and rename it:
   ```bash
   cp runs/detect/train/weights/best.pt models/helmet_model.pt
   ```
4. Restart the backend. The system will automatically detect the custom weights and enable live helmet compliance checks!

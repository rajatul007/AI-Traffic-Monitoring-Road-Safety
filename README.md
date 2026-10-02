# AI-Based Intelligent Traffic Monitoring and Road Safety System

An end-to-end computer vision and deep learning system developed for real-time traffic analysis, vehicle counting, directional trajectory tracking, road safety violation detection, and automated number plate recognition (ANPR / OCR).

---

## 1. System Architecture & Flow

```text
                        TRAFFIC MONITORING SYSTEM
                                   |
                     +-------------+-------------+
                     |                           |
             MODE 1: UPLOAD VIDEO        MODE 2: LIVE CAMERA
                     |                           |
                     v                           v
              Video Processing             Webcam Stream
                     |                           |
                     +-------------+-------------+
                                   |
                                   v
                            YOLO Detection
                        (Cars, Bikes, Buses, Trucks)
                                   |
                                   v
                            Object Tracking
                      (Persistent Centroid IDs)
                                   |
                                   v
                      Traffic & Safety Analysis
                                   |
                     +-------------+-------------+
                     |                           |
             Vehicle Counting            Violations Detection
          (Virtual Line Crossing)     (Wrong-Way / Red Light)
                     |                           |
                     +-------------+-------------+
                                   |
                                   v
                          Number Plate OCR
                        (ANPR Plate Extraction)
                                   |
                                   v
                             MongoDB Store
                     (Events, Counts, Cameras, Users)
                                   |
                                   v
                        Analytics & Dashboard UI
```

---

## 2. Core Functional Capabilities

### A. Dual Input Modes
1. **Mode 1 — Upload Video**:
   - Supports MP4, AVI, MOV, MKV, and WebM video formats.
   - Real-time frame extraction via OpenCV / HTML5 Video Canvas.
   - Bounding boxes, confidence scores, and tracking IDs rendered on every frame.
   - Built-in simulation sample clip loader for rapid offline demonstration.

2. **Mode 2 — Live Camera**:
   - Direct webcam capture using the browser `navigator.mediaDevices.getUserMedia()` API.
   - Complete permission denial and missing device handling with human-readable diagnostic messages.
   - Live bounding boxes, live vehicle counters, and on-demand "Capture Evidence" button.

### B. Intelligent Vehicle Counting & Density
- **Centroid Object Tracking**: Prevents duplicate counting of the same vehicle across frames.
- **Configurable Virtual Counting Line**: Increments counts for Cars, Motorcycles, Buses, and Trucks when crossing the line.
- **Dynamic Density Engine**: Categorizes roadway state into `LOW`, `MODERATE`, or `HIGH` density.

### C. Road Safety Violation Engine
- **Wrong-Way Detection**: Tracks vehicle trajectory vectors against configured road flow.
- **Red Signal Crossing**: Detects vehicles breaching virtual stop lines during red signal phases.
- **Motorcycle Helmet Detection Architecture**:
  - Implements modular architecture for `models/helmet_model.pt`.
  - **No Fake Detections**: If the custom helmet weights file is not present, the system explicitly reports `Helmet Detection Model Not Installed` with training instructions.

### D. Automated Number Plate Recognition (ANPR / OCR)
- Identifies lower plate region of detected vehicles.
- Applies grayscale, bilateral filtering, and contrast enhancement.
- Runs OCR extraction (EasyOCR in Python / Tesseract in Browser).
- Returns verified license plate or reports `Number Plate Not Clearly Recognized`.

### E. E-Challan & Evidence Registry
- Full evidence snapshot dossiers capturing image frames, timestamps, camera IDs, and confidence percentages.
- Administrative status management (`Pending`, `Verified`, `Dismissed`).
- Print-ready e-challan formatting.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Browser AI Engine** | TensorFlow.js, COCO-SSD (MobileNet/YOLO) |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn, Motor, Pydantic, Express / Node |
| **Computer Vision** | Ultralytics YOLOv8, OpenCV (`cv2`), EasyOCR / Tesseract |
| **Database** | MongoDB (`traffic_events`, `traffic_statistics`, `cameras`, `users`) |
| **Authentication** | HMAC-SHA256 / Bcrypt password hashing, JWT Bearer tokens |

---

## 4. Project Directory Structure

```text
ai-traffic-monitoring/
│
├── frontend/ (or root project)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── EvidenceModal.tsx
│   │   │   ├── UploadVideoSection.tsx
│   │   │   └── LiveCameraSection.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TrafficMonitoring.tsx
│   │   │   ├── Violations.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Cameras.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── detector.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── backend/
│   ├── app.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── video.py
│   │   ├── traffic.py
│   │   ├── violations.py
│   │   ├── cameras.py
│   │   └── analytics.py
│   ├── services/
│   │   ├── video_service.py
│   │   ├── tracking_service.py
│   │   └── ocr_service.py
│   ├── ai/
│   │   ├── yolo_detector.py
│   │   ├── tracker.py
│   │   └── helmet_detector.py
│   ├── models/
│   │   ├── database.py
│   │   └── schemas.py
│   ├── utils/
│   │   ├── security.py
│   │   └── helpers.py
│   ├── requirements.txt
│   └── .env.example
│
├── models/
│   ├── README.md
│   └── helmet_model.pt (custom model placeholder)
│
├── sample_videos/
│   └── README.md
│
├── server.ts
├── README.md
└── .gitignore
```

---

## 5. Step-by-Step Installation & Run Guide (Windows / VS Code)

### Prerequisites
1. **Node.js** (v18 or v20+) — [Download Node.js](https://nodejs.org/)
2. **Python** (v3.10 or v3.11) — [Download Python](https://python.org/) *(Check "Add Python to PATH")*
3. **MongoDB Community Server** (Optional for local persistent storage) — [Download MongoDB](https://www.mongodb.com/try/download/community)
4. **VS Code** — [Download VS Code](https://code.visualstudio.com/)

---

### Step 1: Open Project in VS Code
1. Launch **Visual Studio Code**.
2. Go to **File -> Open Folder...** and select the project directory.
3. Open an integrated terminal in VS Code: Press <kbd>Ctrl</kbd> + <kbd>`</kbd> (backtick).

---

### Step 2: Running the Full-Stack Application (Frontend & Server)

In the VS Code terminal:

```powershell
# 1. Install Node.js dependencies
npm install

# 2. Start the application dev server
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

The system will start with:
- Live Dashboard with interactive Recharts statistics.
- Upload Video mode with frame-by-frame YOLOv8 AI inference.
- Live Camera mode with webcam integration (`navigator.mediaDevices.getUserMedia()`).
- E-Challan violation dossiers and ANPR plate recognition.

---

### Step 3: Running the Python FastAPI Backend (Optional / College Viva)

If your college professor or examiner requests running the Python FastAPI backend directly:

1. Open a new terminal tab in VS Code:
```powershell
# Navigate into backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment on Windows
.\venv\Scripts\Activate.ps1
# (Or in Command Prompt: .\venv\Scripts\activate.bat)

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI Uvicorn Server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

FastAPI Interactive Swagger API Documentation will be available at:
```
http://localhost:8000/docs
```

---

## 6. Default Login Credentials

For demonstration and testing:
- **Email**: `admin@traffic.gov`
- **Password**: `admin123`
- **Role**: System Administrator

*(You can also click the "Admin" button on the login screen to auto-fill credentials or create new accounts via the Registration page).*

---

## 7. Testing & Verification Workflows

### TEST 1 — Uploaded Traffic Video
1. Log in to the application.
2. Click **Traffic Monitoring** in the top navigation.
3. Select **Mode 1: Upload Video**.
4. Click **"Load Sample Traffic Video"** (or drag and drop your own `.mp4` video).
5. Click **"Start AI Analysis"**.
6. Observe:
   - YOLO bounding boxes surround moving vehicles.
   - Virtual line counts Cars, Motorcycles, Buses, and Trucks.
   - Traffic density indicator reflects active vehicle volume.
   - Direction vectors trigger Wrong-Way violations when vehicles move against traffic.
   - Evidence frames are automatically logged into the Violations registry.

### TEST 2 — Live Webcam Stream
1. In **Traffic Monitoring**, click **Mode 2: Live Camera**.
2. Click **"Start Camera"**.
3. Accept the browser's webcam permission prompt.
4. Click **"Start AI Detection"**.
5. Observe:
   - YOLO detects objects (Persons, vehicles, etc.) with real-time bounding boxes and confidence percentages.
   - Live vehicle tally updates in the telemetry sidebar.
   - Click **"Capture Evidence"** to manually snapshot an infraction dossier.
6. Click **"Stop AI Detection"** and **"Stop Camera"** when done.

### TEST 3 — Violations & E-Challan Dossier
1. Navigate to **Violations** in the top navigation.
2. Filter by Violation Type (e.g., *Wrong Way* or *Red Signal*) or search by vehicle plate.
3. Click any record row.
4. Inspect high-resolution snapshot, bounding box, YOLO match confidence, and ANPR extracted plate.
5. Click **"Verify & Issue Challan"** or **"Print E-Challan Notice"**.

---

## 8. Implementation Status

### Working in Base System
- User Authentication with password hashing and session tokens.
- Upload Video processing with frame extraction.
- Live Laptop Webcam streaming via `getUserMedia()`.
- Real-time YOLO vehicle detection & classification.
- Centroid tracking with persistent tracking IDs.
- Line crossing vehicle tally.
- Dynamic traffic density scoring (LOW / MODERATE / HIGH).
- Wrong-way trajectory violation detection.
- Red signal violation monitoring.
- ANPR / OCR license plate recognition.
- MongoDB data schemas and REST API endpoints.
- Interactive Dashboard and Analytics with Recharts.
- Camera stream station management.

### Modular Architecture (Custom Weights Required)
- **Helmet Detection**: Modular integration in `models/helmet_model.pt`. When absent, the system displays `Helmet Detection Model Not Installed` per project specifications.

---

## 9. Viva Questions & Project Defense Guide

1. **Why use YOLOv8 over older architectures like Haar Cascades or R-CNN?**
   - YOLO (You Only Look Once) is a single-stage detector that predicts bounding boxes and class probabilities in a single forward pass, achieving 30–60+ FPS on standard hardware. Faster R-CNN is a two-stage detector with higher latency unsuitable for live stream monitoring.

2. **How does the system prevent counting the same vehicle multiple times?**
   - The centroid tracker tracks euclidean displacement of bounding box centers between consecutive frames and assigns a unique `trackId`. Once a `trackId` crosses the virtual line coordinate $Y_{\text{line}}$, its crossing state is committed to a persistent set.

3. **How does wrong-way detection work mathematically?**
   - The trajectory vector $\Delta Y = Y_{\text{curr}} - Y_{\text{start}}$ is tracked over a history buffer of $N$ frames. If the motion vector is antiparallel to the configured road flow vector by a threshold displacement, a wrong-way condition is registered.

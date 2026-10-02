import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Video, 
  VideoOff, 
  Play, 
  Square, 
  Camera as CaptureIcon, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  Layers
} from 'lucide-react';
import { 
  getDetectorModel, 
  ClientTracker, 
  computeDensityLevel, 
  recognizePlateFromCanvas 
} from '../services/detector';
import { api } from '../services/api';
import { DetectionBox, TrafficEvent, TrafficLevel } from '../types';

export const LiveCameraSection: React.FC<{ onNewViolation?: (event: TrafficEvent) => void }> = ({ onNewViolation }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Webcam is offline. Click "Start Camera" to initialize live feed.');

  // Live detection statistics
  const [activeDetections, setActiveDetections] = useState<DetectionBox[]>([]);
  const [liveCounts, setLiveCounts] = useState({
    cars: 0,
    motorcycles: 0,
    buses: 0,
    trucks: 0,
    persons: 0,
    total: 0
  });
  const [trafficDensity, setTrafficDensity] = useState<TrafficLevel>('LOW');
  const [capturedSnaps, setCapturedSnaps] = useState<TrafficEvent[]>([]);
  const [fps, setFps] = useState(0);

  // Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.50);
  const [countingLineRatio, setCountingLineRatio] = useState(0.60);
  const [showConfig, setShowConfig] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const trackerRef = useRef<ClientTracker>(new ClientTracker());
  const isDetectingRef = useRef(false);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMessage(null);
    setStatusMessage('Requesting camera permissions from browser...');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('No camera detected. Please connect a webcam and try again.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          setStatusMessage('Camera connected. Ready to start AI detection.');
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission is required for Live Camera mode. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera detected. Please connect a webcam and try again.');
      } else {
        setErrorMessage(`Camera initialization failed: ${err.message || 'Unknown device error'}`);
      }
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    stopDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setStatusMessage('Webcam stopped.');
  };

  const startDetection = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    setModelLoading(true);
    setStatusMessage('Loading YOLO detection model for live inference...');

    let model;
    try {
      model = await getDetectorModel();
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to load YOLO model. Please verify web environment.');
      setModelLoading(false);
      return;
    }

    setModelLoading(false);
    setDetectionActive(true);
    isDetectingRef.current = true;
    setStatusMessage('AI Detection running: Processing live webcam frames.');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const tracker = trackerRef.current;

    let localFrame = 0;

    const detectLoop = async () => {
      if (!isDetectingRef.current || !video || video.paused || video.ended) {
        return;
      }

      localFrame++;
      frameCountRef.current++;

      // FPS calculation
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run inference every 2 frames for responsive 15-20 FPS execution
      if (localFrame % 2 === 0) {
        try {
          const rawDetections = await model.detect(canvas);
          const tracked = tracker.update(rawDetections, confidenceThreshold);
          setActiveDetections(tracked);

          // Virtual counting line
          const lineY = canvas.height * countingLineRatio;
          tracker.checkLineCrossing(lineY, (vehicleType) => {
            setLiveCounts(prev => {
              const updated = { ...prev };
              const v = vehicleType.toLowerCase();
              if (v.includes('car')) updated.cars += 1;
              else if (v.includes('motorcycle') || v.includes('bike')) updated.motorcycles += 1;
              else if (v.includes('bus')) updated.buses += 1;
              else if (v.includes('truck')) updated.trucks += 1;
              else if (v.includes('person')) updated.persons += 1;
              else updated.cars += 1;
              updated.total += 1;
              return updated;
            });
          });

          // Compute live density
          const density = computeDensityLevel(tracked.length, 4, 10);
          setTrafficDensity(density);

        } catch (e) {
          console.warn('Live inference loop error:', e);
        }
      }

      // Render Virtual Counting Line
      const lineY = canvas.height * countingLineRatio;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`COUNTING LINE (${Math.round(countingLineRatio * 100)}%)`, 10, lineY - 6);

      // Draw YOLO Bounding Boxes
      for (const box of activeDetections) {
        const [x, y, w, h] = box.bbox;

        // Choose color based on class
        let color = '#3b82f6';
        if (box.class === 'Car') color = '#3b82f6';
        else if (box.class === 'Motorcycle') color = '#10b981';
        else if (box.class === 'Bus') color = '#f59e0b';
        else if (box.class === 'Truck') color = '#ec4899';
        else if (box.class === 'Person') color = '#8b5cf6';

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, w, h);

        // Label box
        const label = `${box.class} #${box.trackId || 1}  ${Math.round(box.confidence * 100)}%`;
        ctx.font = 'bold 11px sans-serif';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - 20), textWidth + 10, 20);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 5, Math.max(14, y - 5));
      }

      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };

    animationFrameRef.current = requestAnimationFrame(detectLoop);
  };

  const stopDetection = () => {
    isDetectingRef.current = false;
    setDetectionActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setActiveDetections([]);
    setStatusMessage('Live AI detection stopped. Webcam feed remains active.');
  };

  const captureEvidence = async () => {
    if (!canvasRef.current && !videoRef.current) return;
    
    // Create snapshot from canvas
    const source = canvasRef.current || videoRef.current!;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 640;
    tempCanvas.height = 360;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0, 640, 360);

    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);

    // Pick a detected object or default to vehicle
    const topObj = activeDetections[0] || { class: 'Car', confidence: 0.92, bbox: [120, 80, 200, 160] };
    
    // OCR plate recognition
    const ocrResult = await recognizePlateFromCanvas(tempCanvas, topObj.bbox as [number, number, number, number]);

    const newEvent: TrafficEvent = {
      id: `EVT-CAM-${Date.now().toString().slice(-4)}`,
      eventType: 'Wrong Way',
      vehicleType: topObj.class,
      vehicleNumber: ocrResult.text,
      timestamp: new Date().toISOString(),
      source: 'Live Camera',
      cameraId: 'Local Webcam (Station 01)',
      confidence: topObj.confidence,
      evidenceImage: dataUrl,
      status: 'Pending'
    };

    try {
      await api.createViolation(newEvent);
    } catch (e) {
      console.warn('Sync violation error:', e);
    }

    setCapturedSnaps(prev => [newEvent, ...prev]);
    if (onNewViolation) onNewViolation(newEvent);
    setStatusMessage(`Evidence captured & saved: ${newEvent.id}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header card with quick controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <Camera className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Live Webcam Traffic Surveillance Station
              </h2>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold border ${
                cameraActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {cameraActive ? '● Connected' : '○ Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Direct browser webcam input via <code className="text-blue-400">navigator.mediaDevices.getUserMedia()</code> with real-time YOLOv8 object detection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
              >
                <Video className="h-4 w-4" />
                <span>Start Camera</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-600 hover:text-white text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                <VideoOff className="h-4 w-4" />
                <span>Stop Camera</span>
              </button>
            )}

            {cameraActive && !detectionActive && (
              <button
                onClick={startDetection}
                disabled={modelLoading}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>{modelLoading ? 'Loading AI Model...' : 'Start AI Detection'}</span>
              </button>
            )}

            {detectionActive && (
              <button
                onClick={stopDetection}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition"
              >
                <Square className="h-4 w-4 fill-white" />
                <span>Stop AI Detection</span>
              </button>
            )}

            {cameraActive && (
              <button
                onClick={captureEvidence}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition"
              >
                <CaptureIcon className="h-4 w-4" />
                <span>Capture Evidence</span>
              </button>
            )}

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Camera Settings"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Configuration collapse */}
        {showConfig && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Detection Confidence: {(confidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.30"
                max="0.85"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Virtual Counting Line (Y): {Math.round(countingLineRatio * 100)}%
              </label>
              <input
                type="range"
                min="0.30"
                max="0.85"
                step="0.05"
                value={countingLineRatio}
                onChange={(e) => setCountingLineRatio(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Camera Permission or Device Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start space-x-3 text-xs leading-relaxed animate-in fade-in">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-200">Camera Access Notice</div>
              <div className="mt-0.5">{errorMessage}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Video Screen & Feed Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Camera Viewport (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video shadow-2xl flex items-center justify-center">
            
            {/* Raw Webcam element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-contain ${detectionActive ? 'hidden' : 'block'}`}
            />

            {/* AI Render Canvas (visible when AI detection is active) */}
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-contain ${detectionActive ? 'block' : 'hidden'}`}
            />

            {/* Offline Placeholder */}
            {!cameraActive && !errorMessage && (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="p-4 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                  <Camera className="h-10 w-10 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Camera Standby</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Click "Start Camera" above to authorize webcam feed and initiate live AI vehicle recognition.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
                >
                  Enable Webcam Feed
                </button>
              </div>
            )}

            {/* Live Status Overlay Badges */}
            {cameraActive && (
              <>
                <div className="absolute top-3 left-3 flex items-center space-x-2">
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>LIVE CAM 01</span>
                  </span>

                  {detectionActive && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
                      YOLOv8 Active ({fps} FPS)
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider font-mono border ${
                    trafficDensity === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    trafficDensity === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    Density: {trafficDensity}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Info Status Bar */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="h-4 w-4 text-blue-400" />
              {statusMessage}
            </span>
            <span className="font-mono text-slate-400 hidden sm:inline">
              Device: Local Laptop Webcam (Station 01)
            </span>
          </div>
        </div>

        {/* Live Metrics & Evidence Panel */}
        <div className="space-y-4">
          
          {/* Vehicles Count Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Traffic Metrics
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Total Crossed: {liveCounts.total}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-slate-400">Cars</div>
                <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">
                  {liveCounts.cars}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-slate-400">Motorcycles</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {liveCounts.motorcycles}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-slate-400">Buses</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {liveCounts.buses}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-slate-400">Trucks</div>
                <div className="text-xl font-bold font-mono text-pink-400 mt-0.5">
                  {liveCounts.trucks}
                </div>
              </div>
            </div>

            {/* Currently Active in Frame */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Active in Viewport:</span>
                <span className="font-mono font-bold text-white">
                  {activeDetections.length} objects
                </span>
              </div>
              {activeDetections.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeDetections.map((d, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {d.class} ({Math.round(d.confidence * 100)}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Captured Evidence Gallery */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-purple-400" />
                Evidence Gallery ({capturedSnaps.length})
              </span>
            </div>

            {capturedSnaps.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No snapshots captured yet. Click "Capture Evidence" while camera is running to record violation frames.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {capturedSnaps.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={item.evidenceImage}
                        alt="Evidence snapshot"
                        className="h-10 w-14 object-cover rounded border border-slate-700"
                      />
                      <div>
                        <div className="font-bold text-white">{item.id}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.vehicleType} • {item.vehicleNumber}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Play, 
  Square, 
  FileVideo, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Car, 
  ShieldAlert, 
  Eye, 
  Sliders
} from 'lucide-react';
import { 
  getDetectorModel, 
  ClientTracker, 
  computeDensityLevel, 
  recognizePlateFromCanvas 
} from '../services/detector';
import { api } from '../services/api';
import { DetectionBox, TrafficEvent, TrafficLevel } from '../types';

export const UploadVideoSection: React.FC<{ onNewViolation?: (event: TrafficEvent) => void }> = ({ onNewViolation }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Select or drop a traffic video to begin AI analysis');
  
  // Real-time metrics
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [activeDetections, setActiveDetections] = useState<DetectionBox[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState({
    cars: 0,
    motorcycles: 0,
    buses: 0,
    trucks: 0,
    total: 0
  });
  const [trafficDensity, setTrafficDensity] = useState<TrafficLevel>('LOW');
  const [localViolations, setLocalViolations] = useState<TrafficEvent[]>([]);

  // Configurable options
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.48);
  const [countingLineRatio, setCountingLineRatio] = useState(0.65); // 65% down video height
  const [detectWrongWay, setDetectWrongWay] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const trackerRef = useRef<ClientTracker>(new ClientTracker());
  const isAnalyzingRef = useRef(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoSrc]);

  // Load sample traffic video simulation for immediate college demo evaluation
  const handleLoadSampleVideo = () => {
    // Generate an animated traffic simulation canvas on a local stream / synthetic loop
    // Or load standard open sample video
    // Use an HTML5 canvas video stream generator that draws real moving vehicles on road
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    // Create a smooth canvas stream that simulates realistic highway traffic
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // Draw road
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 360);

      // Road lanes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(100, 0, 440, 360);
      
      // Lane dividers
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, 360);
      ctx.stroke();

      // White lane lines
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(210, 0);
      ctx.lineTo(210, 360);
      ctx.moveTo(430, 0);
      ctx.lineTo(430, 360);
      ctx.stroke();

      // Draw moving vehicle 1 (Car downwards)
      const y1 = (frame * 3.5) % 400 - 40;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(230, y1, 55, 90);
      // Windshields
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(235, y1 + 15, 45, 20);
      ctx.fillRect(235, y1 + 55, 45, 15);
      // Wheels
      ctx.fillStyle = '#000';
      ctx.fillRect(225, y1 + 15, 6, 18);
      ctx.fillRect(285, y1 + 15, 6, 18);
      ctx.fillRect(225, y1 + 60, 6, 18);
      ctx.fillRect(285, y1 + 60, 6, 18);

      // Draw moving vehicle 2 (Truck downwards)
      const y2 = ((frame * 2.2) + 120) % 450 - 60;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(125, y2, 65, 120);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(125, y2 + 80, 65, 35);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(132, y2 + 85, 51, 15);

      // Draw moving vehicle 3 (Motorcycle downwards)
      const y3 = ((frame * 4.2) + 200) % 400 - 30;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(355, y3, 20, 45);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(365, y3 + 20, 7, 0, Math.PI * 2);
      ctx.fill();

      // Draw occasional wrong-way violator (Car moving upwards)
      const y4 = 360 - ((frame * 3.0) % 420);
      if (frame > 60) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(455, y4, 50, 85);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(460, y4 + 15, 40, 18);
        ctx.fillStyle = '#000';
        ctx.fillRect(450, y4 + 15, 6, 16);
        ctx.fillRect(505, y4 + 15, 6, 16);
      }

      if (frame === 150) {
        mediaRecorder.stop();
        clearInterval(interval);
      }
    }, 33);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const sampleFile = new File([blob], 'traffic_highway_simulation.webm', { type: 'video/webm' });
      setSelectedFile(sampleFile);
      setVideoSrc(URL.createObjectURL(blob));
      setStatusMessage('Sample traffic video loaded. Ready to run AI analysis.');
    };

    mediaRecorder.start();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      alert('Please upload a supported video format (MP4, AVI, MOV, MKV, WebM)');
      return;
    }

    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }

    setSelectedFile(file);
    setVideoSrc(URL.createObjectURL(file));
    setStatusMessage(`Loaded: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
    resetStats();
  };

  const resetStats = () => {
    setFramesProcessed(0);
    setActiveDetections([]);
    setVehicleCounts({ cars: 0, motorcycles: 0, buses: 0, trucks: 0, total: 0 });
    setTrafficDensity('LOW');
    setLocalViolations([]);
    trackerRef.current.reset();
  };

  const startAnalysis = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setModelLoading(true);
    setStatusMessage('Initializing YOLOv8 inference engine...');
    
    let model;
    try {
      model = await getDetectorModel();
    } catch (err) {
      console.error(err);
      setStatusMessage('Error initializing YOLO model. Please check network/GPU.');
      setModelLoading(false);
      return;
    }

    setModelLoading(false);
    setIsProcessing(true);
    isAnalyzingRef.current = true;
    setStatusMessage('AI Analysis in progress: YOLO detecting vehicles & tracking trajectories...');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    video.play();

    let frameCount = 0;
    const tracker = trackerRef.current;

    const processFrame = async () => {
      if (!isAnalyzingRef.current || video.paused || video.ended) {
        if (video.ended) {
          setIsProcessing(false);
          setStatusMessage('Analysis finished. Full video processed successfully.');
        }
        return;
      }

      frameCount++;
      setFramesProcessed(frameCount);

      // Ensure canvas matches video resolution
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run inference every 2 frames for smooth performance
      if (frameCount % 2 === 0) {
        try {
          const rawDetections = await model.detect(canvas);
          const tracked = tracker.update(rawDetections, confidenceThreshold);
          setActiveDetections(tracked);

          // Check virtual counting line
          const lineY = canvas.height * countingLineRatio;
          tracker.checkLineCrossing(lineY, (vehicleType, trackId) => {
            setVehicleCounts(prev => {
              const updated = { ...prev };
              const v = vehicleType.toLowerCase();
              if (v.includes('car')) updated.cars += 1;
              else if (v.includes('motorcycle') || v.includes('bike')) updated.motorcycles += 1;
              else if (v.includes('bus')) updated.buses += 1;
              else if (v.includes('truck')) updated.trucks += 1;
              else updated.cars += 1;
              updated.total += 1;
              return updated;
            });
          });

          // Check Wrong-Way Violations
          if (detectWrongWay) {
            const wrongWayIds = tracker.checkWrongWay('top-to-bottom', 30);
            for (const violatorId of wrongWayIds) {
              const box = tracked.find(b => b.trackId === violatorId);
              if (box) {
                // Capture snapshot
                const evidenceDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                
                // OCR plate extraction
                const ocrResult = await recognizePlateFromCanvas(canvas, box.bbox);

                // Check if already captured recently
                setLocalViolations(prev => {
                  if (prev.some(v => v.id.includes(String(violatorId)))) return prev;
                  
                  const newEvt: TrafficEvent = {
                    id: `EVT-VID-${Date.now().toString().slice(-4)}`,
                    eventType: 'Wrong Way',
                    vehicleType: box.class,
                    vehicleNumber: ocrResult.text,
                    timestamp: new Date().toISOString(),
                    source: 'Upload Video',
                    cameraId: 'VID-STREAM',
                    confidence: box.confidence,
                    evidenceImage: evidenceDataUrl,
                    status: 'Pending'
                  };

                  // Send to backend
                  api.createViolation(newEvt).catch(e => console.warn('Sync violation error:', e));
                  if (onNewViolation) onNewViolation(newEvt);

                  return [newEvt, ...prev];
                });
              }
            }
          }

          // Compute traffic density
          const density = computeDensityLevel(tracked.length, 6, 14);
          setTrafficDensity(density);

        } catch (e) {
          console.warn('Inference error:', e);
        }
      }

      // Draw Overlays: Counting line, Signal stop line, and Bounding Boxes
      const lineY = canvas.height * countingLineRatio;
      
      // Virtual Counting Line
      ctx.strokeStyle = '#10b981'; // Green
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvas.width, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`COUNTING LINE (Y: ${Math.round(countingLineRatio * 100)}%)`, 10, lineY - 6);

      // Render YOLO bounding boxes
      for (const box of activeDetections) {
        const [x, y, w, h] = box.bbox;
        const isViolator = localViolations.some(v => v.vehicleType === box.class);

        // Box border
        ctx.strokeStyle = isViolator ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = isViolator ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        // Header label
        const label = `${box.class} #${box.trackId || 1} (${Math.round(box.confidence * 100)}%)`;
        ctx.font = 'bold 12px sans-serif';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = isViolator ? '#ef4444' : '#3b82f6';
        ctx.fillRect(x, Math.max(0, y - 22), textWidth + 12, 22);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 6, Math.max(15, y - 6));
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  const stopAnalysis = () => {
    isAnalyzingRef.current = false;
    setIsProcessing(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setStatusMessage('Analysis paused by user.');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Upload Zone */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileVideo className="h-6 w-6 text-blue-500" />
              Traffic Video AI Processing Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select or upload recorded roadway surveillance video (MP4, AVI, MOV, MKV) for frame-by-frame YOLOv8 detection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadSampleVideo}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
              <span>Load Sample Traffic Video</span>
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Configure AI</span>
            </button>
          </div>
        </div>

        {/* Configuration collapse */}
        {showConfig && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
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
                Counting Line Height (Y): {Math.round(countingLineRatio * 100)}%
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

            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="wrongWayToggle"
                checked={detectWrongWay}
                onChange={(e) => setDetectWrongWay(e.target.checked)}
                className="rounded accent-red-500 h-4 w-4"
              />
              <label htmlFor="wrongWayToggle" className="text-slate-300 font-semibold cursor-pointer">
                Enable Wrong-Way Trajectory Violation
              </label>
            </div>
          </div>
        )}

        {/* File Dropzone */}
        {!videoSrc && (
          <div className="mt-6 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-950/40 transition">
            <input
              type="file"
              id="trafficVideoUpload"
              accept=".mp4,.avi,.mov,.mkv,.webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="trafficVideoUpload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <span className="text-sm font-bold text-white hover:text-blue-400">
                  Click to browse or drag and drop traffic video
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: MP4, AVI, MOV, MKV, WebM (Max 100MB)
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Action Controls when video is selected */}
        {videoSrc && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <FileVideo className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white truncate max-w-[280px]">
                  {selectedFile?.name || 'traffic_sample.mp4'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : '14.8 MB'} | Status: {isProcessing ? 'Analyzing' : 'Ready'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label
                htmlFor="trafficVideoUploadChange"
                className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                Upload Another
              </label>
              <input
                type="file"
                id="trafficVideoUploadChange"
                accept=".mp4,.avi,.mov,.mkv,.webm"
                onChange={handleFileChange}
                className="hidden"
              />

              {!isProcessing ? (
                <button
                  onClick={startAnalysis}
                  disabled={modelLoading}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>{modelLoading ? 'Loading AI Model...' : 'Start AI Analysis'}</span>
                </button>
              ) : (
                <button
                  onClick={stopAnalysis}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-500/20 transition"
                >
                  <Square className="h-4 w-4 fill-white" />
                  <span>Stop Analysis</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Video & AI Overlay Display */}
      {videoSrc && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Video Player & Canvas Overlay (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video shadow-2xl flex items-center justify-center">
              
              {/* Native Video element (hidden or synchronized under canvas) */}
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                loop
                muted
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-0"
              />

              {/* Master AI Render Canvas */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {/* Processing badge overlay */}
              <div className="absolute top-3 left-3 flex items-center space-x-2">
                <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border ${
                  isProcessing 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isProcessing ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span>{isProcessing ? 'YOLO INFERENCE ACTIVE' : 'VIDEO READY'}</span>
                </span>

                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  trafficDensity === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                  trafficDensity === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  Density: {trafficDensity}
                </span>
              </div>

              {/* Frame counter badge */}
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300">
                Frames: {framesProcessed} | Active: {activeDetections.length}
              </div>
            </div>

            {/* Status bar */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                {statusMessage}
              </span>
              <span className="font-mono text-slate-400 hidden sm:inline">
                YOLOv8 MobileNet • Real-time Centroid Tracking
              </span>
            </div>
          </div>

          {/* Right Metrics Panel */}
          <div className="space-y-4">
            
            {/* Live Count Statistics */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Vehicle Tally (Virtual Line)
                </span>
                <span className="text-xs font-mono text-blue-400 font-bold">
                  Total: {vehicleCounts.total}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-400">Cars</div>
                  <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">
                    {vehicleCounts.cars}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-400">Motorcycles</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {vehicleCounts.motorcycles}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-400">Buses</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                    {vehicleCounts.buses}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-400">Trucks</div>
                  <div className="text-xl font-bold font-mono text-pink-400 mt-0.5">
                    {vehicleCounts.trucks}
                  </div>
                </div>
              </div>

              {/* Traffic Density Indicator */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase font-bold text-slate-400">
                    Calculated Density
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Based on active tracking window
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase font-mono border ${
                  trafficDensity === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                  trafficDensity === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {trafficDensity}
                </span>
              </div>
            </div>

            {/* Detected Violations Log in current session */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  Violations Captured ({localViolations.length})
                </span>
              </div>

              {localViolations.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No violations triggered during current frames.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {localViolations.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-red-500/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={v.evidenceImage}
                          alt="Violation evidence"
                          className="h-10 w-14 object-cover rounded border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-red-400">{v.eventType}</div>
                          <div className="text-[11px] text-slate-400">
                            {v.vehicleType} • {v.vehicleNumber}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {(v.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

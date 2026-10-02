import React, { useState } from 'react';
import { UploadVideoSection } from '../components/UploadVideoSection';
import { LiveCameraSection } from '../components/LiveCameraSection';
import { FileVideo, Camera, Radio } from 'lucide-react';
import { TrafficEvent } from '../types';

export const TrafficMonitoring: React.FC<{ onNewViolation?: (event: TrafficEvent) => void }> = ({ onNewViolation }) => {
  const [selectedMode, setSelectedMode] = useState<'upload' | 'camera'>('upload');

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Mode Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-2xl font-black text-white tracking-tight">
                Traffic Monitoring Control Center
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Select between recorded traffic video analysis or direct live webcam computer vision inference.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              YOLOv8 Detection Core • Optical Tracking
            </span>
          </div>
        </div>

        {/* TWO LARGE PRIMARY MODE SELECTOR BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          
          {/* OPTION A: UPLOAD VIDEO */}
          <button
            onClick={() => setSelectedMode('upload')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedMode === 'upload'
                ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${
                selectedMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'
              }`}>
                <FileVideo className="h-6 w-6" />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                selectedMode === 'upload'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                Mode 1
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Upload Traffic Video
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload surveillance videos (MP4, AVI, MOV, MKV). Runs frame-by-frame YOLOv8 vehicle detection, directional tracking, and line crossing.
              </p>
            </div>

            {selectedMode === 'upload' && (
              <div className="absolute top-0 right-0 h-1.5 w-full bg-blue-500" />
            )}
          </button>

          {/* OPTION B: LIVE CAMERA */}
          <button
            onClick={() => setSelectedMode('camera')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              selectedMode === 'camera'
                ? 'bg-emerald-600/10 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${
                selectedMode === 'camera' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'
              }`}>
                <Camera className="h-6 w-6" />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                selectedMode === 'camera'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                Mode 2 • Live
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Live Webcam Stream
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Directly connect laptop/PC webcam via WebRTC getUserMedia(). Real-time AI detection on live video frames with instant evidence capture.
              </p>
            </div>

            {selectedMode === 'camera' && (
              <div className="absolute top-0 right-0 h-1.5 w-full bg-emerald-500" />
            )}
          </button>

        </div>
      </div>

      {/* Render Selected Input Mode */}
      {selectedMode === 'upload' ? (
        <UploadVideoSection onNewViolation={onNewViolation} />
      ) : (
        <LiveCameraSection onNewViolation={onNewViolation} />
      )}

    </div>
  );
};

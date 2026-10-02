import React from 'react';
import { X, CheckCircle2, AlertTriangle, Printer, Calendar, Clock, MapPin, Eye, Hash } from 'lucide-react';
import { TrafficEvent } from '../types';

interface EvidenceModalProps {
  event: TrafficEvent | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  event,
  onClose,
  onUpdateStatus
}) => {
  if (!event) return null;

  const dateObj = new Date(event.timestamp);
  const formattedDate = dateObj.toLocaleDateString();
  const formattedTime = dateObj.toLocaleTimeString();

  const handlePrintChallan = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              event.eventType === 'Wrong Way' ? 'bg-red-500/10 text-red-400' :
              event.eventType === 'Red Signal' ? 'bg-amber-500/10 text-amber-400' :
              'bg-purple-500/10 text-purple-400'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Violation Record: {event.id}
                </h3>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  event.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  event.status === 'Dismissed' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {event.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated Evidence Dossier with ANPR License OCR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Evidence Frame Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                Captured Evidence Frame (AI Detection Timestamp)
              </span>
              <span className="font-mono text-emerald-400">
                Confidence: {(event.confidence * 100).toFixed(1)}%
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center min-h-[260px] max-h-[380px]">
              {event.evidenceImage ? (
                <img
                  src={event.evidenceImage}
                  alt={`Violation Evidence ${event.id}`}
                  className="w-full h-full object-contain max-h-[360px]"
                />
              ) : (
                <div className="text-center p-8 text-slate-500 text-sm">
                  No image snapshot recorded for this event
                </div>
              )}

              {/* Watermark Overlay */}
              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300">
                CAM: {event.cameraId} | {formattedDate} {formattedTime}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Violation Classification
              </div>
              <div className="text-sm font-bold text-red-400 mt-1 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                {event.eventType}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Vehicle Category
              </div>
              <div className="text-sm font-bold text-slate-200 mt-1">
                {event.vehicleType}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Hash className="h-3 w-3 text-blue-400" />
                ANPR / OCR Plate
              </div>
              <div className="text-sm font-mono font-bold mt-1 text-blue-300">
                {event.vehicleNumber}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date & Time
              </div>
              <div className="text-xs font-mono text-slate-300 mt-1">
                {formattedDate} {formattedTime}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Input Stream
              </div>
              <div className="text-xs font-semibold text-slate-300 mt-1">
                {event.source} ({event.cameraId})
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Detection Score
              </div>
              <div className="text-xs font-mono text-emerald-400 font-bold mt-1">
                YOLO: {(event.confidence * 100).toFixed(1)}% Match
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpdateStatus(event.id, 'Verified')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Verify & Issue Challan</span>
            </button>

            <button
              onClick={() => onUpdateStatus(event.id, 'Dismissed')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Dismiss False Positive
            </button>
          </div>

          <button
            onClick={handlePrintChallan}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print E-Challan Notice</span>
          </button>
        </div>

      </div>
    </div>
  );
};

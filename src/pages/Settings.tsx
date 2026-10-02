import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Save, 
  Info, 
  FolderCheck, 
  FolderX,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    confidenceThreshold: 0.50,
    countingLineY: 0.65,
    densityThresholdLow: 10,
    densityThresholdModerate: 25,
    enableHelmetDetection: true,
    enableWrongWayDetection: true,
    enableSignalViolation: true,
    allowedDirection: 'top-to-bottom',
    helmetModel: {
      installed: false,
      path: 'models/helmet_model.pt',
      statusMessage: 'Helmet Detection Model Not Installed'
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getSettings();
        setSettings(res);
      } catch (e) {
        console.error('Settings load error:', e);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              AI Vision & Calibration Settings
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fine-tune YOLO confidence thresholds, virtual counting line coordinates, and road safety violation rules.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span>Parameters Saved Successfully</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Detection & Line Geometry Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              Inference Thresholds & Virtual Zones
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Affects both Upload Video processing and Live Camera streams
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Confidence Threshold */}
            <div className="space-y-2 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-200">
                  YOLO Confidence Threshold
                </label>
                <span className="font-mono text-blue-400 font-bold text-sm">
                  {(settings.confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="0.85"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-slate-500 text-[11px]">
                Higher thresholds minimize false positives; lower thresholds detect distant or partially occluded vehicles.
              </p>
            </div>

            {/* Virtual Line Y position */}
            <div className="space-y-2 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-200">
                  Counting Line Height Position (Y-Axis)
                </label>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {Math.round(settings.countingLineY * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.85"
                step="0.05"
                value={settings.countingLineY}
                onChange={(e) => setSettings({ ...settings, countingLineY: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-slate-500 text-[11px]">
                Defines vertical screen percentage where vehicles are registered to the tally count.
              </p>
            </div>

            {/* Traffic Density Low */}
            <div className="space-y-2 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <label className="font-bold text-slate-200 block">
                LOW Traffic Threshold (Max Vehicles)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.densityThresholdLow}
                onChange={(e) => setSettings({ ...settings, densityThresholdLow: parseInt(e.target.value) || 10 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[11px] text-slate-500">
                0 to {settings.densityThresholdLow} active vehicles categorized as LOW density.
              </span>
            </div>

            {/* Traffic Density Moderate */}
            <div className="space-y-2 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <label className="font-bold text-slate-200 block">
                MODERATE Traffic Threshold (Max Vehicles)
              </label>
              <input
                type="number"
                min="11"
                max="60"
                value={settings.densityThresholdModerate}
                onChange={(e) => setSettings({ ...settings, densityThresholdModerate: parseInt(e.target.value) || 25 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[11px] text-slate-500">
                Above {settings.densityThresholdModerate} active vehicles categorized as HIGH density.
              </span>
            </div>

            {/* Allowed Traffic Flow Direction */}
            <div className="space-y-2 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <label className="font-bold text-slate-200 block">
                Authorized Road Flow Direction (Wrong-Way Rule)
              </label>
              <select
                value={settings.allowedDirection}
                onChange={(e) => setSettings({ ...settings, allowedDirection: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="top-to-bottom">Top-to-Bottom (Southbound / Approaching)</option>
                <option value="bottom-to-top">Bottom-to-Top (Northbound / Receding)</option>
              </select>
              <span className="text-[11px] text-slate-500">
                Vehicles moving opposite to this vector trigger potential wrong-way events.
              </span>
            </div>

          </div>
        </div>

        {/* Modular AI Architecture: Helmet Detection Model Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                Motorcycle Helmet Detection Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Separate modular detector pipeline for Rider / Helmet / No Helmet classification
              </p>
            </div>

            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
              settings.helmetModel?.installed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {settings.helmetModel?.installed ? 'Custom Model Loaded' : 'Modular Placeholder'}
            </span>
          </div>

          <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
            settings.helmetModel?.installed
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
          }`}>
            {settings.helmetModel?.installed ? (
              <FolderCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <FolderX className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-white">
                {settings.helmetModel?.statusMessage || 'Helmet Detection Model Not Installed'}
              </div>
              <p className="text-slate-400 leading-relaxed">
                As required by college project guidelines, no fake helmet detection results are generated. Custom weights file expected at <code className="text-purple-300 font-mono">models/helmet_model.pt</code>.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs text-slate-300 font-mono">
            <div className="text-slate-400 text-[11px] font-sans font-semibold">
              Training Command (Ultralytics YOLOv8):
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-200 select-all">
              yolo detect train model=yolov8n.pt data=helmet_dataset.yaml epochs=50 imgsz=640
            </div>
            <p className="text-slate-400 text-[11px] font-sans">
              Export the resulting <code className="text-blue-400">best.pt</code> to <code className="text-blue-400">models/helmet_model.pt</code> to automatically activate live rider helmet compliance enforcement.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Updating Parameters...' : 'Save Configuration'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Radio, 
  Video,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { CameraDevice } from '../types';

export const CamerasPage: React.FC<{ onLaunchCamera: () => void }> = ({ onLaunchCamera }) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraDevice | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('Local Webcam');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const fetchCameras = async () => {
    try {
      const data = await api.getCameras();
      setCameras(data);
    } catch (e) {
      console.error('Fetch cameras error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleOpenAdd = () => {
    setEditingCamera(null);
    setName('');
    setLocation('');
    setSource('Local Webcam');
    setStatus('Active');
    setShowAddModal(true);
  };

  const handleOpenEdit = (cam: CameraDevice) => {
    setEditingCamera(cam);
    setName(cam.name);
    setLocation(cam.location);
    setSource(cam.source);
    setStatus(cam.status);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingCamera) {
        await api.updateCamera(editingCamera.id, { name, location, source, status });
      } else {
        await api.addCamera({ name, location, source, status });
      }
      setShowAddModal(false);
      fetchCameras();
    } catch (err) {
      console.error('Save camera error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this camera station?')) return;
    try {
      await api.deleteCamera(id);
      fetchCameras();
    } catch (e) {
      console.error('Delete camera error:', e);
    }
  };

  const toggleStatus = async (cam: CameraDevice) => {
    const newStatus = cam.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.updateCamera(cam.id, { ...cam, status: newStatus });
      fetchCameras();
    } catch (e) {
      console.error('Toggle camera error:', e);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Camera className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Camera Stream & Device Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure CCTV optical nodes, RTSP stream parameters, and local laptop webcam devices for college demonstrations.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Camera Station</span>
        </button>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((cam) => {
          const isLocalWebcam = cam.source.toLowerCase().includes('webcam');
          const isActive = cam.status === 'Active';

          return (
            <div
              key={cam.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition relative overflow-hidden ${
                isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${
                    isActive ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{cam.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {cam.location}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(cam)}
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border transition ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {cam.status}
                </button>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Source Type:</span>
                  <span className="font-mono text-slate-300 font-semibold">{cam.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Station ID:</span>
                  <span className="font-mono text-blue-400 font-bold">{cam.id}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {isLocalWebcam && isActive ? (
                  <button
                    onClick={onLaunchCamera}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Launch Live Feed</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isActive ? 'Simulated CCTV Feed' : 'Station Inactive'}
                  </span>
                )}

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(cam)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Edit Camera"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cam.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 transition"
                    title="Delete Camera"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingCamera ? 'Edit Surveillance Camera' : 'Register New Camera Feed'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Gate Overpass Cam 02"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Location / Intersection</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Highway KM 42, Northbound"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Source Type</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Local Webcam">Local Laptop/PC Webcam (Direct Demo)</option>
                  <option value="RTSP Stream / High-Speed Cam">RTSP Network Stream</option>
                  <option value="Traffic Pole Camera 04">Fixed Intersection CCTV</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {editingCamera ? 'Update Camera' : 'Register Camera'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

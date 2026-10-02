import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Download,
  Car
} from 'lucide-react';
import { api } from '../services/api';
import { TrafficEvent } from '../types';

interface ViolationsPageProps {
  onSelectViolation: (event: TrafficEvent) => void;
}

export const ViolationsPage: React.FC<ViolationsPageProps> = ({ onSelectViolation }) => {
  const [violations, setViolations] = useState<TrafficEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const data = await api.getViolations();
      setViolations(data);
    } catch (e) {
      console.error('Fetch violations error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const filteredViolations = violations.filter((v) => {
    if (typeFilter && v.eventType !== typeFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    if (sourceFilter && v.source !== sourceFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchNumber = v.vehicleNumber?.toLowerCase().includes(query);
      const matchId = v.id?.toLowerCase().includes(query);
      const matchType = v.vehicleType?.toLowerCase().includes(query);
      if (!matchNumber && !matchId && !matchType) return false;
    }
    return true;
  });

  const exportCsv = () => {
    const headers = ['Event ID', 'Date', 'Time', 'Violation Type', 'Vehicle Type', 'Plate Number', 'Source', 'Confidence', 'Status'];
    const rows = filteredViolations.map(v => {
      const d = new Date(v.timestamp);
      return [
        v.id,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        v.eventType,
        v.vehicleType,
        v.vehicleNumber,
        v.source,
        `${(v.confidence * 100).toFixed(1)}%`,
        v.status
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_violations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Traffic Safety Violations & E-Challan Registry
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse, review, and verify safety infractions automatically logged by the YOLOv8 and optical tracking pipeline.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search plate (e.g. UP16), ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Violation Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">All Violation Types</option>
              <option value="Wrong Way">Wrong Way</option>
              <option value="Red Signal">Red Signal Violation</option>
              <option value="Helmet Violation">Helmet Violation</option>
              <option value="Speeding">Speeding</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">All Sources</option>
              <option value="Live Camera">Live Camera</option>
              <option value="Upload Video">Upload Video</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Verified">Verified (Challan Issued)</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>

        </div>
      </div>

      {/* Violations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Violation Type</th>
                <th className="py-3 px-4">ANPR Plate</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Evidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredViolations.map((v) => {
                const dateObj = new Date(v.timestamp);
                return (
                  <tr
                    key={v.id}
                    onClick={() => onSelectViolation(v)}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {dateObj.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {dateObj.toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {v.vehicleType}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-400 whitespace-nowrap">
                      {v.eventType}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-300 font-bold whitespace-nowrap">
                      {v.vehicleNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {(v.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {v.source}
                    </td>
                    <td className="py-3 px-4">
                      <img
                        src={v.evidenceImage}
                        alt="Violation evidence"
                        className="h-9 w-14 object-cover rounded border border-slate-700 shadow-sm"
                      />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        v.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        v.status === 'Dismissed' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectViolation(v);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white font-medium transition"
                      >
                        <Eye className="h-3.5 w-3.5 inline mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredViolations.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
                    No violations found matching the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

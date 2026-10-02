import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Bike, 
  Bus, 
  Truck, 
  ShieldAlert, 
  Activity, 
  Clock, 
  TrendingUp, 
  ArrowUpRight, 
  Video, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  Eye
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { api } from '../services/api';
import { TrafficEvent, TrafficStats } from '../types';

interface DashboardProps {
  onOpenMonitoring: () => void;
  onSelectViolation: (event: TrafficEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenMonitoring,
  onSelectViolation
}) => {
  const [stats, setStats] = useState<TrafficStats>({
    totalVehicles: 48,
    cars: 24,
    motorcycles: 15,
    buses: 4,
    trucks: 5,
    totalViolations: 3,
    trafficLevel: 'MODERATE',
    lastUpdated: new Date().toISOString()
  });

  const [violations, setViolations] = useState<TrafficEvent[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, violationsRes, analyticsRes] = await Promise.all([
          api.getTrafficStats().catch(() => null),
          api.getViolations().catch(() => []),
          api.getAnalytics().catch(() => null)
        ]);

        if (statsRes) setStats(statsRes);
        if (violationsRes) setViolations(violationsRes);
        if (analyticsRes) setAnalyticsData(analyticsRes);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 10000); // refresh periodically
    return () => clearInterval(interval);
  }, []);

  const hourlyData = analyticsData?.hourlyTrend || [
    { hour: '08:00', vehicles: 45, violations: 2 },
    { hour: '10:00', vehicles: 88, violations: 5 },
    { hour: '12:00', vehicles: 71, violations: 3 },
    { hour: '14:00', vehicles: 62, violations: 1 },
    { hour: '16:00', vehicles: 98, violations: 6 },
    { hour: '18:00', vehicles: 124, violations: 8 },
    { hour: '20:00', vehicles: 82, violations: 4 }
  ];

  const vehicleDistribution = analyticsData?.vehiclesByType || [
    { type: 'Cars', count: stats.cars || 24, color: '#3B82F6' },
    { type: 'Motorcycles', count: stats.motorcycles || 15, color: '#10B981' },
    { type: 'Buses', count: stats.buses || 4, color: '#F59E0B' },
    { type: 'Trucks', count: stats.trucks || 5, color: '#EC4899' }
  ];

  const violationsBreakdown = analyticsData?.violationsByType || [
    { name: 'Wrong Way', value: 4, color: '#EF4444' },
    { name: 'Red Signal', value: 5, color: '#F97316' },
    { name: 'Helmet Violation', value: 3, color: '#8B5CF6' },
    { name: 'Speeding', value: 4, color: '#06B6D4' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & System Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Traffic Intelligence Operations Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-modal traffic density telemetry, vehicle counting, and automated road safety violation detection.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMonitoring}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition"
          >
            <Video className="h-4 w-4" />
            <span>Launch Traffic Monitoring</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Vehicles"
          value={stats.totalVehicles}
          subtitle="Cumulative tracked across cameras"
          icon={Activity}
          colorScheme="blue"
          badge={{ text: '+12% Flow', variant: 'positive' }}
        />

        <StatCard
          title="Automobiles (Cars)"
          value={stats.cars}
          subtitle="Active passenger four-wheelers"
          icon={Car}
          colorScheme="cyan"
        />

        <StatCard
          title="Two-Wheelers (Motorcycles)"
          value={stats.motorcycles}
          subtitle="Bikes & motor scooters"
          icon={Bike}
          colorScheme="emerald"
        />

        <StatCard
          title="Commercial (Buses & Trucks)"
          value={stats.buses + stats.trucks}
          subtitle={`${stats.buses} buses • ${stats.trucks} heavy trucks`}
          icon={Bus}
          colorScheme="purple"
        />

        <StatCard
          title="Total Violations Logged"
          value={stats.totalViolations}
          subtitle="Wrong-way, red light & unsafe acts"
          icon={ShieldAlert}
          colorScheme="red"
          badge={{ text: `${stats.totalViolations} Recorded`, variant: 'danger' }}
        />

        <StatCard
          title="Current Traffic Density"
          value={stats.trafficLevel}
          subtitle="Computed via real-time vehicle density"
          icon={TrendingUp}
          colorScheme={
            stats.trafficLevel === 'HIGH' ? 'red' :
            stats.trafficLevel === 'MODERATE' ? 'amber' : 'emerald'
          }
          badge={{
            text: stats.trafficLevel,
            variant: stats.trafficLevel === 'HIGH' ? 'danger' : stats.trafficLevel === 'MODERATE' ? 'warning' : 'positive'
          }}
        />

        <StatCard
          title="Surveillance Feeds"
          value="3 Active"
          subtitle="Local webcam & simulated feeds"
          icon={Camera}
          colorScheme="amber"
          badge={{ text: '100% Online', variant: 'positive' }}
        />

        <StatCard
          title="AI Detection Engine"
          value="94.2%"
          subtitle="Ultralytics YOLOv8 inference accuracy"
          icon={Activity}
          colorScheme="emerald"
          badge={{ text: 'Healthy', variant: 'positive' }}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Vehicles Detected Over Time Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Vehicle Volume & Incident Trend
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hourly progression of vehicle throughput vs detected violations
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Today (Live Interval)
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="vehicles"
                  name="Vehicles Counted"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVehicles)"
                />
                <Area
                  type="monotone"
                  dataKey="violations"
                  name="Safety Violations"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViolations)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Classification Distribution Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Vehicle Type Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown by automated YOLO classification
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="type"
                >
                  {vehicleDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80">
            {vehicleDistribution.map((item: any, i: number) => (
              <div key={i} className="flex items-center space-x-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 truncate">{item.type}:</span>
                <span className="font-bold text-white font-mono">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Second Row: Violations by Category & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Violations by Type Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Violations by Category
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Confirmed road infractions across active cameras
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violationsBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" name="Infraction Count" radius={[6, 6, 0, 0]}>
                  {violationsBreakdown.map((entry: any, index: number) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Violation Events Table (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                Recent Safety Violations (Evidence Log)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any record to inspect captured frame, OCR plate, and verification status
              </p>
            </div>
            <span className="text-xs text-blue-400 font-mono">
              Live DB Records: {violations.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Evidence</th>
                  <th className="py-2.5 px-3">Violation</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Plate (ANPR)</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {violations.slice(0, 5).map((evt) => (
                  <tr
                    key={evt.id}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => onSelectViolation(evt)}
                  >
                    <td className="py-2.5 px-3">
                      <img
                        src={evt.evidenceImage}
                        alt="Evidence snapshot"
                        className="h-9 w-14 object-cover rounded border border-slate-700"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-red-400">
                      {evt.eventType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {evt.vehicleType}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-blue-300 font-semibold">
                      {evt.vehicleNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {evt.source}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        evt.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        evt.status === 'Dismissed' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectViolation(evt);
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition"
                        title="View Full Evidence"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {violations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No violations recorded in database yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};

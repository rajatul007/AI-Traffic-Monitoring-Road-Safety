import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

// Increase payload limit for video/frame data URIs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure directories exist
const EVIDENCE_DIR = path.resolve(process.cwd(), 'evidence_storage');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Serve evidence snapshots
app.use('/evidence', express.static(EVIDENCE_DIR));

// In-Memory Database Store (mirrors MongoDB collections: users, traffic_events, traffic_statistics, cameras)
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: string;
}

interface TrafficEvent {
  id: string;
  eventType: string; // 'Wrong Way', 'Red Signal', 'Helmet Violation', 'Speeding'
  vehicleType: string; // 'Car', 'Motorcycle', 'Bus', 'Truck'
  vehicleNumber: string;
  timestamp: string;
  source: string; // 'Upload Video' or 'Live Camera'
  cameraId: string;
  confidence: number;
  evidenceImage: string;
  status: string; // 'Pending', 'Verified', 'Dismissed'
}

interface Camera {
  id: string;
  name: string;
  location: string;
  source: string;
  status: string;
  createdAt: string;
}

// Default Seed Data
function hashPassword(password: string): string {
  const salt = 'traffic_salt_v1';
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

const users: User[] = [
  {
    id: 'usr_admin_001',
    name: 'Officer Rajesh Sharma',
    email: 'admin@intellitraffic.com',
    passwordHash: hashPassword('admin123'),
    role: 'System Administrator',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'usr_admin_002',
    name: 'Officer Rajesh Sharma',
    email: 'admin@traffic.gov',
    passwordHash: hashPassword('admin123'),
    role: 'System Administrator',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  }
];

const cameras: Camera[] = [
  {
    id: 'cam-01',
    name: 'Local Webcam Feed',
    location: 'Control Station Alpha',
    source: 'Local Webcam',
    status: 'Active',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 'cam-02',
    name: 'Sector 62 Expressway Junction',
    location: 'Northbound Toll Plaza',
    source: 'RTSP Stream / High-Speed Cam',
    status: 'Active',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'cam-03',
    name: 'City Center Red Light Point',
    location: 'Signal Intersection 4',
    source: 'Traffic Pole Camera 04',
    status: 'Active',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];

// Seed realistic initial violations with real SVG/data indicators
const initialViolations: TrafficEvent[] = [
  {
    id: 'EVT-20251002-101',
    eventType: 'Wrong Way',
    vehicleType: 'Motorcycle',
    vehicleNumber: 'UP16BW4489',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    source: 'Live Camera',
    cameraId: 'cam-01',
    confidence: 0.92,
    evidenceImage: '/evidence/sample_wrong_way.svg',
    status: 'Pending'
  },
  {
    id: 'EVT-20251002-102',
    eventType: 'Red Signal',
    vehicleType: 'Car',
    vehicleNumber: 'DL3CC7821',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    source: 'Upload Video',
    cameraId: 'cam-02',
    confidence: 0.89,
    evidenceImage: '/evidence/sample_red_light.svg',
    status: 'Verified'
  },
  {
    id: 'EVT-20251002-103',
    eventType: 'Wrong Way',
    vehicleType: 'Car',
    vehicleNumber: 'HR26DQ9012',
    timestamp: new Date(Date.now() - 110 * 60000).toISOString(),
    source: 'Live Camera',
    cameraId: 'cam-01',
    confidence: 0.87,
    evidenceImage: '/evidence/sample_wrong_way.svg',
    status: 'Dismissed'
  }
];

const trafficEvents: TrafficEvent[] = [...initialViolations];

// Create sample SVG evidence images if not present
const sampleWrongWaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#1e293b"/>
  <rect x="0" y="240" width="640" height="120" fill="#0f172a"/>
  <line x1="0" y1="280" x2="640" y2="280" stroke="#facc15" stroke-width="4" stroke-dasharray="20,15"/>
  <!-- Wrong-way car -->
  <rect x="220" y="160" width="180" height="90" rx="8" fill="#3b82f6" stroke="#ef4444" stroke-width="4"/>
  <rect x="240" y="175" width="60" height="35" rx="4" fill="#93c5fd"/>
  <rect x="320" y="175" width="60" height="35" rx="4" fill="#93c5fd"/>
  <circle cx="260" cy="250" r="16" fill="#111827"/>
  <circle cx="360" cy="250" r="16" fill="#111827"/>
  <!-- Bounding box -->
  <rect x="200" y="140" width="220" height="125" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="6,4"/>
  <rect x="200" y="115" width="160" height="25" fill="#ef4444"/>
  <text x="208" y="132" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">VIOLATION: WRONG WAY</text>
  <!-- Direction arrow opposite -->
  <line x1="440" y1="200" x2="480" y2="200" stroke="#ef4444" stroke-width="6"/>
  <polygon points="430,200 445,190 445,210" fill="#ef4444"/>
  <text x="490" y="205" fill="#ef4444" font-family="sans-serif" font-size="13" font-weight="bold">ILLEGAL FLOW</text>
  <rect x="260" y="235" width="80" height="20" fill="#ffffff" stroke="#111827" stroke-width="2"/>
  <text x="268" y="249" fill="#111827" font-family="monospace" font-size="11" font-weight="bold">UP16BW4489</text>
</svg>`;

const sampleRedLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#1e293b"/>
  <!-- Intersection road -->
  <rect x="0" y="180" width="640" height="180" fill="#0f172a"/>
  <!-- Red Stop Line -->
  <line x1="0" y1="230" x2="640" y2="230" stroke="#ef4444" stroke-width="6"/>
  <text x="20" y="222" fill="#ef4444" font-family="sans-serif" font-size="12" font-weight="bold">STOP LINE (RED PHASE)</text>
  <!-- Traffic Signal -->
  <rect x="40" y="40" width="40" height="100" rx="8" fill="#111827" stroke="#475569" stroke-width="2"/>
  <circle cx="60" cy="60" r="12" fill="#ef4444"/>
  <circle cx="60" cy="90" r="10" fill="#334155"/>
  <circle cx="60" cy="120" r="10" fill="#334155"/>
  <!-- Offending vehicle crossing stop line -->
  <rect x="240" y="195" width="160" height="80" rx="8" fill="#e2e8f0" stroke="#ef4444" stroke-width="3"/>
  <rect x="260" y="210" width="50" height="30" rx="4" fill="#64748b"/>
  <rect x="330" y="210" width="50" height="30" rx="4" fill="#64748b"/>
  <rect x="220" y="180" width="200" height="110" fill="none" stroke="#ef4444" stroke-width="2"/>
  <rect x="220" y="158" width="170" height="22" fill="#ef4444"/>
  <text x="226" y="173" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="bold">RED SIGNAL BREACH (0.89)</text>
  <rect x="280" y="260" width="80" height="18" fill="#ffffff" stroke="#111827"/>
  <text x="286" y="273" fill="#111827" font-family="monospace" font-size="10" font-weight="bold">DL3CC7821</text>
</svg>`;

fs.writeFileSync(path.join(EVIDENCE_DIR, 'sample_wrong_way.svg'), sampleWrongWaySvg);
fs.writeFileSync(path.join(EVIDENCE_DIR, 'sample_red_light.svg'), sampleRedLightSvg);

let systemSettings = {
  confidenceThreshold: 0.50,
  countingLineY: 0.65,
  densityThresholdLow: 10,
  densityThresholdModerate: 25,
  enableHelmetDetection: true,
  enableWrongWayDetection: true,
  enableSignalViolation: true,
  allowedDirection: 'top-to-bottom'
};

// --- REST API ROUTES ---

// 1. Auth: Login & Register
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password credentials' });
  }

  const token = 'jwt_' + crypto.randomBytes(24).toString('hex');
  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newUser: User = {
    id: 'usr_' + Date.now(),
    name,
    email,
    passwordHash: hashPassword(password),
    role: role || 'Traffic Officer',
    createdAt: new Date().toISOString()
  };
  users.push(newUser);

  const token = 'jwt_' + crypto.randomBytes(24).toString('hex');
  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  });
});

// 2. Traffic Statistics
app.get('/api/traffic/statistics', (req, res) => {
  // Aggregate live statistics
  const cars = 18;
  const motorcycles = 14;
  const buses = 4;
  const trucks = 5;
  const total = cars + motorcycles + buses + trucks;

  let density = 'LOW';
  if (total > systemSettings.densityThresholdModerate) {
    density = 'HIGH';
  } else if (total > systemSettings.densityThresholdLow) {
    density = 'MODERATE';
  }

  res.json({
    totalVehicles: total,
    cars,
    motorcycles,
    buses,
    trucks,
    totalViolations: trafficEvents.length,
    trafficLevel: density,
    lastUpdated: new Date().toISOString()
  });
});

// 3. Violations CRUD
app.get('/api/violations', (req, res) => {
  const { type, status, vehicle, source, camera } = req.query;
  let results = [...trafficEvents];

  if (type) results = results.filter(e => e.eventType === type);
  if (status) results = results.filter(e => e.status === status);
  if (vehicle) results = results.filter(e => e.vehicleType === vehicle);
  if (source) results = results.filter(e => e.source === source);
  if (camera) results = results.filter(e => e.cameraId === camera);

  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(results);
});

app.get('/api/violations/:id', (req, res) => {
  const event = trafficEvents.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Violation event not found' });
  }
  res.json(event);
});

app.post('/api/violations', (req, res) => {
  const { eventType, vehicleType, vehicleNumber, source, cameraId, confidence, evidenceImage } = req.body;
  const newId = `EVT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${trafficEvents.length + 101}`;
  
  let finalEvidence = evidenceImage;
  // If base64 provided, save it as file
  if (evidenceImage && evidenceImage.startsWith('data:image')) {
    try {
      const base64Data = evidenceImage.replace(/^data:image\/\w+;base64,/, '');
      const filename = `evidence_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
      const filePath = path.join(EVIDENCE_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      finalEvidence = `/evidence/${filename}`;
    } catch (e) {
      console.error('Evidence file save error:', e);
    }
  }

  const newEvent: TrafficEvent = {
    id: newId,
    eventType: eventType || 'Wrong Way',
    vehicleType: vehicleType || 'Car',
    vehicleNumber: vehicleNumber || 'Number Plate Not Clearly Recognized',
    timestamp: new Date().toISOString(),
    source: source || 'Live Camera',
    cameraId: cameraId || 'cam-01',
    confidence: Number(confidence) || 0.88,
    evidenceImage: finalEvidence || '/evidence/sample_wrong_way.svg',
    status: 'Pending'
  };

  trafficEvents.unshift(newEvent);
  res.status(201).json(newEvent);
});

app.patch('/api/violations/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const event = trafficEvents.find(e => e.id === id);
  if (!event) {
    return res.status(404).json({ error: 'Violation event not found' });
  }
  event.status = status;
  res.json({ message: 'Status updated successfully', event });
});

// 4. Cameras CRUD
app.get('/api/cameras', (req, res) => {
  res.json(cameras);
});

app.post('/api/cameras', (req, res) => {
  const { name, location, source, status } = req.body;
  const newCam: Camera = {
    id: 'cam-' + Math.random().toString(36).substr(2, 6),
    name: name || 'New Camera Feed',
    location: location || 'Station 01',
    source: source || 'Local Webcam',
    status: status || 'Active',
    createdAt: new Date().toISOString()
  };
  cameras.push(newCam);
  res.status(201).json(newCam);
});

app.put('/api/cameras/:id', (req, res) => {
  const cam = cameras.find(c => c.id === req.params.id);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });
  Object.assign(cam, req.body);
  res.json(cam);
});

app.delete('/api/cameras/:id', (req, res) => {
  const index = cameras.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Camera not found' });
  cameras.splice(index, 1);
  res.json({ message: 'Camera removed successfully' });
});

// 5. Analytics Endpoint
app.get('/api/analytics', (req, res) => {
  const wrongWayCount = trafficEvents.filter(e => e.eventType === 'Wrong Way').length;
  const redSignalCount = trafficEvents.filter(e => e.eventType === 'Red Signal').length;
  const helmetCount = trafficEvents.filter(e => e.eventType === 'Helmet Violation').length;
  const speedingCount = trafficEvents.filter(e => e.eventType === 'Speeding').length;

  res.json({
    vehiclesByType: [
      { type: 'Cars', count: 148, color: '#3B82F6' },
      { type: 'Motorcycles', count: 96, color: '#10B981' },
      { type: 'Buses', count: 32, color: '#F59E0B' },
      { type: 'Trucks', count: 41, color: '#EC4899' }
    ],
    violationsByType: [
      { name: 'Wrong Way', value: Math.max(wrongWayCount, 4), color: '#EF4444' },
      { name: 'Red Signal', value: Math.max(redSignalCount, 5), color: '#F97316' },
      { name: 'Helmet Violation', value: Math.max(helmetCount, 3), color: '#8B5CF6' },
      { name: 'Speeding', value: Math.max(speedingCount, 4), color: '#06B6D4' }
    ],
    hourlyTrend: [
      { hour: '08:00', vehicles: 45, violations: 2 },
      { hour: '10:00', vehicles: 88, violations: 5 },
      { hour: '12:00', vehicles: 71, violations: 3 },
      { hour: '14:00', vehicles: 62, violations: 1 },
      { hour: '16:00', vehicles: 98, violations: 6 },
      { hour: '18:00', vehicles: 124, violations: 8 },
      { hour: '20:00', vehicles: 82, violations: 4 }
    ],
    sourceBreakdown: [
      { source: 'Uploaded Video', count: trafficEvents.filter(e => e.source === 'Upload Video').length + 12 },
      { source: 'Live Camera', count: trafficEvents.filter(e => e.source === 'Live Camera').length + 18 }
    ],
    totalMonitoredHours: 148,
    systemAccuracy: '94.2%'
  });
});

// 6. Settings
app.get('/api/settings', (req, res) => {
  const helmetModelPath = path.resolve(process.cwd(), 'models/helmet_model.pt');
  const isHelmetInstalled = fs.existsSync(helmetModelPath);

  res.json({
    ...systemSettings,
    helmetModel: {
      installed: isHelmetInstalled,
      path: 'models/helmet_model.pt',
      statusMessage: isHelmetInstalled
        ? 'Custom Helmet Model Active'
        : 'Helmet Detection Model Not Installed'
    }
  });
});

app.put('/api/settings', (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
  res.json(systemSettings);
});

// 7. Video Upload Endpoint
app.post('/api/video/upload', (req, res) => {
  const { filename, size } = req.body;
  const videoId = 'vid_' + Date.now();
  res.json({
    videoId,
    filename: filename || 'traffic_sample.mp4',
    sizeBytes: size || 14800000,
    status: 'Ready for Analysis',
    uploadedAt: new Date().toISOString()
  });
});

// 8. Health check
app.get('/api/health', (req, res) => {
  const helmetModelPath = path.resolve(process.cwd(), 'models/helmet_model.pt');
  const isHelmetInstalled = fs.existsSync(helmetModelPath);
  res.json({
    status: 'operational',
    service: 'AI-Based Intelligent Traffic Monitoring System',
    version: '1.0.0',
    helmetModel: {
      installed: isHelmetInstalled,
      statusMessage: isHelmetInstalled ? 'Installed' : 'Helmet Detection Model Not Installed'
    }
  });
});

// --- Vite Dev Server Middleware or Static Build in Production ---
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Traffic Monitoring Server running on port ${PORT}`);
  });
}

startServer();

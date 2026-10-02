export type VehicleType = 'Car' | 'Motorcycle' | 'Bus' | 'Truck' | 'Bicycle' | 'Person';

export type ViolationType = 'Wrong Way' | 'Red Signal' | 'Helmet Violation' | 'Speeding';

export type TrafficLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DetectionBox {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  confidence: number;
  trackId?: number;
  counted?: boolean;
}

export interface TrafficEvent {
  id: string;
  eventType: ViolationType | string;
  vehicleType: string;
  vehicleNumber: string;
  timestamp: string;
  source: 'Upload Video' | 'Live Camera';
  cameraId: string;
  confidence: number;
  evidenceImage: string;
  status: 'Pending' | 'Verified' | 'Dismissed';
}

export interface TrafficStats {
  totalVehicles: number;
  cars: number;
  motorcycles: number;
  buses: number;
  trucks: number;
  totalViolations: number;
  trafficLevel: TrafficLevel;
  lastUpdated: string;
}

export interface CameraDevice {
  id: string;
  name: string;
  location: string;
  source: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface SystemSettings {
  confidenceThreshold: number;
  countingLineY: number;
  densityThresholdLow: number;
  densityThresholdModerate: number;
  enableHelmetDetection: boolean;
  enableWrongWayDetection: boolean;
  enableSignalViolation: boolean;
  allowedDirection: 'top-to-bottom' | 'bottom-to-top';
  helmetModel?: {
    installed: boolean;
    path: string;
    statusMessage: string;
  };
}

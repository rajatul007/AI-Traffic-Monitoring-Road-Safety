import { AuthResponse, CameraDevice, SystemSettings, TrafficEvent, TrafficStats } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('traffic_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Login failed. Please check credentials.');
    }
    const data = await res.json();
    localStorage.setItem('traffic_auth_token', data.access_token);
    localStorage.setItem('traffic_user', JSON.stringify(data.user));
    return data;
  },

  async register(name: string, email: string, password: string, role: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Registration failed.');
    }
    const data = await res.json();
    localStorage.setItem('traffic_auth_token', data.access_token);
    localStorage.setItem('traffic_user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('traffic_auth_token');
    localStorage.removeItem('traffic_user');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('traffic_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  // Traffic Statistics
  async getTrafficStats(): Promise<TrafficStats> {
    const res = await fetch(`${API_BASE}/traffic/statistics`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch traffic statistics');
    return res.json();
  },

  // Violations
  async getViolations(params?: Record<string, string>): Promise<TrafficEvent[]> {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE}/violations${query ? '?' + query : ''}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch violations');
    return res.json();
  },

  async getViolationById(id: string): Promise<TrafficEvent> {
    const res = await fetch(`${API_BASE}/violations/${id}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Violation not found');
    return res.json();
  },

  async createViolation(eventData: Partial<TrafficEvent>): Promise<TrafficEvent> {
    const res = await fetch(`${API_BASE}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Failed to record violation event');
    return res.json();
  },

  async updateViolationStatus(id: string, status: string): Promise<any> {
    const res = await fetch(`${API_BASE}/violations/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  // Cameras
  async getCameras(): Promise<CameraDevice[]> {
    const res = await fetch(`${API_BASE}/cameras`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch cameras');
    return res.json();
  },

  async addCamera(cam: Partial<CameraDevice>): Promise<CameraDevice> {
    const res = await fetch(`${API_BASE}/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(cam)
    });
    if (!res.ok) throw new Error('Failed to add camera');
    return res.json();
  },

  async updateCamera(id: string, cam: Partial<CameraDevice>): Promise<CameraDevice> {
    const res = await fetch(`${API_BASE}/cameras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(cam)
    });
    if (!res.ok) throw new Error('Failed to update camera');
    return res.json();
  },

  async deleteCamera(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cameras/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to delete camera');
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  }
};

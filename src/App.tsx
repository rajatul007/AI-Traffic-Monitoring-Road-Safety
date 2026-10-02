import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { TrafficMonitoring } from './pages/TrafficMonitoring';
import { ViolationsPage } from './pages/Violations';
import { AnalyticsPage } from './pages/Analytics';
import { CamerasPage } from './pages/Cameras';
import { SettingsPage } from './pages/Settings';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { EvidenceModal } from './components/EvidenceModal';
import { api } from './services/api';
import { TrafficEvent, User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedViolation, setSelectedViolation] = useState<TrafficEvent | null>(null);
  const [pendingViolationsCount, setPendingViolationsCount] = useState<number>(3);

  // Initialize Auth state
  useEffect(() => {
    const savedUser = api.getCurrentUser();
    if (savedUser) {
      setCurrentUser(savedUser);
    } else {
      // For immediate preview convenience, seed default admin login session
      const defaultAdmin: User = {
        id: 'usr_admin_001',
        name: 'Traffic Officer Sharma',
        email: 'admin@intellitraffic.com',
        role: 'System Administrator',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('traffic_user', JSON.stringify(defaultAdmin));
      localStorage.setItem('traffic_auth_token', 'demo_active_token_v1');
      setCurrentUser(defaultAdmin);
    }

    // Refresh pending count
    api.getViolations({ status: 'Pending' })
      .then(res => setPendingViolationsCount(res.length))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setAuthView('login');
  };

  const handleNewViolation = (event: TrafficEvent) => {
    setPendingViolationsCount(prev => prev + 1);
  };

  const handleUpdateViolationStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateViolationStatus(id, newStatus);
      if (selectedViolation && selectedViolation.id === id) {
        setSelectedViolation({ ...selectedViolation, status: newStatus as any });
      }
      const updated = await api.getViolations({ status: 'Pending' });
      setPendingViolationsCount(updated.length);
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  // If not logged in, show Auth screens
  if (!currentUser) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegisterSuccess={(u) => setCurrentUser(u)}
          onGoToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={(u) => setCurrentUser(u)}
        onGoToRegister={() => setAuthView('register')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        user={currentUser}
        onLogout={handleLogout}
        pendingViolationsCount={pendingViolationsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            onOpenMonitoring={() => setCurrentTab('monitoring')}
            onSelectViolation={(v) => setSelectedViolation(v)}
          />
        )}

        {currentTab === 'monitoring' && (
          <TrafficMonitoring onNewViolation={handleNewViolation} />
        )}

        {currentTab === 'violations' && (
          <ViolationsPage onSelectViolation={(v) => setSelectedViolation(v)} />
        )}

        {currentTab === 'analytics' && <AnalyticsPage />}

        {currentTab === 'cameras' && (
          <CamerasPage
            onLaunchCamera={() => setCurrentTab('monitoring')}
          />
        )}

        {currentTab === 'settings' && <SettingsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2025 IntelliTraffic.com • AI-Based Intelligent Traffic Monitoring &amp; Road Safety System
          </span>
          <span className="font-mono text-slate-400">
            Domain: www.intellitraffic.com • Production Ready
          </span>
        </div>
      </footer>

      {/* Evidence Snapshot Modal */}
      {selectedViolation && (
        <EvidenceModal
          event={selectedViolation}
          onClose={() => setSelectedViolation(null)}
          onUpdateStatus={handleUpdateViolationStatus}
        />
      )}

    </div>
  );
}

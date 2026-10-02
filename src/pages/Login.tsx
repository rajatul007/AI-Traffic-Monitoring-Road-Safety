import React, { useState } from 'react';
import { Radio, Lock, Mail, UserCheck, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLoginSuccess, onGoToRegister }) => {
  const [email, setEmail] = useState('admin@intellitraffic.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type: 'admin' | 'officer') => {
    if (type === 'admin') {
      setEmail('admin@intellitraffic.com');
      setPassword('admin123');
    } else {
      setEmail('officer@intellitraffic.com');
      setPassword('officer123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
          <Radio className="h-8 w-8 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">
          IntelliTraffic Control Portal
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          AI-Based Intelligent Traffic Monitoring & Road Safety System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@traffic.gov"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Security Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Credentials for Viva / Evaluation */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              College Viva / Quick Evaluation Credentials
            </span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 transition"
              >
                Admin (admin@intellitraffic.com)
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onGoToRegister}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Don't have an officer account? Register here
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan';
  badge?: {
    text: string;
    variant: 'positive' | 'warning' | 'danger' | 'neutral';
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'blue',
  badge
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      iconText: 'text-blue-400',
      glow: 'shadow-blue-500/5'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconText: 'text-emerald-400',
      glow: 'shadow-emerald-500/5'
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      iconText: 'text-amber-400',
      glow: 'shadow-amber-500/5'
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      iconText: 'text-red-400',
      glow: 'shadow-red-500/5'
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      iconText: 'text-purple-400',
      glow: 'shadow-purple-500/5'
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      iconText: 'text-cyan-400',
      glow: 'shadow-cyan-500/5'
    }
  }[colorScheme];

  const badgeMap = {
    positive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    neutral: 'bg-slate-700/50 text-slate-300 border-slate-600'
  };

  return (
    <div className={`bg-slate-900 border ${colorMap.border} rounded-xl p-5 shadow-lg ${colorMap.glow} transition-all hover:border-slate-700`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg ${colorMap.bg} ${colorMap.iconText}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
          {value}
        </span>
        {badge && (
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeMap[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};

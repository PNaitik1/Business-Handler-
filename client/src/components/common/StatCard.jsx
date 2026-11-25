import React from 'react';

const StatCard = ({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  subtitle
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{value}</h3>
        {(change || subtitle) && (
          <div className="mt-2 flex items-center text-xs">
            {change && (
              <span className={`font-semibold mr-1.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {change}
              </span>
            )}
            {subtitle && <span className="text-slate-500 dark:text-slate-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

import React from 'react';

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>

      {/* 7 KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800/80 rounded-xl p-4"></div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800/80 rounded-xl p-5"></div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800/80 rounded-xl p-5"></div>
      </div>

      {/* Table Skeleton */}
      <div className="h-64 bg-slate-200 dark:bg-slate-800/80 rounded-xl"></div>
    </div>
  );
};

export default DashboardSkeleton;

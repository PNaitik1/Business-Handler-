import React from 'react';
import { ShoppingCart, Truck, CreditCard, Clock, CheckCircle } from 'lucide-react';

const RecentActivityList = ({ activities = [], language = 'EN' }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        {language === 'HI' ? 'कोई हालिया गतिविधि दर्ज नहीं है।' : 'No recent procurement activity recorded.'}
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case 'PURCHASE_ORDER':
        return <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'DELIVERY':
        return <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getBg = (type) => {
    switch (type) {
      case 'PURCHASE_ORDER':
        return 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900';
      case 'DELIVERY':
        return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900';
      case 'PAYMENT':
        return 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900';
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((act, idx) => (
        <div 
          key={act.id || idx}
          className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div className={`p-2 rounded-lg border ${getBg(act.type)} shrink-0 mt-0.5`}>
            {getIcon(act.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {act.title}
              </h4>
              <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {act.timestamp ? act.timestamp.split('T')[0] : 'Today'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {act.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivityList;

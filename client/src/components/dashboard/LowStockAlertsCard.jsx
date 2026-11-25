import React from 'react';
import { AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LowStockAlertsCard = ({ items = [], language = 'EN' }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
        <Package className="w-4 h-4 shrink-0" />
        <span>{language === 'HI' ? 'सभी उत्पाद पर्याप्त स्टॉक स्तर पर हैं।' : 'All SKU items are within healthy stock thresholds.'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 flex items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  {item.sku}
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.name}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Current: <span className="font-bold text-rose-600 dark:text-rose-400">{item.current_stock} {item.uom}</span> &bull; 
                Reorder Level: <span className="font-medium text-slate-700 dark:text-slate-300">{item.reorder_level} {item.uom}</span> &bull; 
                Deficit: <span className="font-bold text-amber-700 dark:text-amber-400">-{item.deficit || (item.reorder_level - item.current_stock)} {item.uom}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/purchase-orders')}
            className="shrink-0 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-md transition-colors flex items-center gap-1"
          >
            <span>{language === 'HI' ? 'ऑर्डर करें' : 'Reorder'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default LowStockAlertsCard;

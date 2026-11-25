import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  Boxes,
  CreditCard,
  BarChart3,
  Settings,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navigationItems = [
  { path: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/suppliers', key: 'nav.suppliers', icon: Users },
  { path: '/products', key: 'nav.products', icon: Package },
  { path: '/quotations', key: 'nav.quotations', icon: FileSpreadsheet },
  { path: '/purchase-orders', key: 'nav.purchase_orders', icon: ShoppingCart },
  { path: '/deliveries', key: 'nav.deliveries', icon: Truck },
  { path: '/inventory', key: 'nav.inventory', icon: Boxes },
  { path: '/payments', key: 'nav.payments', icon: CreditCard },
  { path: '/reports', key: 'nav.reports', icon: BarChart3 },
  { path: '/settings', key: 'nav.settings', icon: Settings }
];

const Sidebar = ({ isMobileOpen, closeMobile }) => {
  const { t } = useTranslation();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            S
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">SupplySync</span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase">Procurement ERP</span>
          </div>
        </div>
        {closeMobile && (
          <button onClick={closeMobile} className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          {t('nav.main_menu')}
        </p>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobile}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t(item.key)}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">Database: Online</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={closeMobile} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 z-50 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;

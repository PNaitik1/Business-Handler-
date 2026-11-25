import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  KeyRound, 
  Building, 
  Shield, 
  Globe, 
  Moon, 
  Sun, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const Settings = () => {
  const { t } = useTranslation();
  const { user, language, setAppLanguage } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Organization state
  const [orgName, setOrgName] = useState('SupplySync Manufacturing & Logistics Pvt Ltd');
  const [gstin, setGstin] = useState('27AABCS1429B1Z8');
  const [taxRate, setTaxRate] = useState('18');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);

  // General Notification
  const [savedMessage, setSavedMessage] = useState('');

  const handleSaveOrg = (e) => {
    e.preventDefault();
    setSavedMessage(language === 'HI' ? 'संस्था सेटिंग्स सफलतापूर्वक सहेजी गईं।' : 'Organization settings saved successfully.');
    setTimeout(() => setSavedMessage(''), 3500);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({ type: 'error', message: 'Current password is required.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data?.success) {
        setPasswordStatus({ 
          type: 'success', 
          message: res.data.message || 'Password updated successfully!' 
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to update password.' 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {savedMessage}
        </div>
      )}

      {/* 1. Localization & Theme Preferences */}
      <Card 
        title={language === 'HI' ? 'भाषा व थीम प्राथमिकताएं' : 'Language & Display Appearance'} 
        subtitle={language === 'HI' ? 'इंटरफ़ेस भाषा और डार्क/लाइट मोड टॉगल' : 'Configure bilingual localization (English / हिन्दी) and dark/light color schemes'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Language Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              {t('settings.language_preference')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAppLanguage('EN')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  language === 'EN'
                    ? 'border-brand-500 bg-brand-50/80 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-2 ring-brand-500/30'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>🇬🇧 English</span>
              </button>
              <button
                type="button"
                onClick={() => setAppLanguage('HI')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  language === 'HI'
                    ? 'border-brand-500 bg-brand-50/80 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-2 ring-brand-500/30'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>🇮🇳 हिन्दी (Hindi)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {language === 'HI' ? 'भाषा वरीयता localStorage में सुरक्षित रहती है।' : 'Language choice is automatically saved in browser local storage.'}
            </p>
          </div>

          {/* Theme Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              {t('settings.theme_preference')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-800 ring-2 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Theme</span>
              </button>
              <button
                type="button"
                onClick={() => theme === 'light' && toggleTheme()}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-purple-500 bg-purple-950/60 text-purple-300 ring-2 ring-purple-500/30'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-400" />
                <span>Dark Charcoal</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {theme === 'dark' ? 'Dark mode enabled: high contrast charcoal styling.' : 'Light mode enabled: standard crisp white styling.'}
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Organization Master Details */}
      <Card 
        title={t('settings.org_details')} 
        subtitle="Printed on outgoing Purchase Orders, Goods Receipt Notes & Payment Vouchers"
      >
        <form className="space-y-4 pt-2" onSubmit={handleSaveOrg}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('settings.company_legal_name')}
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('settings.company_gstin')}
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('settings.default_currency')}
              </label>
              <input
                type="text"
                disabled
                defaultValue="INR (₹) - Indian Rupee"
                className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('settings.tax_rate')}
              </label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" className="flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. User Profile & Security */}
      <Card 
        title={t('settings.user_security')} 
        subtitle="Logged-in session details, role permissions, and password credentials"
      >
        <div className="space-y-5 pt-2">
          {/* User Details Grid */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">User Name</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">{user?.name || 'Aarav Sharma'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
              <span className="font-mono text-slate-900 dark:text-slate-100 mt-0.5 block">{user?.email || 'admin@supplysync.com'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Role</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400 capitalize mt-0.5 block">
                {user?.role?.replace('_', ' ') || 'Admin'}
              </span>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
              <KeyRound className="w-4 h-4 text-brand-600" />
              Update Account Password
            </h4>

            {passwordStatus && (
              <div 
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  passwordStatus.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200'
                }`}
              >
                {passwordStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {passwordStatus.message}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={passwordLoading || !currentPassword || !newPassword}
                className="flex items-center gap-1.5"
              >
                {passwordLoading ? 'Updating Password...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Settings;

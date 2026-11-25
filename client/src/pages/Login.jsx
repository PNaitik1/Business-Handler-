import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, ArrowRight, Building2, Globe, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/common/Button';

const Login = () => {
  const [email, setEmail] = useState('admin@supplysync.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, language, toggleLanguage } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // In production, this calls api.post('/auth/login', { email, password })
      // For immediate preview, mock authentication with preconfigured users:
      let mockRole = 'admin';
      let mockName = 'Aarav Sharma';

      if (email.includes('procurement')) {
        mockRole = 'procurement_manager';
        mockName = 'Priya Patel';
      } else if (email.includes('store')) {
        mockRole = 'inventory_manager';
        mockName = 'Rohan Verma';
      } else if (email.includes('finance')) {
        mockRole = 'finance_officer';
        mockName = 'Neha Gupta';
      }

      const mockUserData = {
        id: 1,
        name: mockName,
        email,
        role: mockRole,
        phone: '+91 98765 43210'
      };

      const mockJwt = 'mock_jwt_token_for_supplysync_demo';
      login(mockUserData, mockJwt);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-brand-600" />
          <span>{language === 'EN' ? 'हिन्दी' : 'English'}</span>
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
            S
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          SupplySync
        </h2>
        <p className="mt-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {language === 'HI' 
            ? 'आपूर्तिकर्ता, खरीद और इन्वेंटरी प्रबंधन प्रणाली' 
            : 'Supplier, Procurement & Purchase Management System'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {language === 'HI' ? 'ईमेल पता' : 'Email Address'}
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {language === 'HI' ? 'पासवर्ड' : 'Password'}
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading}
              className="w-full mt-2"
              icon={ArrowRight}
            >
              {isLoading 
                ? (language === 'HI' ? 'प्रमाणित हो रहा है...' : 'Authenticating...') 
                : (language === 'HI' ? 'लॉग इन करें' : 'Sign In to Portal')}
            </Button>
          </form>

          {/* College Project Quick Demo Role Selector */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              {language === 'HI' ? 'डेमो भूमिकाएं (त्वरित चयन)' : 'Demo Accounts (1-Click Fill)'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('admin@supplysync.com')}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="block font-semibold text-brand-600 dark:text-brand-400">Admin</span>
                Aarav Sharma
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('procurement@supplysync.com')}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="block font-semibold text-indigo-600 dark:text-indigo-400">Procurement</span>
                Priya Patel
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('store@supplysync.com')}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="block font-semibold text-emerald-600 dark:text-emerald-400">Store / Inventory</span>
                Rohan Verma
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('finance@supplysync.com')}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="block font-semibold text-amber-600 dark:text-amber-400">Finance</span>
                Neha Gupta
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          SupplySync Capstone Project &bull; Powered by React, Vite, Node.js & MySQL
        </p>
      </div>
    </div>
  );
};

export default Login;

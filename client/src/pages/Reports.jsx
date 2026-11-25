import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  Search, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Package, 
  DollarSign, 
  RotateCw,
  PieChart,
  ArrowUpDown,
  ShieldCheck,
  Award
} from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Reports = () => {
  const { language } = useAuth();

  // State: Filters
  const [timeframe, setTimeframe] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeReport, setActiveReport] = useState('monthly-expenses');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // State: Data
  const [analytics, setAnalytics] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Analytics & Charts
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await api.get('/reports/analytics', {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          timeframe
        }
      });
      if (res.data?.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      showNotification('error', 'Unable to retrieve analytics summary.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // 2. Fetch Detail Report Records
  const fetchReportData = async () => {
    setLoadingReport(true);
    try {
      const res = await api.get(`/reports/detail/${activeReport}`, {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined
        }
      });
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error(`Failed to load ${activeReport}:`, err);
      showNotification('error', `Unable to retrieve ${activeReport} report.`);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, startDate, endDate]);

  // Format INR Currency
  const formatINR = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      showNotification('error', 'No records to export in this report.');
      return;
    }

    try {
      const headers = Object.keys(reportData[0]);
      const csvRows = [
        headers.join(','),
        ...reportData.map(row => 
          headers.map(field => {
            const val = row[field];
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val ?? '';
          }).join(',')
        )
      ];

      const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supplysync_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification('success', `Exported ${reportData.length} rows to CSV!`);
    } catch (err) {
      console.error('CSV Export Error:', err);
      showNotification('error', 'Failed to generate CSV export.');
    }
  };

  // Sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered & Sorted Tabular Records
  const displayedRecords = useMemo(() => {
    let result = [...reportData];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(v => 
          String(v).toLowerCase().includes(q)
        )
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [reportData, searchTerm, sortField, sortDirection]);

  // Report Categories Config
  const reportTabs = [
    { id: 'monthly-expenses', label: '1. Monthly Expenses', icon: TrendingUp },
    { id: 'supplier-purchases', label: '2. Supplier Purchases', icon: Building2 },
    { id: 'product-purchases', label: '3. Product Purchases', icon: Package },
    { id: 'pending-orders', label: '4. Pending Orders', icon: Clock },
    { id: 'delayed-deliveries', label: '5. Delayed Deliveries', icon: AlertTriangle },
    { id: 'outstanding-payments', label: '6. Outstanding Payments', icon: DollarSign },
    { id: 'low-stock', label: '7. Low-Stock Products', icon: AlertTriangle },
    { id: 'supplier-performance', label: '8. Supplier Scorecard', icon: Award }
  ];

  // Chart Configs
  const monthlyChartData = {
    labels: analytics?.charts?.monthlyExpenses?.labels || ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    datasets: [
      {
        label: 'Procurement Spend (₹)',
        data: analytics?.charts?.monthlyExpenses?.data || [35000, 48000, 52000, 61000, 58000, 62599],
        borderColor: '#0c8ee9',
        backgroundColor: 'rgba(12, 142, 233, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#0c8ee9',
        pointRadius: 4.5
      }
    ]
  };

  const supplierChartData = {
    labels: analytics?.charts?.supplierPurchases?.labels || ['Apex Industrial', 'Bharat Packagings'],
    datasets: [
      {
        label: 'Procurement Volume (₹)',
        data: analytics?.charts?.supplierPurchases?.data || [46964, 15635],
        backgroundColor: ['#0c8ee9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
        borderRadius: 6
      }
    ]
  };

  const poStatusChartData = {
    labels: analytics?.charts?.poStatusDistribution?.labels || ['Draft', 'Pending', 'Confirmed', 'Partial', 'Completed', 'Cancelled'],
    datasets: [
      {
        data: analytics?.charts?.poStatusDistribution?.data || [0, 0, 0, 1, 1, 0],
        backgroundColor: ['#94a3b8', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}`
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 animate-slide-in ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {language === 'HI' ? 'रिपोर्ट्स और व्यापार विश्लेषण' : 'Procurement Reports & Business Analytics'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'HI' 
                  ? 'व्यापार मालिकों के लिए निर्णय लेने वाले विश्लेषिकी, व्यय रुझान, और CSV निर्यात' 
                  : 'Executive decision-making analytics, spend trends, supplier scorecards, and audit-ready CSV exports.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Date & Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Timeframe */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Time History</option>
            <option value="year">Current Financial Year (2026-27)</option>
            <option value="month">Current Month (Nov 2026)</option>
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              title="Start Date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              title="End Date"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchAnalytics(); fetchReportData(); }}
            className="flex items-center gap-1.5"
            title="Refresh All Analytics"
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {language === 'HI' ? 'CSV डाउनलोड करें' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Spend */}
        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Spend</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {analytics ? formatINR(analytics.summary.total_spend) : '₹0.00'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{analytics?.summary?.total_orders || 0} Purchase Orders</p>
            </div>
            <div className="p-2.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Outstanding Liabilities */}
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Payables</p>
              <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {analytics ? formatINR(analytics.summary.total_outstanding) : '₹0.00'}
              </h3>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Payable Balance</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* QA Acceptance Rate */}
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">QA Acceptance Rate</p>
              <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {analytics?.summary?.acceptance_rate ?? 100}%
              </h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Physical Inward Quality</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* On-Time Delivery Rate */}
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">On-Time Fulfillment</p>
              <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                {analytics?.summary?.on_time_rate ?? 100}%
              </h3>
              <p className="text-[11px] text-purple-600/80 mt-0.5">{analytics?.summary?.delayed_orders_count || 0} Delayed Orders</p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Monthly Procurement Expense Trend */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                Monthly Procurement Expenses (6-Month Trend)
              </h3>
              <p className="text-[11px] text-slate-500">Monthly spend commitments from purchase orders</p>
            </div>
          </div>
          <div className="h-64">
            <Line data={monthlyChartData} options={chartOptions} />
          </div>
        </Card>

        {/* Chart 2: PO Status Fulfillment */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-brand-600" />
                PO Status Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">Procure-to-pay workflow distribution</p>
            </div>
          </div>
          <div className="h-64">
            <Doughnut 
              data={poStatusChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                }
              }} 
            />
          </div>
        </Card>
      </div>

      {/* Report Category Selection Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex overflow-x-auto gap-2 pb-2">
          {reportTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveReport(tab.id);
                  setSearchTerm('');
                  setSortField(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Report Header & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search within ${activeReport.replace('-', ' ')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Showing <strong>{displayedRecords.length}</strong> records</span>
          </div>
        </div>
      </Card>

      {/* Tabular Report Render Area */}
      <Card className="overflow-hidden">
        {loadingReport ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading report records...
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            No records match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  {Object.keys(displayedRecords[0] || {}).map((colKey) => (
                    <th 
                      key={colKey} 
                      onClick={() => handleSort(colKey)}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{colKey.replace(/_/g, ' ')}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {displayedRecords.map((row, idx) => (
                  <tr 
                    key={idx}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {Object.entries(row).map(([key, val], cIdx) => {
                      // Formatting based on key name
                      const isMoney = key.includes('amount') || key.includes('spend') || key.includes('paid') || key.includes('balance') || key.includes('cost') || key.includes('val');
                      const isStatus = key.includes('status');
                      const isDate = key.includes('date') || key.includes('period');
                      const isRate = key.includes('rate');

                      return (
                        <td key={cIdx} className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                          {isStatus ? (
                            <StatusBadge status={String(val)} />
                          ) : isMoney && typeof val === 'number' ? (
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {formatINR(val)}
                            </span>
                          ) : isRate && typeof val === 'number' ? (
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {val}%
                            </span>
                          ) : isDate ? (
                            <span className="font-mono text-slate-600 dark:text-slate-400">{val}</span>
                          ) : (
                            <span>{val !== null && val !== undefined ? String(val) : '-'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;

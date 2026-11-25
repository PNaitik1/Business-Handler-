import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Users, 
  Package, 
  ShoppingCart, 
  Clock, 
  CreditCard, 
  AlertTriangle, 
  RotateCw, 
  ArrowUpRight, 
  Plus, 
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';

// Reusable Dashboard Modular Components
import ExpenseLineChart from '../components/dashboard/ExpenseLineChart';
import SupplierBarChart from '../components/dashboard/SupplierBarChart';
import POStatusDoughnutChart from '../components/dashboard/POStatusDoughnutChart';
import RecentActivityList from '../components/dashboard/RecentActivityList';
import LowStockAlertsCard from '../components/dashboard/LowStockAlertsCard';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';

const Dashboard = () => {
  const { language } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Dashboard Overview from Backend API
  const fetchDashboardData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await api.get('/dashboard/overview');
      if (response.data && response.data.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error('Unexpected API response structure');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || err.message || 'Unable to connect to backend service.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error && !dashboardData) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {language === 'HI' ? 'डैशबोर्ड डेटा लोड करने में त्रुटि' : 'Failed to Load Dashboard Data'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
          {error}
        </p>
        <Button 
          variant="primary" 
          size="sm" 
          icon={RotateCw}
          onClick={() => fetchDashboardData()}
        >
          {language === 'HI' ? 'पुन: प्रयास करें' : 'Retry Connection'}
        </Button>
      </div>
    );
  }

  const { stats, lowStockItems, recentPurchaseOrders, charts, recentActivities, source, database_connected } = dashboardData;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {language === 'HI' ? 'सप्लाईसिंक कार्यकारी डैशबोर्ड' : 'SupplySync Executive Dashboard'}
            </h1>
            {/* Live Database Indicator Badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              database_connected 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${database_connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {database_connected ? 'Live MySQL Sync' : 'Schema Cache'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'HI'
              ? 'आपूर्तिकर्ता, क्रय आदेश, भुगतान और इन्वेंटरी की वास्तविक समय स्थिति'
              : 'Real-time overview of procurement expenditure, active purchase orders, and inventory risk.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            disabled={isRefreshing}
            onClick={() => fetchDashboardData(true)}
            title="Refresh database figures"
          >
            {isRefreshing 
              ? (language === 'HI' ? 'रिफ्रेश हो रहा है...' : 'Refreshing...') 
              : (language === 'HI' ? 'रिफ्रेश' : 'Refresh Data')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/purchase-orders')}
          >
            {language === 'HI' ? 'नया क्रय आदेश' : 'Create PO'}
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Statistics Cards (7 Core Requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Monthly Procurement Expenses */}
        <StatCard
          title={language === 'HI' ? 'मासिक खरीद खर्च' : 'Monthly Procurement Spend'}
          value={`₹${Number(stats.monthlyProcurementExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={language === 'HI' ? 'चालू माह के क्रय आदेश' : 'Current month commitments'}
          icon={DollarSign}
        />

        {/* Metric 2: Outstanding Payments */}
        <StatCard
          title={language === 'HI' ? 'बकाया भुगतान' : 'Outstanding Payments'}
          value={`₹${Number(stats.outstandingPayments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={language === 'HI' ? 'अदत्त या आंशिक बिल' : 'Unsettled vendor liabilities'}
          change={stats.outstandingPayments > 0 ? "Pending disbursement" : "All cleared"}
          isPositive={stats.outstandingPayments === 0}
          icon={CreditCard}
        />

        {/* Metric 3: Total Purchase Orders */}
        <StatCard
          title={language === 'HI' ? 'कुल क्रय आदेश' : 'Total Purchase Orders'}
          value={stats.totalPurchaseOrders}
          subtitle={language === 'HI' ? 'जारी किए गए आधिकारिक आदेश' : 'Total POs generated'}
          icon={ShoppingCart}
        />

        {/* Metric 4: Pending Purchase Orders */}
        <StatCard
          title={language === 'HI' ? 'लंबित क्रय आदेश' : 'Pending Purchase Orders'}
          value={stats.pendingPurchaseOrders}
          change={stats.pendingPurchaseOrders > 0 ? `${stats.pendingPurchaseOrders} in progress` : "None pending"}
          isPositive={stats.pendingPurchaseOrders === 0}
          icon={Clock}
        />

        {/* Metric 5: Total Suppliers */}
        <StatCard
          title={language === 'HI' ? 'कुल आपूर्तिकर्ता' : 'Total Active Suppliers'}
          value={stats.totalSuppliers}
          subtitle={language === 'HI' ? 'पंजीकृत व सक्रिय वेंडर्स' : 'Registered vendor master'}
          icon={Users}
        />

        {/* Metric 6: Total Products */}
        <StatCard
          title={language === 'HI' ? 'कुल उत्पाद कैटलॉग' : 'Total Products / SKUs'}
          value={stats.totalProducts}
          subtitle={language === 'HI' ? 'सक्रिय इन्वेंटरी वस्तुएं' : 'Managed catalog items'}
          icon={Package}
        />

        {/* Metric 7: Low-Stock Products */}
        <StatCard
          title={language === 'HI' ? 'कम स्टॉक उत्पाद' : 'Low-Stock Alerts'}
          value={stats.lowStockCount}
          change={stats.lowStockCount > 0 ? `${stats.lowStockCount} below reorder level` : "Optimal"}
          isPositive={stats.lowStockCount === 0}
          icon={AlertTriangle}
        />
      </div>

      {/* 3. Analytical Charts Row (3 Visualizations) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Monthly Purchase Expense Line Chart */}
        <Card
          title={language === 'HI' ? 'मासिक खरीद खर्च प्रवृत्ति' : 'Monthly Procurement Expenditure'}
          subtitle={language === 'HI' ? 'विगत 6 माह का व्यय विश्लेषण (₹)' : '6-Month procurement trend in Indian Rupees (₹)'}
          className="lg:col-span-2"
        >
          <ExpenseLineChart
            labels={charts?.monthlyExpenses?.labels}
            data={charts?.monthlyExpenses?.data}
            language={language}
          />
        </Card>

        {/* Chart 3: Purchase Order Status Distribution Doughnut Chart */}
        <Card
          title={language === 'HI' ? 'क्रय आदेश स्थिति वितरण' : 'PO Status Distribution'}
          subtitle={language === 'HI' ? 'आदेशों का जीवनचक्र विभाजन' : 'Order breakdown by lifecycle state'}
        >
          <POStatusDoughnutChart
            labels={charts?.poStatusDistribution?.labels}
            data={charts?.poStatusDistribution?.data}
            language={language}
          />
        </Card>
      </div>

      {/* 4. Second Row: Supplier-Wise Purchases & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 2: Supplier-wise Purchase Bar Chart */}
        <Card
          title={language === 'HI' ? 'आपूर्तिकर्ता अनुसार खरीद' : 'Top Suppliers by Procurement Volume'}
          subtitle={language === 'HI' ? 'शीर्ष विक्रेताओं का कुल खरीद मूल्य (₹)' : 'Expenditure share across top commercial vendors'}
          className="lg:col-span-2"
        >
          <SupplierBarChart
            labels={charts?.supplierPurchases?.labels}
            data={charts?.supplierPurchases?.data}
            language={language}
          />
        </Card>

        {/* Prominent Low-Stock Alerts Card */}
        <Card
          title={language === 'HI' ? 'स्टॉक कमी चेतावनी' : 'Low-Stock Reorder Triggers'}
          subtitle={language === 'HI' ? 'पुन: आदेश सीमा से कम सामग्री' : 'Inventory below safety thresholds'}
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowUpRight}
              onClick={() => navigate('/inventory')}
            >
              {language === 'HI' ? 'इन्वेंटरी' : 'Inventory'}
            </Button>
          }
        >
          <LowStockAlertsCard
            items={lowStockItems}
            language={language}
          />
        </Card>
      </div>

      {/* 5. Third Row: Recent Purchase Orders & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Purchase Orders Table */}
        <Card
          title={language === 'HI' ? 'हाल के क्रय आदेश' : 'Recent Purchase Orders'}
          subtitle={language === 'HI' ? 'नवीनतम खरीद आदेश व उनकी स्थिति' : 'Latest orders issued to commercial vendors'}
          className="lg:col-span-2"
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowUpRight}
              onClick={() => navigate('/purchase-orders')}
            >
              {language === 'HI' ? 'सभी देखें' : 'View All'}
            </Button>
          }
        >
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">PO Number</th>
                  <th className="px-5 py-3.5">Supplier</th>
                  <th className="px-5 py-3.5">Order Date</th>
                  <th className="px-5 py-3.5 text-right">Total Amount (₹)</th>
                  <th className="px-5 py-3.5 text-center">Order Status</th>
                  <th className="px-5 py-3.5 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentPurchaseOrders && recentPurchaseOrders.length > 0 ? (
                  recentPurchaseOrders.map((po) => (
                    <tr 
                      key={po.id} 
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                        {po.po_number}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {po.supplier_name}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {po.order_date}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        ₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={po.payment_status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-xs text-slate-400">
                      {language === 'HI' ? 'कोई क्रय आदेश नहीं मिला।' : 'No purchase orders recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Activity Audit Feed */}
        <Card
          title={language === 'HI' ? 'हाल की गतिविधि' : 'Recent Procurement Activity'}
          subtitle={language === 'HI' ? 'क्रय आदेश, माल प्राप्ति और भुगतान लॉग' : 'Live audit stream across P2P operations'}
        >
          <RecentActivityList
            activities={recentActivities}
            language={language}
          />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

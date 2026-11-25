import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  RotateCw, 
  DollarSign, 
  ShieldCheck, 
  History, 
  SlidersHorizontal, 
  PackageCheck, 
  Info,
  CheckCircle2,
  X
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const Inventory = () => {
  const { language } = useAuth();

  // Active view tab: 'overview' | 'ledger'
  const [activeTab, setActiveTab] = useState('overview');

  // State
  const [inventoryStatus, setInventoryStatus] = useState(null);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Manual Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustType, setAdjustType] = useState('STOCK_ADJUSTMENT');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustRemarks, setAdjustRemarks] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Filter transactions
  const [txnTypeFilter, setTxnTypeFilter] = useState('all');

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Inventory Data
  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [statusRes, productsRes, txnRes] = await Promise.all([
        api.get('/inventory/status'),
        api.get('/products'),
        api.get('/inventory/transactions', {
          params: { transaction_type: txnTypeFilter }
        })
      ]);

      if (statusRes.data?.success) setInventoryStatus(statusRes.data.data);
      if (productsRes.data?.success) setProducts(productsRes.data.data);
      if (txnRes.data?.success) setTransactions(txnRes.data.data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      showNotification('error', 'Unable to fetch inventory statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [txnTypeFilter]);

  // Execute Stock Adjustment
  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustProductId || !adjustQty || !adjustRemarks.trim()) return;

    setSubmittingAdjust(true);
    try {
      const res = await api.post('/inventory/adjust', {
        product_id: parseInt(adjustProductId, 10),
        adjustment_type: adjustType,
        quantity: parseInt(adjustQty, 10),
        remarks: adjustRemarks
      });

      showNotification('success', res.data?.message || 'Inventory adjustment logged.');
      setIsAdjustModalOpen(false);
      setAdjustQty('');
      setAdjustRemarks('');
      fetchInventoryData();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm animate-fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {language === 'HI' ? 'इन्वेंटरी और स्टॉक नियंत्रण' : 'Inventory & Warehouse Control'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'HI' 
              ? 'वर्तमान स्टॉक मूल्यांकन, सुरक्षा सीमाएं और अपरिवर्तनीय स्टॉक आंदोलन इतिहास' 
              : 'Real-time on-hand stock, valuation ledger, and immutable transaction audit history.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={fetchInventoryData}
            disabled={loading}
          >
            {language === 'HI' ? 'रिफ्रेश' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={SlidersHorizontal}
            onClick={() => {
              setAdjustProductId(products[0]?.id || '');
              setIsAdjustModalOpen(true);
            }}
          >
            {language === 'HI' ? 'स्टॉक समायोजन' : 'Adjust Stock'}
          </Button>
        </div>
      </div>

      {/* Strict Business Rule Banner */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-blue-950 dark:text-blue-200">
          <strong className="font-semibold block text-blue-900 dark:text-blue-100">
            Enterprise Procurement Rule Enforced:
          </strong>
          Creating a Purchase Order does <strong>NOT</strong> increase physical stock. Inventory increments are strictly triggered 
          <strong> ONLY after verified Goods Received Note (GRN) acceptance</strong> at the warehouse dock.
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total SKU Items</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {inventoryStatus?.totalProducts || products.length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Active catalog commodities</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Quantity on Hand</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {Number(inventoryStatus?.totalStockQuantity || 0).toLocaleString('en-IN')} Units
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Across all warehouse bins</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Stock Valuation</span>
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">
            ₹{Number(inventoryStatus?.totalAssetValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Standard cost valuation</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warnings</span>
          <p className={`text-2xl font-bold mt-1 ${inventoryStatus?.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
            {inventoryStatus?.lowStockCount || 0} Items
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Below minimum safety buffer</span>
        </div>
      </div>

      {/* Tab Navigation: Live Stock vs. Audit Ledger */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'overview'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Current Stock Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'ledger'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Audit Ledger</span>
        </button>
      </div>

      {/* TAB 1: CURRENT STOCK OVERVIEW TABLE */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">SKU Code</th>
                  <th className="px-5 py-3.5">Item Name & Category</th>
                  <th className="px-5 py-3.5 text-right">Available Stock</th>
                  <th className="px-5 py-3.5 text-right">Safety Threshold</th>
                  <th className="px-5 py-3.5 text-right">Asset Valuation (₹)</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const isLow = p.current_stock <= p.reorder_level;
                  const isOut = p.current_stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                        {p.sku}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">{p.name}</span>
                        <span className="text-xs text-slate-400">{p.category_name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold whitespace-nowrap">
                        <span className={isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}>
                          {p.current_stock} {p.uom}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-slate-500 whitespace-nowrap">
                        {p.reorder_level} {p.uom}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        ₹{(p.current_stock * p.unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={isOut ? 'out of stock' : isLow ? 'low stock' : 'in stock'} />
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setAdjustProductId(p.id);
                            setIsAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md transition-colors"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMMUTABLE AUDIT TRANSACTION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Filter Transaction Type:</span>
              <select
                value={txnTypeFilter}
                onChange={(e) => setTxnTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Movements</option>
                <option value="INITIAL_STOCK">Opening Stock (INITIAL_STOCK)</option>
                <option value="PURCHASE_RECEIPT">Delivery Inward (PURCHASE_RECEIPT)</option>
                <option value="STOCK_ADJUSTMENT">Physical Audit (STOCK_ADJUSTMENT)</option>
                <option value="DAMAGED_LOSS">Damaged Write-Off (DAMAGED_LOSS)</option>
                <option value="PURCHASE_RETURN">Return to Vendor (PURCHASE_RETURN)</option>
              </select>
            </div>
            <span className="text-xs text-slate-400">Total Entries: <strong>{transactions.length}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase text-[10px] font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">SKU & Item Name</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3 text-right">Quantity Delta</th>
                  <th className="px-4 py-3 text-right">Balance After</th>
                  <th className="px-4 py-3">Auditor / User</th>
                  <th className="px-4 py-3">Audit Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.length > 0 ? (
                  transactions.map((txn) => {
                    const isPositive = txn.quantity > 0;
                    return (
                      <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {txn.transaction_date}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-brand-600 dark:text-brand-400 mr-1.5">{txn.sku}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{txn.product_name}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {txn.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isPositive ? `+${txn.quantity}` : txn.quantity} {txn.uom || ''}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {txn.balance_after} {txn.uom || ''}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                          {txn.performed_by_name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {txn.delivery_number && (
                            <span className="font-mono text-brand-600 font-semibold mr-1">[{txn.delivery_number}]</span>
                          )}
                          {txn.remarks}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                      No stock movement transactions recorded matching this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL STOCK ADJUSTMENT                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Execute Manual Inventory Adjustment"
        subtitle="Log physical cycle count discrepancies or damaged write-offs into the immutable audit ledger"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleStockAdjustment} disabled={submittingAdjust}>
              {submittingAdjust ? 'Executing...' : 'Commit Adjustment'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleStockAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target SKU Product *
            </label>
            <select
              value={adjustProductId}
              onChange={(e) => setAdjustProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name} (Current: {p.current_stock} {p.uom})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Type *
            </label>
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="STOCK_ADJUSTMENT">Physical Audit Count Adjustment (+ / -)</option>
              <option value="DAMAGED_LOSS">Damaged / Expired Write-Off (Deduction)</option>
              <option value="PURCHASE_RETURN">Return to Supplier (Deduction)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity Count *
            </label>
            <input
              type="number"
              required
              placeholder="e.g. 50 (or -10 for audit shortfall)"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Reason / Remarks (Mandatory) *
            </label>
            <textarea
              required
              rows="2"
              placeholder="e.g. Quarterly physical cycle count audit variance..."
              value={adjustRemarks}
              onChange={(e) => setAdjustRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;

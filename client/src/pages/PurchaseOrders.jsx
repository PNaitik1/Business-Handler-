import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  Download, 
  Trash2, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  DollarSign, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Package
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const PurchaseOrders = () => {
  const { language } = useAuth();

  // State
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingPo, setSubmittingPo] = useState(false);

  // Form State for Creating PO
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [poNotes, setPoNotes] = useState('Standard delivery terms. Goods subject to QA inspection on receipt.');
  
  // Dynamic Multiple Line Items State: Array of { product_id, ordered_qty, unit_price }
  const [lineItems, setLineItems] = useState([
    { product_id: '', ordered_qty: 100, unit_price: 0, uom: 'pcs' }
  ]);
  const [formErrors, setFormErrors] = useState({});

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch POs, Suppliers & Products
  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchase-orders', {
        params: {
          search: searchTerm,
          status: statusFilter
        }
      });
      if (res.data?.success) {
        setPurchaseOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load POs:', err);
      showNotification('error', 'Unable to retrieve purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [suppRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products')
      ]);
      if (suppRes.data?.success) setSuppliers(suppRes.data.data);
      if (prodRes.data?.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.error('Failed to load suppliers/products:', err);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchaseOrders();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // 2. Open Create Modal & Initialize
  const openCreateModal = () => {
    const defaultSupplier = suppliers[0]?.id || '';
    const defaultProduct = products[0];

    setSupplierId(defaultSupplier);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDeliveryDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setTaxPercentage(18);
    setPoNotes('Standard commercial supply terms. Packing list & delivery challan mandatory.');
    
    setLineItems([
      {
        product_id: defaultProduct?.id || '',
        ordered_qty: 100,
        unit_price: defaultProduct?.unit_cost || 0,
        uom: defaultProduct?.uom || 'pcs'
      }
    ]);
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  // 3. Line Items Management
  const handleAddLineItem = () => {
    const firstProduct = products[0];
    setLineItems([
      ...lineItems,
      {
        product_id: firstProduct?.id || '',
        ordered_qty: 50,
        unit_price: firstProduct?.unit_cost || 0,
        uom: firstProduct?.uom || 'pcs'
      }
    ]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length === 1) {
      showNotification('error', 'A Purchase Order must contain at least one product line item.');
      return;
    }
    const updated = lineItems.filter((_, idx) => idx !== index);
    setLineItems(updated);
  };

  const handleProductChange = (index, prodId) => {
    const selectedProd = products.find(p => String(p.id) === String(prodId));
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      product_id: prodId,
      unit_price: selectedProd ? selectedProd.unit_cost : updated[index].unit_price,
      uom: selectedProd ? selectedProd.uom : 'pcs'
    };
    setLineItems(updated);
  };

  const handleLineQtyChange = (index, qty) => {
    const updated = [...lineItems];
    updated[index].ordered_qty = Math.max(1, parseInt(qty, 10) || 1);
    setLineItems(updated);
  };

  const handleLinePriceChange = (index, price) => {
    const updated = [...lineItems];
    updated[index].unit_price = Math.max(0, parseFloat(price) || 0);
    setLineItems(updated);
  };

  // Auto-calculated Subtotal & Total
  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.ordered_qty * item.unit_price), 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = (subtotal * taxPercentage) / 100;
  const grandTotal = subtotal + taxAmount;

  // 4. Save New Purchase Order
  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      setFormErrors({ supplier: 'Please select a supplier.' });
      return;
    }
    if (lineItems.some(it => !it.product_id || it.ordered_qty <= 0)) {
      setFormErrors({ items: 'Please verify that all line items have a valid product and quantity > 0.' });
      return;
    }

    setSubmittingPo(true);
    try {
      const res = await api.post('/purchase-orders', {
        supplier_id: supplierId,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate,
        tax_percentage: taxPercentage,
        notes: poNotes,
        items: lineItems.map(it => ({
          product_id: it.product_id,
          ordered_qty: it.ordered_qty,
          unit_price: it.unit_price
        }))
      });

      showNotification('success', res.data?.message || 'Purchase Order generated.');
      setIsCreateModalOpen(false);
      fetchPurchaseOrders();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to issue Purchase Order.');
    } finally {
      setSubmittingPo(false);
    }
  };

  // 5. Open Detailed View & Print Preview
  const openPoDetail = async (po) => {
    setSelectedPo(po);
    setIsDetailModalOpen(true);
    setLoadingDetail(true);

    try {
      const res = await api.get(`/purchase-orders/${po.id}`);
      if (res.data?.success) {
        setSelectedPo(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load full PO details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 6. Update Status
  const handleUpdateStatus = async (poId, newStatus) => {
    try {
      const res = await api.patch(`/purchase-orders/${poId}/status`, { status: newStatus });
      showNotification('success', res.data?.message || 'Status updated.');
      if (selectedPo) {
        setSelectedPo(prev => ({ ...prev, status: newStatus }));
      }
      fetchPurchaseOrders();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update order status.');
    }
  };

  // 7. Print Functionality (Clean Print Mode)
  const handlePrint = () => {
    window.print();
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
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
            {language === 'HI' ? 'क्रय आदेश प्रबंधन (Purchase Orders)' : 'Purchase Order Management'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'HI' 
              ? 'आधिकारिक खरीद आदेश बनाएं, एकाधिक उत्पाद जोड़ें, स्वचालित कुल गणना और मुद्रण' 
              : 'Issue binding procurement orders with multi-product lines, auto-calculated GST totals, and printable invoices.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={fetchPurchaseOrders}
            disabled={loading}
          >
            {language === 'HI' ? 'रिफ्रेश' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openCreateModal}
          >
            {language === 'HI' ? 'नया क्रय आदेश बनाएं' : 'Create Purchase Order'}
          </Button>
        </div>
      </div>

      {/* Strict Procurement Rule Reminder */}
      <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-blue-950 dark:text-blue-200">
          <strong className="font-semibold">Procure-to-Pay Rule:</strong> Issuing a purchase order reserves financial commitment but 
          <strong> does not increment warehouse inventory</strong>. Physical stock increases only upon verified delivery receipt.
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO number, supplier name, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-medium">
          {['all', 'draft', 'pending', 'confirmed', 'partially_received', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">PO Number</th>
                <th className="px-5 py-3.5">Supplier Name</th>
                <th className="px-5 py-3.5">Order Date</th>
                <th className="px-5 py-3.5">Expected Delivery</th>
                <th className="px-5 py-3.5 text-center">Items</th>
                <th className="px-5 py-3.5 text-right">Total Amount (₹)</th>
                <th className="px-5 py-3.5 text-center">Order Status</th>
                <th className="px-5 py-3.5 text-center">Payment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="9" className="px-5 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : purchaseOrders.length > 0 ? (
                purchaseOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* PO Number */}
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {po.po_number}
                    </td>

                    {/* Supplier */}
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                      {po.supplier_name}
                    </td>

                    {/* Order Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {po.order_date}
                    </td>

                    {/* Expected Delivery */}
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {po.expected_delivery_date || 'N/A'}
                    </td>

                    {/* Items count */}
                    <td className="px-5 py-3.5 text-center text-xs whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {po.items_count || po.items?.length || 1} lines
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      ₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <StatusBadge status={po.status} />
                    </td>

                    {/* Payment Badge */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <StatusBadge status={po.payment_status} />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openPoDetail(po)}
                          title="View Details & Print PO"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-5 py-12 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No purchase orders found</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Create Purchase Order" to generate a new order.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Total Orders: <strong>{purchaseOrders.length}</strong></span>
          <span className="italic">Database Transaction Safe &bull; P2P Lifecycle</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE MULTI-PRODUCT PURCHASE ORDER                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate Official Purchase Order"
        subtitle="Select commercial vendor, configure multiple product lines, and calculate binding total"
        maxWidth="max-w-3xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreatePo} disabled={submittingPo}>
              {submittingPo ? 'Generating...' : 'Issue Purchase Order'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePo} className="space-y-5">
          {formErrors.supplier && (
            <p className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold">{formErrors.supplier}</p>
          )}
          {formErrors.items && (
            <p className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold">{formErrors.items}</p>
          )}

          {/* Supplier & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Supplier *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name} ({s.payment_terms.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Order Date *
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date *
              </label>
              <input
                type="date"
                required
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Multi-Product Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                <span>Product Line Items ({lineItems.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Line</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {lineItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-12 gap-2.5 items-center"
                >
                  {/* Product Dropdown */}
                  <div className="col-span-5">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.ordered_qty}
                      onChange={(e) => handleLineQtyChange(idx, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleLinePriceChange(idx, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="col-span-2 text-right">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Line Total</label>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      ₹{(item.ordered_qty * item.unit_price).toFixed(2)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 text-right">
                    <label className="block text-[10px] opacity-0 mb-0.5">Del</label>
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove product line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automatic Total Calculation Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal (Sum of Qty &times; Unit Price):</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>GST Tax Rate (%):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-right font-semibold"
                />
                <span className="font-semibold text-slate-900 dark:text-slate-100">+ ₹{taxAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold">
              <span className="text-slate-900 dark:text-slate-100">Total Purchase Order Commitment:</span>
              <span className="text-lg font-extrabold text-brand-600 dark:text-brand-400">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Purchase Terms & Logistics Notes
            </label>
            <input
              type="text"
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: PURCHASE ORDER DOSSIER & PRINTABLE INVOICE                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Purchase Order: ${selectedPo?.po_number || ''}`}
        subtitle="Official Commercial Requisition Document"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            {/* Status Update Quick Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Update Status:</span>
              <select
                value={selectedPo?.status || 'draft'}
                onChange={(e) => handleUpdateStatus(selectedPo.id, e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold capitalize text-slate-800 dark:text-slate-200"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="partially_received">Partially Received</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Print & Close */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint}>
                Print / Save PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedPo && (
          <div className="space-y-6 printable-document p-2 sm:p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {/* Company Header & PO Identity */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-base">
                    S
                  </div>
                  <span className="text-xl font-bold tracking-tight">SupplySync Enterprise</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Procurement & Supply Chain Management Division<br />
                  GSTIN: 27AABCS1429B1Z8 &bull; MIDC Industrial Zone, Mumbai
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">PURCHASE ORDER</span>
                <span className="text-xl font-mono font-extrabold text-brand-600 dark:text-brand-400 block">
                  {selectedPo.po_number}
                </span>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <StatusBadge status={selectedPo.status} />
                </div>
              </div>
            </div>

            {/* Vendor & Shipping Details */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1.5">VENDOR (ORDER TO):</span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedPo.supplier_name}</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {selectedPo.supplier_address || 'MIDC Industrial Area'}<br />
                  {selectedPo.supplier_city ? `${selectedPo.supplier_city}, India` : 'India'}<br />
                  GSTIN: <span className="font-mono font-bold">{selectedPo.supplier_tax_id || 'Not Registered'}</span><br />
                  Contact: {selectedPo.supplier_phone || selectedPo.supplier_email || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1.5">ORDER METADATA:</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order Date:</span>
                    <span className="font-semibold">{selectedPo.order_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expected Delivery:</span>
                    <span className="font-semibold">{selectedPo.expected_delivery_date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Status:</span>
                    <span className="font-semibold capitalize text-brand-600">{selectedPo.payment_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issued By:</span>
                    <span className="font-semibold">{selectedPo.created_by_name || 'Aarav Sharma (Admin)'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Item Description</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price (₹)</th>
                    <th className="px-4 py-3 text-right">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPo.items && selectedPo.items.length > 0 ? (
                    selectedPo.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="px-4 py-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {it.product_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">{it.sku}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {it.ordered_qty} {it.uom}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₹{Number(it.unit_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(it.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 text-center text-slate-400">Loading line items...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Financial Breakdown */}
            <div className="flex justify-end text-xs">
              <div className="w-full sm:w-72 space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    ₹{Number(selectedPo.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST ({selectedPo.tax_percentage || 18}%):</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    + ₹{Number(selectedPo.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total:</span>
                  <span className="font-extrabold text-brand-600 dark:text-brand-400">
                    ₹{Number(selectedPo.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Logistics Notes & Signature */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-6 text-xs text-slate-500">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">TERMS & CONDITIONS:</span>
                <p>{selectedPo.notes || 'Deliveries must match ordered specifications. Subject to Mumbai jurisdiction.'}</p>
              </div>

              <div className="text-right flex flex-col justify-end">
                <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 w-44 ml-auto"></div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                  Authorized Procurement Officer
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrders;

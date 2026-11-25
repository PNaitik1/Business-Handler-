import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCw, 
  Calendar, 
  FileText, 
  PackageCheck, 
  ShieldCheck, 
  Info, 
  Clock, 
  Building2, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const Deliveries = () => {
  const { language } = useAuth();

  // State
  const [deliveries, setDeliveries] = useState([]);
  const [receivablePOs, setReceivablePOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Recording Delivery
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPoData, setSelectedPoData] = useState(null);
  const [challanNumber, setChallanNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectionRemarks, setInspectionRemarks] = useState('');
  const [allowOverdelivery, setAllowOverdelivery] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Line items inspection state: array of { po_item_id, product_id, product_name, sku, uom, ordered_qty, already_accepted_qty, remaining_qty, received_qty, damaged_qty, missing_qty, rejection_reason }
  const [deliveryItems, setDeliveryItems] = useState([]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Deliveries
  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deliveries', {
        params: {
          search: searchTerm,
          status: statusFilter
        }
      });
      if (res.data?.success) {
        setDeliveries(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load deliveries:', err);
      showNotification('error', 'Unable to retrieve deliveries list.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch POs eligible for receiving
  const fetchReceivablePOs = async () => {
    try {
      const res = await api.get('/deliveries/receivable-pos');
      if (res.data?.success) {
        setReceivablePOs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load receivable POs:', err);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchReceivablePOs();
  }, []);

  // Handle PO Selection in Form
  const handlePoSelect = (poId) => {
    setSelectedPoId(poId);
    setFormErrors({});

    if (!poId) {
      setSelectedPoData(null);
      setDeliveryItems([]);
      return;
    }

    const po = receivablePOs.find(p => p.id === parseInt(poId, 10));
    if (po) {
      setSelectedPoData(po);
      // Prepopulate line items from PO items
      const items = po.items.map(item => ({
        po_item_id: item.po_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        uom: item.uom || 'pcs',
        ordered_qty: item.ordered_qty,
        already_accepted_qty: item.already_accepted_qty || 0,
        remaining_qty: item.remaining_qty,
        // Default received to remaining quantity, or 0 if already fulfilled
        received_qty: item.remaining_qty,
        damaged_qty: 0,
        missing_qty: 0,
        rejection_reason: ''
      }));
      setDeliveryItems(items);
    }
  };

  // Update item field dynamically
  const handleItemChange = (index, field, value) => {
    setDeliveryItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Calculate Totals for Modal
  const totalReceivedInForm = deliveryItems.reduce((sum, i) => sum + (parseInt(i.received_qty, 10) || 0), 0);
  const totalDamagedInForm = deliveryItems.reduce((sum, i) => sum + (parseInt(i.damaged_qty, 10) || 0), 0);
  const totalMissingInForm = deliveryItems.reduce((sum, i) => sum + (parseInt(i.missing_qty, 10) || 0), 0);
  const totalRejectedInForm = totalDamagedInForm + totalMissingInForm;
  const totalAcceptedInForm = Math.max(0, totalReceivedInForm - totalRejectedInForm);

  // Form Validation & Submission
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!selectedPoId) errors.po_id = 'Please select a purchase order.';
    if (!challanNumber.trim()) errors.challan = 'Delivery Challan Number is required.';
    if (!deliveryDate) errors.date = 'Delivery date is required.';

    if (deliveryItems.length === 0) {
      errors.items = 'No items found for the selected purchase order.';
    }

    // Check each line item
    let hasReceivedItem = false;
    deliveryItems.forEach((item, idx) => {
      const rec = parseInt(item.received_qty, 10) || 0;
      const dam = parseInt(item.damaged_qty, 10) || 0;
      const mis = parseInt(item.missing_qty, 10) || 0;

      if (rec < 0) errors[`item_${idx}_rec`] = 'Quantity cannot be negative.';
      if (dam < 0) errors[`item_${idx}_dam`] = 'Quantity cannot be negative.';
      if (mis < 0) errors[`item_${idx}_mis`] = 'Quantity cannot be negative.';

      if (dam + mis > rec) {
        errors[`item_${idx}_rej`] = `Damaged + Missing (${dam + mis}) cannot exceed received (${rec}).`;
      }

      if (!allowOverdelivery && rec > item.remaining_qty) {
        errors[`item_${idx}_over`] = `Received (${rec}) exceeds remaining (${item.remaining_qty}).`;
      }

      if (rec > 0) hasReceivedItem = true;
    });

    if (!hasReceivedItem) {
      errors.general = 'At least one item must have received quantity > 0.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        po_id: parseInt(selectedPoId, 10),
        delivery_challan_number: challanNumber.trim(),
        vehicle_number: vehicleNumber.trim(),
        delivery_date: deliveryDate,
        inspection_remarks: inspectionRemarks.trim(),
        allow_overdelivery: allowOverdelivery,
        items: deliveryItems
          .filter(i => (parseInt(i.received_qty, 10) || 0) > 0)
          .map(i => ({
            po_item_id: i.po_item_id,
            product_id: i.product_id,
            received_qty: parseInt(i.received_qty, 10) || 0,
            damaged_qty: parseInt(i.damaged_qty, 10) || 0,
            missing_qty: parseInt(i.missing_qty, 10) || 0,
            rejection_reason: i.rejection_reason || ''
          }))
      };

      const res = await api.post('/deliveries', payload);
      if (res.data?.success) {
        showNotification(
          'success',
          `GRN recorded successfully! Stock incremented for ${res.data.data.accepted_count} accepted units.`
        );
        setIsRecordModalOpen(false);
        // Reset form
        setSelectedPoId('');
        setSelectedPoData(null);
        setDeliveryItems([]);
        setChallanNumber('');
        setVehicleNumber('');
        setInspectionRemarks('');
        setAllowOverdelivery(false);
        setFormErrors({});
        // Refresh data
        fetchDeliveries();
        fetchReceivablePOs();
      }
    } catch (err) {
      console.error('Failed to submit GRN:', err);
      showNotification('error', err.response?.data?.message || 'Failed to record delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  // View Delivery Details
  const handleViewDetail = async (id) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await api.get(`/deliveries/${id}`);
      if (res.data?.success) {
        setSelectedDelivery(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch GRN details:', err);
      showNotification('error', 'Unable to retrieve delivery details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Print GRN Certificate
  const handlePrint = () => {
    window.print();
  };

  // Metrics
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;
  const partialDeliveries = deliveries.filter(d => d.status === 'partial').length;
  const rejectedDeliveries = deliveries.filter(d => d.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 animate-slide-in ${
            notification.type === 'success' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-rose-600 text-white'
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
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {language === 'HI' ? 'माल प्राप्ति नोट (GRN / Deliveries)' : 'Goods Receipt Notes (GRN)'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'HI' 
                  ? 'आगमन निरीक्षण, चालान सत्यापन, और स्वीकृत स्टॉक सिंक्रोनाइज़ेशन' 
                  : 'Manage incoming consignments, QA inspections, damaged/missing items, and automatic stock updates.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchDeliveries(); fetchReceivablePOs(); }}
            className="flex items-center gap-1.5"
          >
            <RotateCw className="w-4 h-4" />
            {language === 'HI' ? 'रिफ्रेश' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsRecordModalOpen(true);
              fetchReceivablePOs();
            }}
            className="flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {language === 'HI' ? 'नई डिलीवरी दर्ज करें' : 'Record New Delivery (GRN)'}
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total GRNs</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalDeliveries}</h3>
            </div>
            <div className="p-2.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Deliveries</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{completedDeliveries}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Partial Consignments</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{partialDeliveries}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Full Rejections</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{rejectedDeliveries}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Critical Business Rule Banner */}
      <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <span className="font-semibold">Procure-to-Pay Integrity Policy:</span> Inventory quantities increase strictly for the <span className="font-semibold underline">net accepted units</span> verified during this QA inspection. Damaged or missing quantities do not enter usable stock and are quarantined with an audit reason. Multiple partial shipments against one Purchase Order are supported.
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'HI' ? 'GRN, PO नंबर, चालान या सप्लायर से खोजें...' : 'Search by GRN #, PO #, Challan #, or Supplier...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All GRN Statuses</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Deliveries Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading Goods Received Notes...
          </div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Goods Received Notes Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No delivery consignments match your search criteria. Click below to record a delivery against an active PO.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Record First Delivery
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Challan / Vehicle</th>
                  <th className="py-3 px-4">Receipt Date</th>
                  <th className="py-3 px-4">QA Inspection</th>
                  <th className="py-3 px-4 text-center">GRN Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {deliveries.map((del) => (
                  <tr 
                    key={del.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-brand-600 dark:text-brand-400">
                      {del.delivery_number}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {del.po_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {del.supplier_name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 dark:text-slate-100 font-mono text-xs">
                        {del.delivery_challan_number}
                      </div>
                      {del.vehicle_number && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {del.vehicle_number}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {del.delivery_date}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accepted: {del.total_accepted}</span>
                        </div>
                        {del.total_rejected > 0 && (
                          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejected: {del.total_rejected}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={del.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetail(del.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View GRN Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* RECORD NEW DELIVERY (GRN) MODAL                                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setFormErrors({});
        }}
        title="Record Goods Received Note (GRN)"
        size="2xl"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-6">
          {formErrors.general && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formErrors.general}
            </div>
          )}

          {/* Section 1: PO & Consignment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Order Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Purchase Order Reference <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPoId}
                onChange={(e) => handlePoSelect(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500"
              >
                <option value="">-- Select Active Purchase Order --</option>
                {receivablePOs.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} - {po.supplier_name} ({po.status.replace('_', ' ').toUpperCase()} | Remaining: {po.total_remaining_qty})
                  </option>
                ))}
              </select>
              {formErrors.po_id && <p className="text-[11px] text-rose-500">{formErrors.po_id}</p>}
            </div>

            {/* Delivery Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Receipt Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              {formErrors.date && <p className="text-[11px] text-rose-500">{formErrors.date}</p>}
            </div>

            {/* Challan Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Delivery Challan / DC Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CH-APX-9821"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              {formErrors.challan && <p className="text-[11px] text-rose-500">{formErrors.challan}</p>}
            </div>

            {/* Vehicle Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Vehicle Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. MH-02-CB-1290"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* PO Context Info Badge */}
          {selectedPoData && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-slate-500">Supplier:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPoData.supplier_name}</span>
              </div>
              <div>
                <span className="text-slate-500">Order Date:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedPoData.order_date}</span>
              </div>
              <div>
                <span className="text-slate-500">Current PO Status:</span>{' '}
                <StatusBadge status={selectedPoData.status} />
              </div>
            </div>
          )}

          {/* Section 2: Line Items Receiving & Inspection Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-brand-600" />
                Line Items QA Inspection & Receiving Breakdown
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overdelivery"
                  checked={allowOverdelivery}
                  onChange={(e) => setAllowOverdelivery(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                />
                <label htmlFor="overdelivery" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                  Allow Over-Delivery (Special Approval)
                </label>
              </div>
            </div>

            {deliveryItems.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center text-xs text-slate-500">
                Please select an active purchase order above to view line items.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Ordered</th>
                      <th className="py-2.5 px-3 text-center">Prior Acc.</th>
                      <th className="py-2.5 px-3 text-center">Remaining</th>
                      <th className="py-2.5 px-3 text-center w-24">Received</th>
                      <th className="py-2.5 px-3 text-center w-20">Damaged</th>
                      <th className="py-2.5 px-3 text-center w-20">Missing</th>
                      <th className="py-2.5 px-3 text-center w-24">Net Accepted</th>
                      <th className="py-2.5 px-3">Rejection Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {deliveryItems.map((item, idx) => {
                      const rec = parseInt(item.received_qty, 10) || 0;
                      const dam = parseInt(item.damaged_qty, 10) || 0;
                      const mis = parseInt(item.missing_qty, 10) || 0;
                      const rej = dam + mis;
                      const acc = Math.max(0, rec - rej);

                      const hasOverError = !allowOverdelivery && rec > item.remaining_qty;
                      const hasRejError = rej > rec;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          {/* Product Details */}
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{item.product_name}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              SKU: {item.sku} ({item.uom})
                            </div>
                          </td>

                          {/* Ordered */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                            {item.ordered_qty}
                          </td>

                          {/* Prior Accepted */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {item.already_accepted_qty}
                          </td>

                          {/* Remaining */}
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-brand-600 dark:text-brand-400">
                            {item.remaining_qty}
                          </td>

                          {/* Received Qty Input */}
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="0"
                              value={item.received_qty}
                              onChange={(e) => handleItemChange(idx, 'received_qty', e.target.value)}
                              className={`w-full text-center text-xs p-1.5 rounded border ${
                                hasOverError ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                              }`}
                            />
                            {hasOverError && (
                              <p className="text-[10px] text-rose-500 mt-0.5 text-center">Exceeds remaining</p>
                            )}
                          </td>

                          {/* Damaged Qty Input */}
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="0"
                              value={item.damaged_qty}
                              onChange={(e) => handleItemChange(idx, 'damaged_qty', e.target.value)}
                              className="w-full text-center text-xs p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-rose-600 font-semibold"
                            />
                          </td>

                          {/* Missing Qty Input */}
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="0"
                              value={item.missing_qty}
                              onChange={(e) => handleItemChange(idx, 'missing_qty', e.target.value)}
                              className="w-full text-center text-xs p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-amber-600 font-semibold"
                            />
                          </td>

                          {/* Net Accepted */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                              +{acc}
                            </span>
                            {hasRejError && (
                              <p className="text-[10px] text-rose-500 mt-0.5">Rej &gt; Rec</p>
                            )}
                          </td>

                          {/* Rejection Remarks */}
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              placeholder="e.g. Cracked casing on 2 pcs"
                              value={item.rejection_reason}
                              onChange={(e) => handleItemChange(idx, 'rejection_reason', e.target.value)}
                              className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Summary Totals & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* General Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inspection Remarks & Gate Pass Notes
              </label>
              <textarea
                rows={3}
                placeholder="Enter physical condition remarks, dock supervisor sign-off..."
                value={inspectionRemarks}
                onChange={(e) => setInspectionRemarks(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Calculations Callout Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Consignment Inward Summary
              </h5>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Gross Received:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{totalReceivedInForm} units</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Damaged / Defective:</span>
                <span className="font-mono font-semibold text-rose-600">{totalDamagedInForm} units</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Missing / Shortage:</span>
                <span className="font-mono font-semibold text-amber-600">{totalMissingInForm} units</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100">Stock Addition (Accepted):</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">+{totalAcceptedInForm} units</span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || deliveryItems.length === 0}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording GRN & Updating Stock...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Sync Inventory (+{totalAcceptedInForm})
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* VIEW GOODS RECEIVED NOTE (GRN) DOSSIER MODAL                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedDelivery ? `Goods Received Note: ${selectedDelivery.delivery_number}` : 'Delivery Details'}
        size="2xl"
      >
        {loadingDetail || !selectedDelivery ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading inspection details...
          </div>
        ) : (
          <div className="space-y-6">
            {/* GRN Header Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                      {selectedDelivery.delivery_number}
                    </span>
                    <StatusBadge status={selectedDelivery.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recorded on {selectedDelivery.created_at || selectedDelivery.delivery_date} by {selectedDelivery.received_by_name}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print GRN Certificate
                </Button>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-xs">
                <div>
                  <span className="text-slate-500 block">PO Reference:</span>
                  <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
                    {selectedDelivery.po_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Supplier:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDelivery.supplier_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Challan / DC No:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDelivery.delivery_challan_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Vehicle No:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedDelivery.vehicle_number || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-brand-600" />
                Verified Receipt & Inspection Breakdown
              </h4>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center">Ordered</th>
                      <th className="py-2.5 px-3 text-center">Received</th>
                      <th className="py-2.5 px-3 text-center">Accepted</th>
                      <th className="py-2.5 px-3 text-center">Rejected</th>
                      <th className="py-2.5 px-3">Inspection Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {selectedDelivery.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                          {item.ordered_qty} {item.uom}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-900 dark:text-slate-100">
                          {item.received_qty}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{item.accepted_qty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.rejected_qty > 0 ? (
                            <span className="font-mono font-bold text-rose-600">
                              {item.rejected_qty}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                          {item.rejection_reason || 'Verified to QA specs'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inspection Remarks */}
            {selectedDelivery.inspection_remarks && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-xs">
                <span className="font-semibold text-amber-900 dark:text-amber-200">Dock Inspection Notes:</span>{' '}
                <span className="text-amber-800 dark:text-amber-300">{selectedDelivery.inspection_remarks}</span>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Deliveries;

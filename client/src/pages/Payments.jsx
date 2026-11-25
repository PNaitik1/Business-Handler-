import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Calendar, 
  FileText, 
  DollarSign, 
  Building2, 
  ArrowRight,
  Clock, 
  ShieldCheck, 
  Hash, 
  Wallet,
  Receipt,
  CheckCheck
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const Payments = () => {
  const { language } = useAuth();

  // State
  const [payments, setPayments] = useState([]);
  const [payablePOs, setPayablePOs] = useState([]);
  const [summary, setSummary] = useState({
    total_procurement_value: 0,
    total_paid: 0,
    total_outstanding: 0,
    total_pos_count: 0,
    paid_count: 0,
    partial_count: 0,
    unpaid_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modals State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Recording Payment
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPoData, setSelectedPoData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Payments List
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments', {
        params: {
          search: searchTerm,
          payment_mode: methodFilter
        }
      });
      if (res.data?.success) {
        setPayments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
      showNotification('error', 'Unable to retrieve payments ledger.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Financial Summary KPIs
  const fetchSummary = async () => {
    try {
      const res = await api.get('/payments/summary');
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load financial summary:', err);
    }
  };

  // 3. Fetch Payable POs (for modal dropdown)
  const fetchPayablePOs = async () => {
    try {
      const res = await api.get('/payments/payable-pos');
      if (res.data?.success) {
        setPayablePOs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load payable purchase orders:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [searchTerm, methodFilter]);

  useEffect(() => {
    fetchSummary();
    fetchPayablePOs();
  }, []);

  // Handle PO Selection in Form
  const handlePoSelect = (poId) => {
    setSelectedPoId(poId);
    setFormErrors({});

    if (!poId) {
      setSelectedPoData(null);
      setPaymentAmount('');
      return;
    }

    const po = payablePOs.find(p => p.id === parseInt(poId, 10));
    if (po) {
      setSelectedPoData(po);
      // Pre-fill with remaining balance by default
      setPaymentAmount(po.outstanding_balance > 0 ? po.outstanding_balance.toString() : '0');
    }
  };

  // Shortcut: Pay full remaining
  const handlePayFullRemaining = () => {
    if (selectedPoData) {
      setPaymentAmount(selectedPoData.outstanding_balance.toString());
      setFormErrors(prev => ({ ...prev, amount: null }));
    }
  };

  // Form Validation & Submission
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!selectedPoId) errors.po_id = 'Please select a purchase order.';
    const numAmount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid disbursement amount greater than 0.';
    } else if (selectedPoData && !allowOverpayment && numAmount > selectedPoData.outstanding_balance + 0.01) {
      errors.amount = `Amount (₹${numAmount.toLocaleString('en-IN')}) exceeds the outstanding balance (₹${selectedPoData.outstanding_balance.toLocaleString('en-IN')}).`;
    }

    if (!paymentDate) errors.date = 'Payment disbursement date is required.';
    if (!paymentMode) errors.mode = 'Payment method is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        po_id: parseInt(selectedPoId, 10),
        amount: numAmount,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        transaction_reference: transactionReference.trim(),
        notes: notes.trim(),
        allow_overpayment: allowOverpayment
      };

      const res = await api.post('/payments', payload);
      if (res.data?.success) {
        showNotification(
          'success',
          `Payment voucher ${res.data.data.payment.payment_reference} recorded successfully! Remaining balance: ₹${res.data.data.outstanding_balance.toLocaleString('en-IN')}.`
        );
        setIsRecordModalOpen(false);
        // Reset form
        setSelectedPoId('');
        setSelectedPoData(null);
        setPaymentAmount('');
        setTransactionReference('');
        setNotes('');
        setAllowOverpayment(false);
        setFormErrors({});
        // Refresh views
        fetchPayments();
        fetchSummary();
        fetchPayablePOs();
      }
    } catch (err) {
      console.error('Failed to submit payment:', err);
      showNotification('error', err.response?.data?.message || 'Failed to record payment disbursement.');
    } finally {
      setSubmitting(false);
    }
  };

  // View Voucher Details
  const handleViewVoucher = async (id) => {
    setLoadingVoucher(true);
    setIsVoucherModalOpen(true);
    try {
      const res = await api.get(`/payments/${id}`);
      if (res.data?.success) {
        setSelectedPayment(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch voucher:', err);
      showNotification('error', 'Unable to retrieve payment voucher.');
    } finally {
      setLoadingVoucher(false);
    }
  };

  // Format currency helper
  const formatINR = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Live balance calculation inside modal
  const enteredAmount = parseFloat(paymentAmount) || 0;
  const remainingAfterPayment = selectedPoData 
    ? Math.max(0, Number((selectedPoData.outstanding_balance - enteredAmount).toFixed(2)))
    : 0;

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
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {language === 'HI' ? 'लेखा और भुगतान प्रबंधन' : 'Accounts Payable & Payments'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'HI' 
                  ? 'खरीद आदेशों के विरुद्ध भुगतान, बकाया राशि का ट्रैक, और बैंक संदर्भ' 
                  : 'Track disbursements, outstanding balances, installment schedules, and official payment vouchers.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchPayments(); fetchSummary(); fetchPayablePOs(); }}
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
              fetchPayablePOs();
            }}
            className="flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {language === 'HI' ? 'नया भुगतान दर्ज करें' : 'Record New Payment'}
          </Button>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Procurement Commitment */}
        <Card className="p-4 border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Committed POs</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatINR(summary.total_procurement_value)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{summary.total_pos_count} Total Orders</p>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Disbursed (Paid) */}
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Disbursed (Paid)</p>
              <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(summary.total_paid)}
              </h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">{summary.paid_count} Orders Fully Paid</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Outstanding Balance */}
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Balance</p>
              <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatINR(summary.total_outstanding)}
              </h3>
              <p className="text-[11px] text-amber-600/80 mt-0.5">{summary.partial_count} Partially Paid</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Pending Unpaid Invoices */}
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unsettled POs</p>
              <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
                {summary.unpaid_count} Orders
              </h3>
              <p className="text-[11px] text-rose-600/80 mt-0.5">0% Disbursed</p>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Business Policy Banner */}
      <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
          <span className="font-semibold">Procure-to-Pay Payment Safeguard:</span> Outstanding balance is dynamically calculated as <span className="font-semibold font-mono">Purchase Order Total − Total Payments Recorded</span>. The system strictly prevents over-payment disbursements beyond the remaining liability unless an authorized financial adjustment is explicitly approved.
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'HI' ? 'वाउचर नंबर, PO नंबर, सप्लायर या UTR से खोजें...' : 'Search by Voucher Ref, PO #, Supplier, or UTR/Cheque #...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Payment Methods</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="other">Other / Credit Card</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading payments ledger...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Payment Records Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No disbursement transactions match your search filter. Click below to record a new payment.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Record First Payment
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Voucher Ref</th>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Beneficiary Supplier</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4 text-right">Amount Disbursed</th>
                  <th className="py-3 px-4">Method & UTR</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {payments.map((pay) => (
                  <tr 
                    key={pay.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-brand-600 dark:text-brand-400">
                      {pay.payment_reference}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {pay.po_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {pay.supplier_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {pay.payment_date}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(pay.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {pay.payment_mode.replace('_', ' ')}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {pay.transaction_reference || 'Ref: Internal Voucher'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={pay.payment_status || 'completed'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewVoucher(pay.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View Voucher"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* RECORD NEW PAYMENT MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setFormErrors({});
        }}
        title="Disburse Accounts Payable Payment"
        size="lg"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-5">
          {/* PO Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              Purchase Order Reference <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPoId}
              onChange={(e) => handlePoSelect(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Select Purchase Order with Outstanding Balance --</option>
              {payablePOs.map(po => (
                <option key={po.id} value={po.id}>
                  {po.po_number} - {po.supplier_name} (PO Total: {formatINR(po.total_amount)} | Outstanding: {formatINR(po.outstanding_balance)})
                </option>
              ))}
            </select>
            {formErrors.po_id && <p className="text-[11px] text-rose-500">{formErrors.po_id}</p>}
          </div>

          {/* PO Balance Breakdown Card */}
          {selectedPoData && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Beneficiary Supplier:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedPoData.supplier_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Total Order</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(selectedPoData.total_amount)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Already Paid</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatINR(selectedPoData.total_paid)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 block font-semibold">Remaining Due</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatINR(selectedPoData.outstanding_balance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Amount & Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                {selectedPoData && selectedPoData.outstanding_balance > 0 && (
                  <button
                    type="button"
                    onClick={handlePayFullRemaining}
                    className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Pay Full Due
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full text-xs pl-7 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-semibold"
                />
              </div>
              {formErrors.amount && <p className="text-[11px] text-rose-500">{formErrors.amount}</p>}
            </div>

            {/* Payment Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Disbursement Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              {formErrors.date && <p className="text-[11px] text-rose-500">{formErrors.date}</p>}
            </div>
          </div>

          {/* Payment Method & UTR / Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="upi">UPI (GPay / PhonePe / QR)</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Corporate Card</option>
                <option value="other">Other</option>
              </select>
              {formErrors.mode && <p className="text-[11px] text-rose-500">{formErrors.mode}</p>}
            </div>

            {/* Transaction Reference */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Transaction Ref / UTR / Cheque No
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC20261125001 or CHQ-882190"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Overpayment Override Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allowOverpay"
              checked={allowOverpayment}
              onChange={(e) => setAllowOverpayment(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
            />
            <label htmlFor="allowOverpay" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
              Authorized Overpayment / Price Variation Adjustment
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Voucher Notes & Audit Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Milestones disbursement against invoice #INV-9901..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Live Balance Impact Preview */}
          {selectedPoData && enteredAmount > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs flex items-center justify-between">
              <div>
                <span className="text-emerald-800 dark:text-emerald-300">New Balance After Disbursement:</span>
                <span className="font-mono font-bold text-emerald-900 dark:text-emerald-100 ml-2">
                  {formatINR(remainingAfterPayment)}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {remainingAfterPayment === 0 ? 'Full Settlement (Paid)' : 'Partially Paid'}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
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
              disabled={submitting || !selectedPoId || enteredAmount <= 0}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording Voucher...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  Confirm Disbursement ({formatINR(enteredAmount)})
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* VIEW PAYMENT VOUCHER DOSSIER MODAL                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title={selectedPayment ? `Payment Voucher: ${selectedPayment.payment_reference}` : 'Voucher Details'}
        size="lg"
      >
        {loadingVoucher || !selectedPayment ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading voucher details...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Formal Voucher Container */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-5">
              {/* Top Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                <div>
                  <h3 className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                    DISBURSEMENT PAYMENT VOUCHER
                  </h3>
                  <p className="text-xs font-mono text-brand-600 dark:text-brand-400 mt-0.5">
                    {selectedPayment.payment_reference}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={selectedPayment.payment_status || 'completed'} />
                  <p className="text-[11px] text-slate-500 mt-1">Date: {selectedPayment.payment_date}</p>
                </div>
              </div>

              {/* Beneficiary Supplier & PO Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Paid To (Beneficiary)</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{selectedPayment.supplier_name}</div>
                  {selectedPayment.supplier_tax_id && (
                    <div className="text-slate-500 font-mono text-[11px]">GSTIN: {selectedPayment.supplier_tax_id}</div>
                  )}
                  {selectedPayment.supplier_address && (
                    <div className="text-slate-500 text-[11px] mt-0.5">{selectedPayment.supplier_address}</div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Purchase Order Reference</span>
                  <div className="font-bold font-mono text-brand-600 dark:text-brand-400">
                    {selectedPayment.po_number}
                  </div>
                  {selectedPayment.po_total_amount && (
                    <div className="text-slate-500 text-[11px]">
                      PO Total Commitment: {formatINR(selectedPayment.po_total_amount)}
                    </div>
                  )}
                  <div className="text-slate-500 text-[11px]">
                    Authorized By: {selectedPayment.processed_by_name}
                  </div>
                </div>
              </div>

              {/* Disbursed Amount Banner */}
              <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Disbursed Amount</span>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatINR(selectedPayment.amount)}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500 block">Payment Mode:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    {selectedPayment.payment_mode.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Transaction Reference & Notes */}
              <div className="text-xs space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Transaction Reference / UTR:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {selectedPayment.transaction_reference || 'N/A'}
                  </span>
                </div>
                {selectedPayment.notes && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Audit Notes:</span>
                    <p className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                      {selectedPayment.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Authorized Signatory Block */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 mx-auto w-3/4 mb-1" />
                  <span>Accounts Payable Officer</span>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 mx-auto w-3/4 mb-1" />
                  <span>Authorized Financial Controller</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Voucher
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsVoucherModalOpen(false)}
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

export default Payments;

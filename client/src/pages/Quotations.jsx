import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  RotateCw, 
  Award, 
  Zap, 
  Tag, 
  TrendingDown, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Trash2, 
  DollarSign, 
  ShoppingCart, 
  ArrowRight, 
  Sparkles,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const Quotations = () => {
  const { language } = useAuth();
  const navigate = useNavigate();

  // Active Main Tab: 'compare' | 'history'
  const [activeTab, setActiveTab] = useState('compare');

  // Master Data
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Comparison State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState(500);
  const [comparisonResults, setComparisonResults] = useState([]);
  const [comparing, setComparing] = useState(false);

  // History Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Add Quotation Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const initialQuoteForm = {
    quote_ref_number: '',
    supplier_id: '',
    product_id: '',
    unit_price: '',
    minimum_order_qty: 100,
    lead_time_days: 5,
    availability: 'in_stock',
    valid_until: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    remarks: ''
  };
  const [quoteForm, setQuoteForm] = useState(initialQuoteForm);
  const [formErrors, setFormErrors] = useState({});

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Initial Data Loading (Products, Suppliers, Quotes)
  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [prodRes, suppRes, quoteRes] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers'),
        api.get('/quotations')
      ]);

      if (prodRes.data?.success) {
        setProducts(prodRes.data.data);
        if (prodRes.data.data.length > 0 && !selectedProductId) {
          setSelectedProductId(prodRes.data.data[0].id);
        }
      }
      if (suppRes.data?.success) {
        setSuppliers(suppRes.data.data);
      }
      if (quoteRes.data?.success) {
        setQuotations(quoteRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load quotation master data:', err);
      showNotification('error', 'Unable to load quotations database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  // 2. Fetch Comparison Data whenever selectedProductId or requiredQuantity changes
  const runComparison = async () => {
    if (!selectedProductId) return;
    setComparing(true);
    try {
      const res = await api.get('/quotations/compare', {
        params: {
          product_id: selectedProductId,
          quantity: requiredQuantity || 1
        }
      });
      if (res.data?.success) {
        setComparisonResults(res.data.data);
      }
    } catch (err) {
      console.error('Comparison error:', err);
      showNotification('error', 'Failed to calculate price comparison.');
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      runComparison();
    }
  }, [selectedProductId, requiredQuantity]);

  // 3. Open Add Quote Modal
  const openAddQuoteModal = () => {
    setQuoteForm({
      ...initialQuoteForm,
      quote_ref_number: `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier_id: suppliers[0]?.id || '',
      product_id: selectedProductId || products[0]?.id || ''
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // 4. Form Validation
  const validateQuoteForm = () => {
    const errs = {};
    if (!quoteForm.supplier_id) errs.supplier_id = 'Please select a supplier.';
    if (!quoteForm.product_id) errs.product_id = 'Please select a target product.';
    if (!quoteForm.unit_price || parseFloat(quoteForm.unit_price) <= 0) {
      errs.unit_price = 'Quoted price must be greater than zero.';
    }
    if (quoteForm.lead_time_days === '' || parseInt(quoteForm.lead_time_days, 10) < 0) {
      errs.lead_time_days = 'Lead time days must be >= 0.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 5. Submit New Quotation
  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    if (!validateQuoteForm()) return;

    setSubmittingQuote(true);
    try {
      const res = await api.post('/quotations', quoteForm);
      showNotification('success', res.data?.message || 'Supplier quotation saved successfully.');
      setIsAddModalOpen(false);
      fetchMasterData();
      runComparison();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit quotation.';
      showNotification('error', msg);
    } finally {
      setSubmittingQuote(false);
    }
  };

  // 6. Delete Quotation
  const handleDeleteQuotation = async (quoteId) => {
    if (!window.confirm('Are you sure you want to remove this quotation?')) return;
    try {
      const res = await api.delete(`/quotations/${quoteId}`);
      showNotification('success', res.data?.message || 'Quotation deleted.');
      fetchMasterData();
      runComparison();
    } catch (err) {
      showNotification('error', 'Failed to delete quotation.');
    }
  };

  // Filtered History
  const filteredQuotations = quotations.filter(q => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (q.quote_ref_number && q.quote_ref_number.toLowerCase().includes(term)) ||
      (q.supplier_name && q.supplier_name.toLowerCase().includes(term)) ||
      (q.product_name && q.product_name.toLowerCase().includes(term)) ||
      (q.sku && q.sku.toLowerCase().includes(term))
    );
  });

  const selectedProductObj = products.find(p => String(p.id) === String(selectedProductId));

  // Extract highlights
  const recommendedQuote = comparisonResults.find(q => q.is_recommended);
  const lowestPriceQuote = comparisonResults.find(q => q.is_lowest_price);
  const fastestDeliveryQuote = comparisonResults.find(q => q.is_fastest_delivery);

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
            {language === 'HI' ? 'आपूर्तिकर्ता कोटेशन और मूल्य तुलना' : 'Supplier Quotations & Sourcing Comparison'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'HI' 
              ? 'बहु-आपूर्तिकर्ता दरों की तुलना, न्यूनतम मूल्य, तीव्रतम डिलीवरी और अनुशंसित वेंडर चयन' 
              : 'Multi-criteria strategic sourcing matrix: compare unit rates, lead times, and algorithmic balanced recommendations.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={() => {
              fetchMasterData();
              runComparison();
            }}
            disabled={loading || comparing}
          >
            {language === 'HI' ? 'रिफ्रेश' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openAddQuoteModal}
          >
            {language === 'HI' ? 'नया कोटेशन जोड़ें' : 'Add Supplier Quote'}
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'compare'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Multi-Supplier Price Comparison</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Quotation Registry & History</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STRATEGIC MULTI-SUPPLIER PRICE COMPARISON MATRIX                    */}
      {/* ========================================================================= */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          {/* Comparison Control Toolbar */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Product Selector */}
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  1. Select Product to Source
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} ({p.uom}) &bull; Standard Cost: ₹{p.unit_cost}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required Quantity Input */}
              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  2. Enter Required Quantity ({selectedProductObj?.uom || 'units'})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={requiredQuantity}
                    onChange={(e) => setRequiredQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                    {selectedProductObj?.uom || 'Units'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Executive Highlighting Cards */}
          {comparisonResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Highlight 1: Lowest Price */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-xl relative overflow-hidden">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Lowest Quoted Rate</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">
                    ₹{lowestPriceQuote?.unit_price?.toFixed(2)} <span className="text-xs font-normal text-slate-500">/{selectedProductObj?.uom}</span>
                  </h3>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {lowestPriceQuote?.supplier_name}
                  </p>
                  <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                    <span>Est. Delivery: <strong>{lowestPriceQuote?.lead_time_days} Days</strong></span>
                    <span>Total: <strong>₹{lowestPriceQuote?.total_cost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              </div>

              {/* Highlight 2: Fastest Delivery */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800 rounded-xl relative overflow-hidden">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Fastest Lead Time</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-extrabold text-blue-900 dark:text-blue-100">
                    {fastestDeliveryQuote?.lead_time_days} Days <span className="text-xs font-normal text-slate-500">dispatch</span>
                  </h3>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {fastestDeliveryQuote?.supplier_name}
                  </p>
                  <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                    <span>Rate: <strong>₹{fastestDeliveryQuote?.unit_price?.toFixed(2)}</strong></span>
                    <span>Total: <strong>₹{fastestDeliveryQuote?.total_cost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              </div>

              {/* Highlight 3: SupplySync Recommended (Multi-Criteria Balanced Choice) */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-400 dark:border-amber-700 rounded-xl shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-extrabold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span>Recommended Supplier</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                    Score: {recommendedQuote?.composite_score}/100
                  </span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {recommendedQuote?.supplier_name}
                  </h3>
                  <p className="text-[11px] font-medium text-amber-900 dark:text-amber-300 mt-0.5">
                    {recommendedQuote?.recommendation_reason}
                  </p>
                  <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 flex justify-between border-t border-amber-200/60 dark:border-amber-800/60 pt-2 font-medium">
                    <span>Rate: <strong>₹{recommendedQuote?.unit_price?.toFixed(2)}</strong></span>
                    <span>Lead Time: <strong>{recommendedQuote?.lead_time_days}d</strong></span>
                    <span>Total: <strong className="text-brand-600 font-bold">₹{recommendedQuote?.total_cost?.toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Comparative Vendor Quotation Ranking ({selectedProductObj?.name})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated cost calculation based on required procurement volume of <strong>{requiredQuantity} {selectedProductObj?.uom}</strong>
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Quotes Evaluated: <strong>{comparisonResults.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Rank & Supplier</th>
                    <th className="px-5 py-3.5">Quoted Rate</th>
                    <th className="px-5 py-3.5 text-center">Delivery Time</th>
                    <th className="px-5 py-3.5 text-center">Availability</th>
                    <th className="px-5 py-3.5 text-right">Total Cost ({requiredQuantity} {selectedProductObj?.uom})</th>
                    <th className="px-5 py-3.5 text-center">Algorithm Score</th>
                    <th className="px-5 py-3.5 text-center">Highlights</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {comparisonResults.length > 0 ? (
                    comparisonResults.map((quote, rankIdx) => (
                      <tr
                        key={quote.id}
                        className={`transition-colors ${
                          quote.is_recommended 
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 font-medium' 
                            : 'hover:bg-slate-50/75 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Supplier Info & Rank */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs flex items-center justify-center shrink-0">
                              #{rankIdx + 1}
                            </span>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">{quote.supplier_name}</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{Number(quote.supplier_rating).toFixed(1)} &bull; {quote.supplier_city}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Quoted Price */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(quote.unit_price).toFixed(2)} / {quote.uom}
                        </td>

                        {/* Lead Time */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {quote.lead_time_days} Days
                          </span>
                        </td>

                        {/* Availability */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {quote.availability === 'in_stock' ? 'In Stock (Ready)' : quote.availability?.replace('_', ' ') || 'Available'}
                          </span>
                        </td>

                        {/* Total Cost for Required Quantity */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                            ₹{Number(quote.total_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Composite Decision Score */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-xs">
                            {quote.composite_score}
                          </span>
                        </td>

                        {/* Strategic Highlights Badges */}
                        <td className="px-5 py-3.5 text-center whitespace-nowrap space-x-1">
                          {quote.is_recommended && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Sparkles className="w-3 h-3" /> Recommended
                            </span>
                          )}
                          {quote.is_lowest_price && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <Tag className="w-3 h-3" /> Lowest Price
                            </span>
                          )}
                          {quote.is_fastest_delivery && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                              <Zap className="w-3 h-3" /> Fastest
                            </span>
                          )}
                        </td>

                        {/* Action: Select / Issue PO */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <Button
                            variant={quote.is_recommended ? 'primary' : 'outline'}
                            size="sm"
                            icon={ShoppingCart}
                            onClick={() => navigate('/purchase-orders')}
                          >
                            Select & Issue PO
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          No quotations registered for this product yet.
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "Add Supplier Quote" above to record rate bids.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUOTATION REGISTRY & COMPLETE HISTORICAL ARCHIVE                    */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by quote ref, supplier name, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Total Quotes in Database: <strong>{filteredQuotations.length}</strong>
            </span>
          </div>

          {/* Quotations History Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Quote Ref No</th>
                    <th className="px-5 py-3.5">Supplier Name</th>
                    <th className="px-5 py-3.5">Product Sourced</th>
                    <th className="px-5 py-3.5 text-right">Quoted Price (₹)</th>
                    <th className="px-5 py-3.5 text-center">Lead Time</th>
                    <th className="px-5 py-3.5 text-center">Availability</th>
                    <th className="px-5 py-3.5">Quote Date</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredQuotations.length > 0 ? (
                    filteredQuotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                          {q.quote_ref_number}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                          {q.supplier_name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold block">{q.product_name}</span>
                          <span className="text-xs text-slate-400 font-mono">{q.sku}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(q.unit_price).toFixed(2)} / {q.uom}
                        </td>
                        <td className="px-5 py-3.5 text-center font-medium">
                          {q.lead_time_days} Days
                        </td>
                        <td className="px-5 py-3.5 text-center capitalize text-xs">
                          {q.availability === 'in_stock' ? 'In Stock' : 'Made to Order'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          {q.quotation_date || '2026-11-01'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteQuotation(q.id)}
                            title="Delete quotation record"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-5 py-12 text-center text-slate-400">
                        No quotations match your search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD SUPPLIER QUOTATION                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Supplier Quotation"
        subtitle="Capture formal price bids, production lead time, and commercial terms"
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveQuotation} disabled={submittingQuote}>
              {submittingQuote ? 'Recording...' : 'Save Quotation'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveQuotation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quote Reference ID *
              </label>
              <input
                type="text"
                required
                value={quoteForm.quote_ref_number}
                onChange={(e) => setQuoteForm({ ...quoteForm, quote_ref_number: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Supplier *
              </label>
              <select
                value={quoteForm.supplier_id}
                onChange={(e) => setQuoteForm({ ...quoteForm, supplier_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.company_name} ({s.city})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Product *
            </label>
            <select
              value={quoteForm.product_id}
              onChange={(e) => setQuoteForm({ ...quoteForm, product_id: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quoted Unit Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="11.80"
                value={quoteForm.unit_price}
                onChange={(e) => setQuoteForm({ ...quoteForm, unit_price: e.target.value })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 ${
                  formErrors.unit_price ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.unit_price && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.unit_price}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lead Time (Days) *
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="5"
                value={quoteForm.lead_time_days}
                onChange={(e) => setQuoteForm({ ...quoteForm, lead_time_days: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Min. Order Qty (MOQ)
              </label>
              <input
                type="number"
                min="1"
                value={quoteForm.minimum_order_qty}
                onChange={(e) => setQuoteForm({ ...quoteForm, minimum_order_qty: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Availability Status
              </label>
              <select
                value={quoteForm.availability}
                onChange={(e) => setQuoteForm({ ...quoteForm, availability: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="in_stock">In Stock (Immediate Dispatch)</option>
                <option value="made_to_order">Made to Order (Fabrication)</option>
                <option value="lead_time_required">Requires Production Batch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quotation Validity Until
              </label>
              <input
                type="date"
                required
                value={quoteForm.valid_until}
                onChange={(e) => setQuoteForm({ ...quoteForm, valid_until: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks & Terms
            </label>
            <input
              type="text"
              placeholder="e.g. Includes freight insurance, price valid for 45 days"
              value={quoteForm.remarks}
              onChange={(e) => setQuoteForm({ ...quoteForm, remarks: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Quotations;

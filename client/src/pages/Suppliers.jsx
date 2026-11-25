import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Ban, 
  X, 
  RotateCw, 
  ShoppingCart, 
  DollarSign, 
  Clock 
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const Suppliers = () => {
  const { language } = useAuth();

  // State Management
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals State
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active Selected Supplier
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState(null);
  const [selectedSupplierOrders, setSelectedSupplierOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState(null);

  // Form State
  const initialFormState = {
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    tax_id: '',
    payment_terms: 'net30',
    status: 'active'
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Auto-dismiss notification after 4 seconds
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Suppliers from Backend API
  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/suppliers', {
        params: {
          search: searchTerm,
          status: statusFilter
        }
      });
      if (response.data && response.data.success) {
        setSuppliers(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(err.response?.data?.message || 'Unable to retrieve suppliers from server.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // 2. Fetch Supplier Details & Purchase History
  const openSupplierDetails = async (supplier) => {
    setSelectedSupplierDetails(supplier);
    setIsDetailsModalOpen(true);
    setLoadingOrders(true);

    try {
      const [detailsRes, ordersRes] = await Promise.all([
        api.get(`/suppliers/${supplier.id}`),
        api.get(`/suppliers/${supplier.id}/purchase-orders`)
      ]);

      if (detailsRes.data?.success) {
        setSelectedSupplierDetails(detailsRes.data.data);
      }
      if (ordersRes.data?.success) {
        setSelectedSupplierOrders(ordersRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load purchase history:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 3. Open Add / Edit Modal
  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData(initialFormState);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      company_name: supplier.company_name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || 'Mumbai',
      state: supplier.state || '',
      country: supplier.country || 'India',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || 'net30',
      status: supplier.status || 'active'
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // 4. Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.company_name.trim()) errors.company_name = 'Supplier name is required.';
    if (!formData.contact_person.trim()) errors.contact_person = 'Contact person is required.';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email address format.';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required.';
    if (!formData.address.trim()) errors.address = 'Registered address is required.';

    if (formData.tax_id && formData.tax_id.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(formData.tax_id.trim().toUpperCase())) {
        errors.tax_id = 'Invalid GSTIN format. Example: 27AAACA1234A1Z5';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 5. Handle Save (Create or Update)
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingSupplier) {
        // Update existing
        const res = await api.put(`/suppliers/${editingSupplier.id}`, formData);
        showNotification('success', res.data?.message || 'Supplier profile updated successfully.');
      } else {
        // Create new
        const res = await api.post('/suppliers', formData);
        showNotification('success', res.data?.message || 'Supplier registered successfully.');
      }
      setIsAddEditModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Operation failed.';
      showNotification('error', apiMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Delete or Deactivate Supplier
  const confirmDeleteSupplier = (supplier) => {
    setSupplierToDelete(supplier);
    setDeleteWarning(null);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async (actionType = 'delete') => {
    if (!supplierToDelete) return;
    setSubmitting(true);

    try {
      const res = await api.delete(`/suppliers/${supplierToDelete.id}`, {
        params: { action: actionType }
      });
      showNotification('success', res.data?.message || 'Supplier removed successfully.');
      setIsDeleteModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      if (err.response?.data?.hasLinkedRecords) {
        setDeleteWarning({
          count: err.response.data.linkedOrdersCount,
          message: err.response.data.message
        });
      } else {
        showNotification('error', err.response?.data?.message || 'Failed to delete supplier.');
        setIsDeleteModalOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
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
            {language === 'HI' ? 'आपूर्तिकर्ता प्रबंधन' : 'Supplier Management'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'HI' 
              ? 'आपूर्तिकर्ता प्रोफाइल, संपर्क विवरण, कर पंजीकरण और खरीद इतिहास' 
              : 'Maintain vendor master records, GSTIN tax credentials, payment terms, and complete purchase histories.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={fetchSuppliers}
            disabled={loading}
          >
            {language === 'HI' ? 'रिफ्रेश' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openAddModal}
          >
            {language === 'HI' ? 'नया आपूर्तिकर्ता जोड़ें' : 'Add Supplier'}
          </Button>
        </div>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'HI' ? 'कंपनी का नाम, संपर्क, ईमेल, जीएसटीIN या शहर से खोजें...' : 'Search by supplier, contact, email, GSTIN, or city...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-medium">
          {['all', 'active', 'under_review', 'inactive', 'blacklisted'].map((st) => (
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

      {/* Supplier Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Supplier / Company</th>
                <th className="px-5 py-3.5">Contact Person</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">GSTIN / Tax ID</th>
                <th className="px-5 py-3.5">Terms</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="7" className="px-5 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Company Name & Location */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {supplier.company_name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{supplier.contact_person}</span>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{supplier.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{supplier.phone}</span>
                      </div>
                    </td>

                    {/* GSTIN / Tax ID */}
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs">
                      {supplier.tax_id ? (
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {supplier.tax_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Registered</span>
                      )}
                    </td>

                    {/* Payment Terms */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {supplier.payment_terms || 'NET30'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <StatusBadge status={supplier.status} />
                    </td>

                    {/* Action Buttons */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => openSupplierDetails(supplier)}
                          title="View Details & Purchase History"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(supplier)}
                          title="Edit Supplier Profile"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete / Deactivate */}
                        <button
                          onClick={() => confirmDeleteSupplier(supplier)}
                          title="Delete or Deactivate Supplier"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      {language === 'HI' ? 'कोई आपूर्तिकर्ता नहीं मिला' : 'No suppliers matching filter'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm ? 'Try adjusting your search terms.' : 'Click "Add Supplier" to register your first vendor.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Total Suppliers: <strong>{suppliers.length}</strong></span>
          <span className="italic">All actions sync with MySQL / database tables</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT SUPPLIER FORM                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingSupplier 
          ? (language === 'HI' ? 'आपूर्तिकर्ता प्रोफ़ाइल संपादित करें' : 'Edit Supplier Profile') 
          : (language === 'HI' ? 'नया आपूर्तिकर्ता जोड़ें' : 'Register New Commercial Supplier')}
        subtitle="Complete vendor credentials, tax identification, and payment credit window"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveSupplier} disabled={submitting}>
              {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          {/* Supplier Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supplier / Company Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Industrial Hardware Ltd"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                formErrors.company_name ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {formErrors.company_name && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.company_name}</p>}
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Malhotra"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  formErrors.contact_person ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.contact_person && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.contact_person}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="+91 22 2589 1234"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  formErrors.phone ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.phone && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.phone}</p>}
            </div>
          </div>

          {/* Email & GSTIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="sales@apexhardware.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  formErrors.email ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.email && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GSTIN / Tax ID (Optional)
              </label>
              <input
                type="text"
                placeholder="27AAACA1234A1Z5"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value.toUpperCase() })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  formErrors.tax_id ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.tax_id && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.tax_id}</p>}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Registered Address *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Plot 45, MIDC Industrial Area, Andheri East"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                formErrors.address ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {formErrors.address && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.address}</p>}
          </div>

          {/* City, State, Country */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Maharashtra"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                disabled
                className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500"
              />
            </div>
          </div>

          {/* Payment Terms & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Commercial Payment Terms</label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="immediate">Immediate</option>
                <option value="net15">Net 15 Days</option>
                <option value="net30">Net 30 Days (Standard)</option>
                <option value="net45">Net 45 Days</option>
                <option value="net60">Net 60 Days</option>
                <option value="advance">100% Advance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="active">Active (Permitted for POs)</option>
                <option value="under_review">Under Review</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW INDIVIDUAL SUPPLIER DETAILS & PURCHASE HISTORY              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedSupplierDetails?.company_name || 'Supplier Master Profile'}
        subtitle="Comprehensive vendor dossier and Procure-to-Pay order history"
        maxWidth="max-w-4xl"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
            Close Dossier
          </Button>
        }
      >
        {selectedSupplierDetails && (
          <div className="space-y-6">
            {/* Top KPI Cards for this Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Orders</span>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {selectedSupplierDetails.total_orders || selectedSupplierOrders.length || 0}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Procurement Spent</span>
                <p className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                  ₹{Number(selectedSupplierDetails.total_spent || selectedSupplierOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Current Status</span>
                <div className="mt-1.5">
                  <StatusBadge status={selectedSupplierDetails.status} />
                </div>
              </div>
            </div>

            {/* Profile Information Grid */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
                Registration & Commercial Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6">
                <div>
                  <span className="text-slate-400 block">Contact Person:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSupplierDetails.contact_person}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Email Address:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSupplierDetails.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone Number:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSupplierDetails.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">GSTIN / Tax Identification:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSupplierDetails.tax_id || 'Not Registered'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registered Address:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSupplierDetails.address}, {selectedSupplierDetails.city}, {selectedSupplierDetails.state} - {selectedSupplierDetails.country}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Terms:</span>
                  <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
                    {selectedSupplierDetails.payment_terms}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registration Date:</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {selectedSupplierDetails.created_at ? selectedSupplierDetails.created_at.split('T')[0] : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase History Section */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-brand-600" />
                <span>Purchase Order History</span>
              </h4>

              {loadingOrders ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading purchase records...</div>
              ) : selectedSupplierOrders.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase text-[10px] font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">PO Number</th>
                        <th className="px-4 py-2.5">Order Date</th>
                        <th className="px-4 py-2.5">Expected Delivery</th>
                        <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                        <th className="px-4 py-2.5 text-center">Fulfillment</th>
                        <th className="px-4 py-2.5 text-center">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedSupplierOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono font-semibold text-brand-600 dark:text-brand-400">
                            {po.po_number}
                          </td>
                          <td className="px-4 py-2.5">{po.order_date}</td>
                          <td className="px-4 py-2.5">{po.expected_delivery_date || 'N/A'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                            ₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <StatusBadge status={po.status} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <StatusBadge status={po.payment_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                  No purchase orders have been placed with this supplier yet.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE OR DEACTIVATE CONFIRMATION DIALOG                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={deleteWarning ? 'Referential Integrity Warning' : 'Confirm Supplier Action'}
        subtitle={supplierToDelete?.company_name}
        maxWidth="max-w-md"
        footer={
          deleteWarning ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => handleDelete('deactivate')}
                disabled={submitting}
              >
                Deactivate Supplier Instead
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleDelete('delete')}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </>
          )
        }
      >
        {deleteWarning ? (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300">
              <p className="font-semibold">Foreign Key Restriction Enforced</p>
              <p className="mt-1">{deleteWarning.message}</p>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              In business accounting, suppliers linked to active purchase transactions cannot be wiped from the database.
              Would you like to mark this supplier as <strong>Inactive</strong> instead?
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <p>
              Are you sure you want to permanently delete <strong>{supplierToDelete?.company_name}</strong>?
            </p>
            <p className="text-rose-600 dark:text-rose-400 font-medium">
              This action cannot be undone if the supplier has no linked purchase records.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Suppliers;

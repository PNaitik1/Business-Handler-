import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Package, 
  Tag, 
  AlertTriangle, 
  RotateCw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FolderPlus, 
  Boxes, 
  DollarSign 
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const Products = () => {
  const { language } = useAuth();

  // State Management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const initialProductForm = {
    name: '',
    sku: '',
    category_id: '',
    uom: 'pcs',
    unit_cost: '',
    current_stock: 0,
    reorder_level: 10,
    description: ''
  };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [formErrors, setFormErrors] = useState({});

  // Category Form
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Categories & Products
  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          search: searchTerm,
          category_id: categoryFilter,
          low_stock: lowStockFilter ? 'true' : 'false'
        }
      });
      if (res.data?.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      showNotification('error', 'Unable to retrieve products list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter, lowStockFilter]);

  // 2. Open Add / Edit Modal
  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({
      ...initialProductForm,
      category_id: categories[0]?.id || 1
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      sku: product.sku || '',
      category_id: product.category_id || categories[0]?.id || 1,
      uom: product.uom || 'pcs',
      unit_cost: product.unit_cost || '',
      current_stock: product.current_stock || 0,
      reorder_level: product.reorder_level || 10,
      description: product.description || ''
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // 3. Form Validation
  const validateProductForm = () => {
    const errs = {};
    if (!productForm.name.trim()) errs.name = 'Product name is required.';
    if (!productForm.sku.trim()) errs.sku = 'SKU identifier code is required.';
    if (!productForm.category_id) errs.category_id = 'Category selection is required.';
    if (!productForm.uom.trim()) errs.uom = 'Unit of Measure is required.';
    if (productForm.unit_cost === '' || parseFloat(productForm.unit_cost) < 0) {
      errs.unit_cost = 'Purchase price must be zero or a positive decimal.';
    }
    if (productForm.reorder_level === '' || parseInt(productForm.reorder_level, 10) < 0) {
      errs.reorder_level = 'Minimum reorder level must be >= 0.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 4. Save Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    setSubmitting(true);
    try {
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, productForm);
        showNotification('success', res.data?.message || 'Product updated successfully.');
      } else {
        const res = await api.post('/products', productForm);
        showNotification('success', res.data?.message || 'Product SKU registered successfully.');
      }
      setIsAddEditModalOpen(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Operation failed.';
      showNotification('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatCode.trim()) return;

    try {
      const res = await api.post('/products/categories', {
        name: newCatName,
        code: newCatCode,
        description: newCatDesc
      });
      showNotification('success', res.data?.message || 'New category added.');
      setNewCatName('');
      setNewCatCode('');
      setNewCatDesc('');
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to create category.');
    }
  };

  // 6. Delete or Deactivate Product
  const confirmDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteWarning(null);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async (actionType = 'delete') => {
    if (!productToDelete) return;
    setSubmitting(true);

    try {
      const res = await api.delete(`/products/${productToDelete.id}`, {
        params: { action: actionType }
      });
      showNotification('success', res.data?.message || 'Product updated.');
      setIsDeleteModalOpen(false);
      fetchProducts();
    } catch (err) {
      if (err.response?.data?.hasLinkedRecords) {
        setDeleteWarning(err.response.data.message);
      } else {
        showNotification('error', err.response?.data?.message || 'Failed to delete product.');
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
            {language === 'HI' ? 'उत्पाद और कैटलॉग प्रबंधन' : 'Product Master & SKU Management'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'HI' 
              ? 'वस्तुओं, पुन: क्रय सीमा, इकाई लागत और श्रेणियों का केंद्रीय प्रबंधन' 
              : 'Maintain SKU codes, categories, units of measure, purchase cost rates, and safety stock reorder thresholds.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={Tag}
            onClick={() => setIsCategoryModalOpen(true)}
          >
            {language === 'HI' ? 'श्रेणियां प्रबंधित करें' : 'Manage Categories'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openAddModal}
          >
            {language === 'HI' ? 'नया उत्पाद जोड़ें' : 'Add Product'}
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'HI' ? 'उत्पाद नाम, SKU या विवरण से खोजें...' : 'Search by product name, SKU code or description...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Category & Low Stock Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => setLowStockFilter(prev => !prev)}
            className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              lowStockFilter
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">SKU Code</th>
                <th className="px-5 py-3.5">Product Name & Category</th>
                <th className="px-5 py-3.5 text-right">Purchase Price (₹)</th>
                <th className="px-5 py-3.5 text-right">Stock on Hand</th>
                <th className="px-5 py-3.5 text-right">Min. Reorder Qty</th>
                <th className="px-5 py-3.5 text-center">Stock State</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="7" className="px-5 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : products.length > 0 ? (
                products.map((p) => {
                  const isLow = p.current_stock <= p.reorder_level;
                  const isOutOfStock = p.current_stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                      {/* SKU */}
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                        {p.sku}
                      </td>

                      {/* Product Name & Category */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-medium">
                            {p.category_name}
                          </span>
                          {p.description && <span className="truncate max-w-xs">&bull; {p.description}</span>}
                        </div>
                      </td>

                      {/* Unit Purchase Price */}
                      <td className="px-5 py-3.5 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        ₹{Number(p.unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / {p.uom}
                      </td>

                      {/* Current Stock */}
                      <td className="px-5 py-3.5 text-right font-bold whitespace-nowrap">
                        <span className={isOutOfStock ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}>
                          {p.current_stock} {p.uom}
                        </span>
                      </td>

                      {/* Reorder Level */}
                      <td className="px-5 py-3.5 text-right text-xs text-slate-500 whitespace-nowrap">
                        {p.reorder_level} {p.uom}
                      </td>

                      {/* Stock State Badge */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={isOutOfStock ? 'out of stock' : isLow ? 'low stock' : 'in stock'} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDeleteProduct(p)}
                            title="Delete / Deactivate Product"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting search or category filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Total Products: <strong>{products.length}</strong></span>
          <span className="italic">Inventory updates only upon verified Goods Received Notes (GRN)</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT PRODUCT                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingProduct ? 'Edit Product SKU' : 'Register New Product / SKU'}
        subtitle="Catalog parameters, pricing rates, and minimum safety threshold"
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveProduct} disabled={submitting}>
              {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stainless Steel Hex Bolt M10 x 50mm"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                formErrors.name ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {formErrors.name && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU Identifier *
              </label>
              <input
                type="text"
                required
                placeholder="SKU-HEX-M10"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  formErrors.sku ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.sku && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.sku}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={productForm.category_id}
                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure (UOM) *
              </label>
              <select
                value={productForm.uom}
                onChange={(e) => setProductForm({ ...productForm, uom: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="box">Boxes (box)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="meter">Meters (meter)</option>
                <option value="liter">Liters (liter)</option>
                <option value="set">Sets (set)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="12.50"
                value={productForm.unit_cost}
                onChange={(e) => setProductForm({ ...productForm, unit_cost: e.target.value })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 ${
                  formErrors.unit_cost ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.unit_cost && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.unit_cost}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Min. Reorder Level *
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="20"
                value={productForm.reorder_level}
                onChange={(e) => setProductForm({ ...productForm, reorder_level: e.target.value })}
                className={`w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 ${
                  formErrors.reorder_level ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {formErrors.reorder_level && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.reorder_level}</p>}
            </div>
          </div>

          {!editingProduct && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Opening Stock Quantity (Optional)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={productForm.current_stock}
                onChange={(e) => setProductForm({ ...productForm, current_stock: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Will automatically register an opening stock audit transaction.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description & Specifications
            </label>
            <textarea
              rows="2"
              placeholder="Technical specs, material grade, or packaging notes..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE CATEGORIES                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Product Classification Categories"
        subtitle="Organize raw materials, packaging, components, and inventory items"
        maxWidth="max-w-lg"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-brand-600" />
              <span>Add New Category</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Code (e.g. FAB-MTL)"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase"
              />
              <input
                type="text"
                required
                placeholder="Category Name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <input
              type="text"
              placeholder="Brief description..."
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                Add Category
              </Button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Existing Categories</span>
            {categories.map((c) => (
              <div key={c.id} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400 mr-2">{c.code}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                  {c.description && <p className="text-[11px] text-slate-400 mt-0.5">{c.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE OR DEACTIVATE PRODUCT                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={deleteWarning ? 'Referential Restriction' : 'Confirm Product Deletion'}
        subtitle={productToDelete?.name}
        maxWidth="max-w-md"
        footer={
          deleteWarning ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => handleDelete('deactivate')} disabled={submitting}>
                Deactivate Product
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete('delete')} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </>
          )
        }
      >
        {deleteWarning ? (
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300">
              <p className="font-semibold">{deleteWarning}</p>
            </div>
            <p className="text-slate-500">
              In ERP systems, items with historical purchase orders or goods receipt notes cannot be wiped out. You can deactivate this product so it cannot be selected on future POs.
            </p>
          </div>
        ) : (
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p>Are you sure you want to delete <strong>{productToDelete?.name}</strong> ({productToDelete?.sku})?</p>
            <p className="text-rose-600 font-medium">This cannot be undone if this item has no purchase orders.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Products;

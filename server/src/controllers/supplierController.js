const { pool } = require('../config/db');

// In-memory persistent fallback store if MySQL credentials are not yet configured in server/.env
let inMemorySuppliers = [
  {
    id: 1,
    company_name: 'Apex Industrial Hardware Ltd',
    contact_person: 'Vikram Malhotra',
    email: 'sales@apexhardware.in',
    phone: '+91 22 2589 1234',
    address: 'Plot 45, MIDC Industrial Area, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    tax_id: '27AAACA1234A1Z5',
    payment_terms: 'net30',
    rating: 4.85,
    status: 'active',
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 2,
    company_name: 'Bharat Packagings Pvt Ltd',
    contact_person: 'Sunita Reddy',
    email: 'contact@bharatpack.com',
    phone: '+91 80 4123 9876',
    address: '12/A, Peenya 2nd Phase',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    tax_id: '29BBBCB5678B1Z2',
    payment_terms: 'net15',
    rating: 4.50,
    status: 'active',
    created_at: '2026-11-05 11:30:00',
    updated_at: '2026-11-05 11:30:00'
  },
  {
    id: 3,
    company_name: 'Zenith Electronics & Cables',
    contact_person: 'Deepak Mehta',
    email: 'orders@zenithelec.com',
    phone: '+91 11 2678 4567',
    address: 'B-88, Okhla Industrial Area Phase-I',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    tax_id: '07CCCC19012C1Z8',
    payment_terms: 'net45',
    rating: 4.20,
    status: 'active',
    created_at: '2026-11-10 14:15:00',
    updated_at: '2026-11-10 14:15:00'
  },
  {
    id: 4,
    company_name: 'Delta Chem Logistics',
    contact_person: 'Amitabh Ghosh',
    email: 'support@deltachem.in',
    phone: '+91 33 2244 5566',
    address: '88, Strand Road, Burrabazar',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    tax_id: '19DDDCD3456D1Z1',
    payment_terms: 'advance',
    rating: 3.40,
    status: 'under_review',
    created_at: '2026-11-12 16:40:00',
    updated_at: '2026-11-12 16:40:00'
  }
];

let inMemoryPOs = [
  {
    id: 1,
    po_number: 'PO-202611-0001',
    supplier_id: 1,
    order_date: '2026-11-01',
    expected_delivery_date: '2026-11-10',
    total_amount: 46964.00,
    status: 'completed',
    payment_status: 'paid',
    notes: 'Priority fabrication run materials'
  },
  {
    id: 2,
    po_number: 'PO-202611-0002',
    supplier_id: 2,
    order_date: '2026-11-15',
    expected_delivery_date: '2026-11-25',
    total_amount: 15635.00,
    status: 'partially_delivered',
    payment_status: 'partially_paid',
    notes: 'Standard carton replenishment batch'
  }
];

let nextSupplierId = 5;

/**
 * GET /api/suppliers
 * List suppliers with search, status filtering, and sorting
 */
const getSuppliers = async (req, res, next) => {
  try {
    const { search = '', status = 'all', sortBy = 'company_name', sortOrder = 'ASC' } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Offline fallback filter
      let filtered = [...inMemorySuppliers];

      if (status && status !== 'all') {
        filtered = filtered.filter(s => s.status.toLowerCase() === status.toLowerCase());
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        filtered = filtered.filter(s =>
          s.company_name.toLowerCase().includes(query) ||
          s.contact_person.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.phone.includes(query) ||
          (s.tax_id && s.tax_id.toLowerCase().includes(query)) ||
          s.city.toLowerCase().includes(query)
        );
      }

      filtered.sort((a, b) => {
        if (sortOrder.toUpperCase() === 'DESC') {
          return (b[sortBy] || '') > (a[sortBy] || '') ? 1 : -1;
        }
        return (a[sortBy] || '') > (b[sortBy] || '') ? 1 : -1;
      });

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        total: filtered.length,
        data: filtered
      });
    }

    try {
      let query = `
        SELECT s.*, 
               COUNT(po.id) AS total_orders,
               COALESCE(SUM(po.total_amount), 0) AS total_spent
        FROM suppliers s
        LEFT JOIN purchase_orders po ON s.id = po.supplier_id
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'all') {
        query += ' AND s.status = ?';
        params.push(status);
      }

      if (search.trim()) {
        query += ` AND (
          s.company_name LIKE ? OR 
          s.contact_person LIKE ? OR 
          s.email LIKE ? OR 
          s.phone LIKE ? OR 
          s.tax_id LIKE ? OR 
          s.city LIKE ?
        )`;
        const searchPattern = `%${search.trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      query += ` GROUP BY s.id ORDER BY s.${sortBy === 'created_at' ? 'created_at' : 'company_name'} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;

      const [rows] = await connection.query(query, params);

      res.status(200).json({
        success: true,
        source: 'mysql',
        total: rows.length,
        data: rows
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/suppliers/:id
 * Retrieve individual supplier details + purchase summary
 */
const getSupplierById = async (req, res, next) => {
  try {
    const supplierId = parseInt(req.params.id, 10);

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const supplier = inMemorySuppliers.find(s => s.id === supplierId);
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      const orders = inMemoryPOs.filter(p => p.supplier_id === supplierId);
      const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: {
          ...supplier,
          total_orders: orders.length,
          total_spent: totalSpent
        }
      });
    }

    try {
      const [rows] = await connection.query(
        `SELECT s.*, 
                COUNT(po.id) AS total_orders,
                COALESCE(SUM(po.total_amount), 0) AS total_spent
         FROM suppliers s
         LEFT JOIN purchase_orders po ON s.id = po.supplier_id
         WHERE s.id = ?
         GROUP BY s.id`,
        [supplierId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      res.status(200).json({
        success: true,
        source: 'mysql',
        data: rows[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/suppliers/:id/purchase-orders
 * View supplier purchase history
 */
const getSupplierPurchaseHistory = async (req, res, next) => {
  try {
    const supplierId = parseInt(req.params.id, 10);

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const orders = inMemoryPOs.filter(p => p.supplier_id === supplierId);
      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        total: orders.length,
        data: orders
      });
    }

    try {
      const [rows] = await connection.query(
        `SELECT po.id, po.po_number, po.order_date, po.expected_delivery_date, 
                po.total_amount, po.status, po.payment_status, po.notes,
                COUNT(poi.id) AS items_count
         FROM purchase_orders po
         LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
         WHERE po.supplier_id = ?
         GROUP BY po.id
         ORDER BY po.order_date DESC`,
        [supplierId]
      );

      res.status(200).json({
        success: true,
        source: 'mysql',
        total: rows.length,
        data: rows
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/suppliers
 * Register a new supplier
 */
const createSupplier = async (req, res, next) => {
  try {
    const {
      company_name,
      contact_person,
      email,
      phone,
      address,
      city = 'Mumbai',
      state = '',
      country = 'India',
      tax_id = null,
      payment_terms = 'net30',
      status = 'active'
    } = req.body;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Check tax_id uniqueness in memory if provided
      if (tax_id) {
        const duplicate = inMemorySuppliers.find(s => s.tax_id && s.tax_id.toUpperCase() === tax_id.toUpperCase());
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'A supplier with this GSTIN / Tax ID is already registered.'
          });
        }
      }

      const newSupplier = {
        id: nextSupplierId++,
        company_name,
        contact_person,
        email,
        phone,
        address,
        city,
        state,
        country,
        tax_id: tax_id ? tax_id.toUpperCase() : null,
        payment_terms,
        rating: 5.00,
        status,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        total_orders: 0,
        total_spent: 0
      };

      inMemorySuppliers.unshift(newSupplier);

      return res.status(201).json({
        success: true,
        source: 'memory_fallback',
        message: 'Supplier created successfully.',
        data: newSupplier
      });
    }

    try {
      const [result] = await connection.query(
        `INSERT INTO suppliers 
         (company_name, contact_person, email, phone, address, city, state, country, tax_id, payment_terms, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company_name, contact_person, email, phone, address, city, state, country, tax_id ? tax_id.toUpperCase() : null, payment_terms, status]
      );

      const [newRow] = await connection.query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);

      res.status(201).json({
        success: true,
        source: 'mysql',
        message: 'Supplier registered successfully in database.',
        data: newRow[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/suppliers/:id
 * Update an existing supplier profile
 */
const updateSupplier = async (req, res, next) => {
  try {
    const supplierId = parseInt(req.params.id, 10);
    const {
      company_name,
      contact_person,
      email,
      phone,
      address,
      city,
      state,
      country = 'India',
      tax_id,
      payment_terms,
      status
    } = req.body;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const index = inMemorySuppliers.findIndex(s => s.id === supplierId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      inMemorySuppliers[index] = {
        ...inMemorySuppliers[index],
        company_name: company_name || inMemorySuppliers[index].company_name,
        contact_person: contact_person || inMemorySuppliers[index].contact_person,
        email: email || inMemorySuppliers[index].email,
        phone: phone || inMemorySuppliers[index].phone,
        address: address || inMemorySuppliers[index].address,
        city: city || inMemorySuppliers[index].city,
        state: state !== undefined ? state : inMemorySuppliers[index].state,
        country: country || inMemorySuppliers[index].country,
        tax_id: tax_id !== undefined ? (tax_id ? tax_id.toUpperCase() : null) : inMemorySuppliers[index].tax_id,
        payment_terms: payment_terms || inMemorySuppliers[index].payment_terms,
        status: status || inMemorySuppliers[index].status,
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        message: 'Supplier updated successfully.',
        data: inMemorySuppliers[index]
      });
    }

    try {
      // Check if supplier exists
      const [existing] = await connection.query('SELECT id FROM suppliers WHERE id = ?', [supplierId]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      await connection.query(
        `UPDATE suppliers SET 
          company_name = ?, contact_person = ?, email = ?, phone = ?, 
          address = ?, city = ?, state = ?, country = ?, 
          tax_id = ?, payment_terms = ?, status = ?
         WHERE id = ?`,
        [
          company_name, contact_person, email, phone, 
          address, city, state, country, 
          tax_id ? tax_id.toUpperCase() : null, payment_terms, status, 
          supplierId
        ]
      );

      const [updatedRow] = await connection.query('SELECT * FROM suppliers WHERE id = ?', [supplierId]);

      res.status(200).json({
        success: true,
        source: 'mysql',
        message: 'Supplier updated successfully in database.',
        data: updatedRow[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/suppliers/:id
 * Delete or soft-deactivate supplier. Enforces referential integrity!
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const supplierId = parseInt(req.params.id, 10);
    const { action = 'delete' } = req.query; // 'delete' or 'deactivate'

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const index = inMemorySuppliers.findIndex(s => s.id === supplierId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      // Check for existing POs
      const linkedOrders = inMemoryPOs.filter(p => p.supplier_id === supplierId);

      if (action === 'deactivate') {
        inMemorySuppliers[index].status = 'inactive';
        return res.status(200).json({
          success: true,
          message: 'Supplier marked as inactive successfully.',
          data: inMemorySuppliers[index]
        });
      }

      if (linkedOrders.length > 0) {
        return res.status(400).json({
          success: false,
          hasLinkedRecords: true,
          linkedOrdersCount: linkedOrders.length,
          message: `Cannot delete supplier. ${linkedOrders.length} purchase order(s) are linked to this supplier. You can deactivate them instead.`
        });
      }

      inMemorySuppliers.splice(index, 1);
      return res.status(200).json({
        success: true,
        message: 'Supplier deleted successfully.'
      });
    }

    try {
      // 1. Check for purchase transactions referencing this supplier
      const [[{ order_count }]] = await connection.query(
        'SELECT COUNT(*) AS order_count FROM purchase_orders WHERE supplier_id = ?',
        [supplierId]
      );

      if (action === 'deactivate') {
        await connection.query("UPDATE suppliers SET status = 'inactive' WHERE id = ?", [supplierId]);
        return res.status(200).json({
          success: true,
          message: 'Supplier marked as inactive.'
        });
      }

      if (order_count > 0) {
        return res.status(400).json({
          success: false,
          hasLinkedRecords: true,
          linkedOrdersCount: order_count,
          message: `Cannot permanently delete. ${order_count} purchase order(s) are tied to this supplier to preserve financial audit trail. Deactivate them instead.`
        });
      }

      // 2. Perform deletion if safe
      const [result] = await connection.query('DELETE FROM suppliers WHERE id = ?', [supplierId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Supplier not found.' });
      }

      res.status(200).json({
        success: true,
        message: 'Supplier permanently deleted from database.'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  getSupplierPurchaseHistory,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  inMemorySuppliers
};

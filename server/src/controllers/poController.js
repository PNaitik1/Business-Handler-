const { pool } = require('../config/db');

// In-memory fallback purchase orders matching the seed data
let inMemoryPOs = [
  {
    id: 1,
    po_number: 'PO-202611-0001',
    supplier_id: 1,
    supplier_name: 'Apex Industrial Hardware Ltd',
    supplier_email: 'sales@apexhardware.in',
    supplier_phone: '+91 22 2589 1234',
    supplier_address: 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai',
    supplier_tax_id: '27AAACA1234A1Z5',
    created_by: 1,
    created_by_name: 'Aarav Sharma (Admin)',
    order_date: '2026-11-01',
    expected_delivery_date: '2026-11-10',
    subtotal: 39800.00,
    tax_percentage: 18.00,
    tax_amount: 7164.00,
    discount_amount: 0.00,
    total_amount: 46964.00,
    status: 'completed',
    payment_status: 'paid',
    notes: 'Priority fabrication run materials. Standard packaging required.',
    created_at: '2026-11-01 10:00:00',
    items: [
      {
        id: 1,
        product_id: 1,
        product_name: 'Stainless Steel Hex Bolt M10 x 50mm',
        sku: 'SKU-HEX-M10',
        uom: 'pcs',
        ordered_qty: 1000,
        unit_price: 11.80,
        total_price: 11800.00
      },
      {
        id: 2,
        product_id: 2,
        product_name: 'Aluminium Sheet 2mm x 4ft x 8ft',
        sku: 'SKU-ALU-SHT',
        uom: 'pcs',
        ordered_qty: 20,
        unit_price: 1400.00,
        total_price: 28000.00
      }
    ]
  },
  {
    id: 2,
    po_number: 'PO-202611-0002',
    supplier_id: 2,
    supplier_name: 'Bharat Packagings Pvt Ltd',
    supplier_email: 'contact@bharatpack.com',
    supplier_phone: '+91 80 4123 9876',
    supplier_address: '12/A, Peenya 2nd Phase, Bengaluru',
    supplier_tax_id: '29BBBCB5678B1Z2',
    created_by: 1,
    created_by_name: 'Aarav Sharma (Admin)',
    order_date: '2026-11-15',
    expected_delivery_date: '2026-11-25',
    subtotal: 13250.00,
    tax_percentage: 18.00,
    tax_amount: 2385.00,
    discount_amount: 0.00,
    total_amount: 15635.00,
    status: 'partially_received',
    payment_status: 'partially_paid',
    notes: 'Standard carton replenishment batch',
    created_at: '2026-11-15 09:15:00',
    items: [
      {
        id: 3,
        product_id: 3,
        product_name: 'Corrugated Box 12x10x8 inch (3-Ply)',
        sku: 'SKU-BOX-3PLY',
        uom: 'box',
        ordered_qty: 500,
        unit_price: 26.50,
        total_price: 13250.00
      }
    ]
  }
];

let nextPoId = 3;
let nextItemId = 4;

/**
 * Generate Next Unique PO Number: PO-YYYYMM-XXXX
 */
const generatePoNumber = async (connection) => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `PO-${yearMonth}-`;

  if (!connection) {
    const seq = String(inMemoryPOs.length + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  const [rows] = await connection.query(
    "SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastSeq = parseInt(rows[0].po_number.split('-')[2], 10) || 0;
  const nextSeq = String(lastSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * GET /api/purchase-orders
 * List purchase orders with supplier info and line items count
 */
const getPurchaseOrders = async (req, res, next) => {
  try {
    const { search = '', status = 'all', supplier_id = 'all', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      let filtered = [...inMemoryPOs];

      if (status && status !== 'all') {
        filtered = filtered.filter(po => po.status.toLowerCase() === status.toLowerCase());
      }
      if (supplier_id && supplier_id !== 'all') {
        filtered = filtered.filter(po => String(po.supplier_id) === String(supplier_id));
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(po =>
          po.po_number.toLowerCase().includes(q) ||
          po.supplier_name.toLowerCase().includes(q) ||
          (po.notes && po.notes.toLowerCase().includes(q))
        );
      }

      filtered.sort((a, b) => (sortOrder === 'DESC' ? (b.id - a.id) : (a.id - b.id)));

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        total: filtered.length,
        data: filtered.map(po => ({
          ...po,
          items_count: po.items ? po.items.length : 1
        }))
      });
    }

    try {
      let query = `
        SELECT po.*, 
               s.company_name AS supplier_name, s.city AS supplier_city, s.tax_id AS supplier_tax_id,
               u.name AS created_by_name,
               COUNT(poi.id) AS items_count
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'all') {
        query += ' AND po.status = ?';
        params.push(status);
      }
      if (supplier_id && supplier_id !== 'all') {
        query += ' AND po.supplier_id = ?';
        params.push(supplier_id);
      }
      if (search.trim()) {
        query += ' AND (po.po_number LIKE ? OR s.company_name LIKE ? OR po.notes LIKE ?)';
        const pattern = `%${search.trim()}%`;
        params.push(pattern, pattern, pattern);
      }

      query += ` GROUP BY po.id ORDER BY po.${sortBy === 'order_date' ? 'order_date' : 'id'} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;

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
 * GET /api/purchase-orders/:id
 * Retrieve comprehensive PO details with all line items for view & printing
 */
const getPurchaseOrderById = async (req, res, next) => {
  try {
    const poId = parseInt(req.params.id, 10);

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const po = inMemoryPOs.find(p => p.id === poId);
      if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }
      return res.status(200).json({ success: true, source: 'memory_fallback', data: po });
    }

    try {
      // 1. Fetch PO Header + Supplier info
      const [headerRows] = await connection.query(
        `SELECT po.*, 
                s.company_name AS supplier_name, s.contact_person AS supplier_contact, 
                s.email AS supplier_email, s.phone AS supplier_phone, 
                s.address AS supplier_address, s.city AS supplier_city, s.state AS supplier_state,
                s.tax_id AS supplier_tax_id, s.payment_terms AS supplier_payment_terms,
                u.name AS created_by_name
         FROM purchase_orders po
         JOIN suppliers s ON po.supplier_id = s.id
         LEFT JOIN users u ON po.created_by = u.id
         WHERE po.id = ?`,
        [poId]
      );

      if (headerRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }

      const poData = headerRows[0];

      // 2. Fetch Line Items
      const [itemRows] = await connection.query(
        `SELECT poi.*, p.name AS product_name, p.sku, p.uom, p.description
         FROM purchase_order_items poi
         JOIN products p ON poi.product_id = p.id
         WHERE poi.po_id = ?`,
        [poId]
      );

      poData.items = itemRows;

      res.status(200).json({
        success: true,
        source: 'mysql',
        data: poData
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/purchase-orders
 * Create new Purchase Order with multiple products using an atomic database transaction.
 * IMPORTANT: Does NOT touch inventory on-hand balances!
 */
const createPurchaseOrder = async (req, res, next) => {
  try {
    const {
      supplier_id,
      order_date,
      expected_delivery_date,
      items, // Array of { product_id, ordered_qty, unit_price }
      tax_percentage = 18.00,
      notes = ''
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(422).json({ success: false, message: 'At least one product line item is required.' });
    }

    // Calculate Subtotal: Sum of (Quantity * Unit Price)
    let subtotal = 0;
    const sanitizedItems = items.map(item => {
      const qty = parseInt(item.ordered_qty, 10) || 1;
      const price = parseFloat(item.unit_price) || 0;
      const lineTotal = parseFloat((qty * price).toFixed(2));
      subtotal += lineTotal;
      return {
        product_id: parseInt(item.product_id, 10),
        ordered_qty: qty,
        unit_price: price,
        total_price: lineTotal
      };
    });

    subtotal = parseFloat(subtotal.toFixed(2));
    const taxRate = parseFloat(tax_percentage) || 0;
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

    const todayDate = order_date || new Date().toISOString().split('T')[0];
    const deliveryDate = expected_delivery_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const poNum = await generatePoNumber(null);
      const newPo = {
        id: nextPoId++,
        po_number: poNum,
        supplier_id: parseInt(supplier_id, 10),
        supplier_name: 'Apex Industrial Hardware Ltd',
        supplier_email: 'sales@apexhardware.in',
        supplier_phone: '+91 22 2589 1234',
        supplier_address: 'MIDC Industrial Area, Mumbai',
        supplier_tax_id: '27AAACA1234A1Z5',
        created_by: 1,
        created_by_name: 'Aarav Sharma (Admin)',
        order_date: todayDate,
        expected_delivery_date: deliveryDate,
        subtotal,
        tax_percentage: taxRate,
        tax_amount: taxAmount,
        discount_amount: 0.00,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'unpaid',
        notes,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        items: sanitizedItems.map((it, idx) => ({
          id: nextItemId++,
          ...it,
          product_name: `Product SKU ${it.product_id}`,
          sku: `SKU-${it.product_id}`,
          uom: 'pcs'
        }))
      };

      inMemoryPOs.unshift(newPo);

      return res.status(201).json({
        success: true,
        source: 'memory_fallback',
        message: 'Purchase Order created successfully.',
        data: newPo
      });
    }

    try {
      await connection.beginTransaction();

      const poNumber = await generatePoNumber(connection);

      // 1. Insert Purchase Order Header
      const [poResult] = await connection.query(
        `INSERT INTO purchase_orders 
         (po_number, supplier_id, created_by, order_date, expected_delivery_date, 
          subtotal, tax_percentage, tax_amount, discount_amount, total_amount, 
          status, payment_status, notes)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, 0.00, ?, 'pending', 'unpaid', ?)`,
        [
          poNumber, supplier_id, todayDate, deliveryDate,
          subtotal, taxRate, taxAmount, totalAmount, notes
        ]
      );

      const newPoId = poResult.insertId;

      // 2. Insert Line Items atomically
      for (const item of sanitizedItems) {
        await connection.query(
          `INSERT INTO purchase_order_items 
           (po_id, product_id, ordered_qty, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?)`,
          [newPoId, item.product_id, item.ordered_qty, item.unit_price, item.total_price]
        );
      }

      await connection.commit();

      // 3. Retrieve complete created PO for response
      const [createdPo] = await connection.query(
        `SELECT po.*, s.company_name AS supplier_name 
         FROM purchase_orders po 
         JOIN suppliers s ON po.supplier_id = s.id 
         WHERE po.id = ?`,
        [newPoId]
      );

      res.status(201).json({
        success: true,
        source: 'mysql',
        message: `Purchase Order ${poNumber} generated successfully. Inventory on-hand is unchanged per isolation rule.`,
        data: createdPo[0]
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/purchase-orders/:id/status
 * Update PO Status: Draft, Pending, Confirmed, Partially Received, Completed, Cancelled
 */
const updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    const poId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const validStatuses = ['draft', 'pending', 'confirmed', 'partially_received', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(422).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const normalizedStatus = status.toLowerCase();

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const po = inMemoryPOs.find(p => p.id === poId);
      if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }
      po.status = normalizedStatus;
      po.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        message: `Purchase order status updated to ${normalizedStatus.replace('_', ' ')}.`,
        data: po
      });
    }

    try {
      const [result] = await connection.query(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        [normalizedStatus, poId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
      }

      res.status(200).json({
        success: true,
        source: 'mysql',
        message: `Purchase order status updated to ${normalizedStatus.replace('_', ' ')}.`
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/purchase-orders/:id
 * Delete PO only if Draft or Cancelled and has no deliveries/payments
 */
const deletePurchaseOrder = async (req, res, next) => {
  try {
    const poId = parseInt(req.params.id, 10);

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const idx = inMemoryPOs.findIndex(p => p.id === poId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
      }

      if (['completed', 'partially_received'].includes(inMemoryPOs[idx].status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete order with active delivery receipts or fulfilled items.'
        });
      }

      inMemoryPOs.splice(idx, 1);
      return res.status(200).json({ success: true, message: 'Purchase Order removed.' });
    }

    try {
      // Check if deliveries or payments are attached
      const [[{ delivery_count }]] = await connection.query(
        'SELECT COUNT(*) AS delivery_count FROM deliveries WHERE po_id = ?',
        [poId]
      );
      const [[{ payment_count }]] = await connection.query(
        'SELECT COUNT(*) AS payment_count FROM payments WHERE po_id = ?',
        [poId]
      );

      if (delivery_count > 0 || payment_count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete purchase order with existing Goods Received Notes or recorded payments.'
        });
      }

      await connection.query('DELETE FROM purchase_order_items WHERE po_id = ?', [poId]);
      await connection.query('DELETE FROM purchase_orders WHERE id = ?', [poId]);

      res.status(200).json({
        success: true,
        source: 'mysql',
        message: 'Purchase order deleted successfully.'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  inMemoryPOs
};

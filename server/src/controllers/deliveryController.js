const { pool } = require('../config/db');
const { inMemoryProducts } = require('./productController');
const { inMemoryPOs } = require('./poController');
const { inMemoryTransactions } = require('./inventoryController');

// In-memory fallback deliveries matching project seed data
let inMemoryDeliveries = [
  {
    id: 1,
    delivery_number: 'GRN-202611-0001',
    po_id: 1,
    po_number: 'PO-202611-0001',
    supplier_id: 1,
    supplier_name: 'Apex Industrial Hardware Ltd',
    received_by: 3,
    received_by_name: 'Rohan Verma (Store)',
    delivery_date: '2026-11-08',
    delivery_challan_number: 'CH-APX-9821',
    vehicle_number: 'MH-02-CB-1290',
    status: 'completed',
    inspection_remarks: 'All items verified against physical specifications. 0 rejections.',
    created_at: '2026-11-08 10:15:00',
    items: [
      {
        id: 1,
        delivery_id: 1,
        po_item_id: 1,
        product_id: 1,
        product_name: 'Stainless Steel Hex Bolt M10 x 50mm',
        sku: 'SKU-HEX-M10',
        uom: 'pcs',
        ordered_qty: 1000,
        received_qty: 1000,
        accepted_qty: 1000,
        rejected_qty: 0,
        damaged_qty: 0,
        missing_qty: 0,
        rejection_reason: null
      },
      {
        id: 2,
        delivery_id: 1,
        po_item_id: 2,
        product_id: 2,
        product_name: 'Aluminium Sheet 2mm x 4ft x 8ft',
        sku: 'SKU-ALU-SHT',
        uom: 'pcs',
        ordered_qty: 20,
        received_qty: 20,
        accepted_qty: 20,
        rejected_qty: 0,
        damaged_qty: 0,
        missing_qty: 0,
        rejection_reason: null
      }
    ]
  },
  {
    id: 2,
    delivery_number: 'GRN-202611-0002',
    po_id: 2,
    po_number: 'PO-202611-0002',
    supplier_id: 2,
    supplier_name: 'Bharat Packagings Pvt Ltd',
    received_by: 3,
    received_by_name: 'Rohan Verma (Store)',
    delivery_date: '2026-11-18',
    delivery_challan_number: 'CH-BPK-4401',
    vehicle_number: 'KA-05-MN-4491',
    status: 'partial',
    inspection_remarks: '20 corrugated boxes arrived wet/punctured; rejected on delivery.',
    created_at: '2026-11-18 11:30:00',
    items: [
      {
        id: 3,
        delivery_id: 2,
        po_item_id: 3,
        product_id: 3,
        product_name: 'Corrugated Box 12x10x8 inch (3-Ply)',
        sku: 'SKU-BOX-3PLY',
        uom: 'box',
        ordered_qty: 500,
        received_qty: 300,
        accepted_qty: 280,
        rejected_qty: 20,
        damaged_qty: 20,
        missing_qty: 0,
        rejection_reason: 'Water damaged packaging corners during transit'
      }
    ]
  }
];

let nextDeliveryId = 3;
let nextDeliveryItemId = 4;

/**
 * Helper: Generate sequential GRN Number (GRN-YYYYMM-XXXX)
 */
const generateGrnNumber = async (connection) => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `GRN-${yearMonth}-`;

  if (!connection) {
    const seq = String(inMemoryDeliveries.length + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  const [rows] = await connection.query(
    'SELECT delivery_number FROM deliveries WHERE delivery_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastSeq = parseInt(rows[0].delivery_number.split('-')[2], 10);
  const nextSeq = String(lastSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * GET /api/deliveries
 * List all Goods Received Notes (GRN) with search, filter, and pagination
 */
const getDeliveries = async (req, res, next) => {
  try {
    const { search = '', status = 'all', po_id } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      let filtered = [...inMemoryDeliveries];

      if (po_id) {
        filtered = filtered.filter(d => d.po_id === parseInt(po_id, 10));
      }

      if (status && status !== 'all') {
        filtered = filtered.filter(d => d.status.toLowerCase() === status.toLowerCase());
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(d =>
          d.delivery_number.toLowerCase().includes(q) ||
          d.po_number.toLowerCase().includes(q) ||
          d.delivery_challan_number.toLowerCase().includes(q) ||
          d.supplier_name.toLowerCase().includes(q) ||
          (d.vehicle_number && d.vehicle_number.toLowerCase().includes(q))
        );
      }

      // Add summarized item statistics
      const data = filtered.map(d => {
        const total_received = d.items.reduce((sum, i) => sum + i.received_qty, 0);
        const total_accepted = d.items.reduce((sum, i) => sum + i.accepted_qty, 0);
        const total_rejected = d.items.reduce((sum, i) => sum + i.rejected_qty, 0);
        return {
          ...d,
          total_received,
          total_accepted,
          total_rejected,
          item_count: d.items.length
        };
      });

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        count: data.length,
        data
      });
    }

    try {
      let sql = `
        SELECT 
          d.id,
          d.delivery_number,
          d.po_id,
          po.po_number,
          po.supplier_id,
          s.name AS supplier_name,
          d.received_by,
          u.name AS received_by_name,
          d.delivery_date,
          d.delivery_challan_number,
          d.vehicle_number,
          d.status,
          d.inspection_remarks,
          d.created_at,
          COUNT(di.id) AS item_count,
          COALESCE(SUM(di.received_qty), 0) AS total_received,
          COALESCE(SUM(di.accepted_qty), 0) AS total_accepted,
          COALESCE(SUM(di.rejected_qty), 0) AS total_rejected
        FROM deliveries d
        JOIN purchase_orders po ON d.po_id = po.id
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN users u ON d.received_by = u.id
        LEFT JOIN delivery_items di ON d.id = di.delivery_id
        WHERE 1=1
      `;
      const params = [];

      if (po_id) {
        sql += ' AND d.po_id = ?';
        params.push(po_id);
      }

      if (status && status !== 'all') {
        sql += ' AND d.status = ?';
        params.push(status);
      }

      if (search.trim()) {
        sql += ` AND (
          d.delivery_number LIKE ? OR 
          po.po_number LIKE ? OR 
          d.delivery_challan_number LIKE ? OR 
          s.name LIKE ? OR 
          d.vehicle_number LIKE ?
        )`;
        const q = `%${search.trim()}%`;
        params.push(q, q, q, q, q);
      }

      sql += ' GROUP BY d.id ORDER BY d.id DESC';

      const [deliveries] = await connection.query(sql, params);

      res.status(200).json({
        success: true,
        source: 'mysql',
        count: deliveries.length,
        data: deliveries
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/deliveries/:id
 * Retrieve single Goods Received Note with complete itemized breakdown
 */
const getDeliveryById = async (req, res, next) => {
  try {
    const deliveryId = parseInt(req.params.id, 10);
    if (isNaN(deliveryId)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID.' });
    }

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const delivery = inMemoryDeliveries.find(d => d.id === deliveryId);
      if (!delivery) {
        return res.status(404).json({ success: false, message: 'Goods Received Note not found.' });
      }
      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: delivery
      });
    }

    try {
      const [deliveries] = await connection.query(
        `SELECT 
          d.id,
          d.delivery_number,
          d.po_id,
          po.po_number,
          po.order_date,
          po.total_amount AS po_total_amount,
          po.status AS po_status,
          po.supplier_id,
          s.name AS supplier_name,
          s.contact_person AS supplier_contact_person,
          s.email AS supplier_email,
          s.phone AS supplier_phone,
          s.address AS supplier_address,
          s.tax_id AS supplier_tax_id,
          d.received_by,
          u.name AS received_by_name,
          d.delivery_date,
          d.delivery_challan_number,
          d.vehicle_number,
          d.status,
          d.inspection_remarks,
          d.created_at
        FROM deliveries d
        JOIN purchase_orders po ON d.po_id = po.id
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN users u ON d.received_by = u.id
        WHERE d.id = ?`,
        [deliveryId]
      );

      if (deliveries.length === 0) {
        return res.status(404).json({ success: false, message: 'Goods Received Note not found.' });
      }

      const [items] = await connection.query(
        `SELECT 
          di.id,
          di.delivery_id,
          di.po_item_id,
          di.product_id,
          p.name AS product_name,
          p.sku,
          p.uom,
          poi.ordered_qty,
          di.received_qty,
          di.accepted_qty,
          di.rejected_qty,
          di.rejection_reason
        FROM delivery_items di
        JOIN products p ON di.product_id = p.id
        JOIN purchase_order_items poi ON di.po_item_id = poi.id
        WHERE di.delivery_id = ?
        ORDER BY di.id ASC`,
        [deliveryId]
      );

      const delivery = {
        ...deliveries[0],
        items: items.map(item => ({
          ...item,
          // Extract damaged and missing quantities if recorded in reason or default to rejected_qty
          damaged_qty: item.rejected_qty,
          missing_qty: 0
        }))
      };

      res.status(200).json({
        success: true,
        source: 'mysql',
        data: delivery
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/deliveries/receivable-pos
 * Fetches purchase orders eligible for goods receipt (pending, confirmed, partially_received)
 * with line items and remaining quantities to receive.
 */
const getReceivablePOs = async (req, res, next) => {
  try {
    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Memory fallback: filter POs eligible for receipt
      const eligiblePOs = inMemoryPOs
        .filter(po => ['pending', 'confirmed', 'partially_received'].includes(po.status.toLowerCase()))
        .map(po => {
          // Compute already accepted quantities per line item
          const itemsWithRemaining = po.items.map(item => {
            let alreadyAccepted = 0;
            inMemoryDeliveries
              .filter(d => d.po_id === po.id)
              .forEach(d => {
                const match = d.items.find(di => di.po_item_id === item.id || di.product_id === item.product_id);
                if (match) {
                  alreadyAccepted += match.accepted_qty;
                }
              });

            const remaining_qty = Math.max(0, item.ordered_qty - alreadyAccepted);
            return {
              ...item,
              po_item_id: item.id,
              already_accepted_qty: alreadyAccepted,
              remaining_qty
            };
          });

          // Check if any items remain to receive
          const totalRemaining = itemsWithRemaining.reduce((sum, i) => sum + i.remaining_qty, 0);

          return {
            id: po.id,
            po_number: po.po_number,
            supplier_id: po.supplier_id,
            supplier_name: po.supplier_name,
            order_date: po.order_date,
            expected_delivery_date: po.expected_delivery_date,
            status: po.status,
            total_amount: po.total_amount,
            total_remaining_qty: totalRemaining,
            items: itemsWithRemaining
          };
        })
        .filter(po => po.total_remaining_qty > 0 || po.status !== 'completed');

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: eligiblePOs
      });
    }

    try {
      // MySQL query
      const [pos] = await connection.query(`
        SELECT 
          po.id,
          po.po_number,
          po.supplier_id,
          s.name AS supplier_name,
          po.order_date,
          po.expected_delivery_date,
          po.status,
          po.total_amount
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.status IN ('pending', 'confirmed', 'partially_received')
        ORDER BY po.id DESC
      `);

      const result = [];
      for (const po of pos) {
        const [items] = await connection.query(`
          SELECT 
            poi.id AS po_item_id,
            poi.product_id,
            p.name AS product_name,
            p.sku,
            p.uom,
            poi.ordered_qty,
            poi.unit_price,
            COALESCE(SUM(di.accepted_qty), 0) AS already_accepted_qty
          FROM purchase_order_items poi
          JOIN products p ON poi.product_id = p.id
          LEFT JOIN delivery_items di ON poi.id = di.po_item_id
          WHERE poi.purchase_order_id = ?
          GROUP BY poi.id
        `, [po.id]);

        const itemsWithRemaining = items.map(item => {
          const remaining_qty = Math.max(0, item.ordered_qty - item.already_accepted_qty);
          return {
            ...item,
            remaining_qty
          };
        });

        const totalRemaining = itemsWithRemaining.reduce((sum, i) => sum + i.remaining_qty, 0);

        if (totalRemaining > 0 || po.status !== 'completed') {
          result.push({
            ...po,
            total_remaining_qty: totalRemaining,
            items: itemsWithRemaining
          });
        }
      }

      res.status(200).json({
        success: true,
        source: 'mysql',
        data: result
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/deliveries
 * Record a new Goods Received Note (GRN) with QA Inspection & Atomic Inventory updates
 *
 * Request Body:
 * {
 *   po_id: 1,
 *   delivery_challan_number: "CH-12345",
 *   vehicle_number: "MH-01-AB-1234",
 *   delivery_date: "2026-11-25",
 *   inspection_remarks: "Visual check completed",
 *   allow_overdelivery: false,
 *   items: [
 *     {
 *       po_item_id: 1,
 *       product_id: 1,
 *       received_qty: 100,
 *       damaged_qty: 5,
 *       missing_qty: 2,
 *       rejection_reason: "Damaged packaging on 5 pcs"
 *     }
 *   ]
 * }
 */
const recordDelivery = async (req, res, next) => {
  try {
    const {
      po_id,
      delivery_challan_number,
      vehicle_number = '',
      delivery_date,
      inspection_remarks = '',
      allow_overdelivery = false,
      items
    } = req.body;

    // 1. Validation
    if (!po_id) {
      return res.status(400).json({ success: false, message: 'Purchase Order ID is required.' });
    }
    if (!delivery_challan_number || !delivery_challan_number.trim()) {
      return res.status(400).json({ success: false, message: 'Delivery Challan / DC Number is mandatory.' });
    }
    if (!delivery_date) {
      return res.status(400).json({ success: false, message: 'Delivery receipt date is required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item must be received.' });
    }

    // Process line items & validate quantities
    let totalReceived = 0;
    let totalAccepted = 0;
    let totalRejected = 0;

    const validatedItems = items.map(item => {
      const received_qty = Math.max(0, parseInt(item.received_qty, 10) || 0);
      const damaged_qty = Math.max(0, parseInt(item.damaged_qty, 10) || 0);
      const missing_qty = Math.max(0, parseInt(item.missing_qty, 10) || 0);
      const rejected_qty = damaged_qty + missing_qty;

      if (rejected_qty > received_qty) {
        throw new Error(`Total rejected count (${rejected_qty}) cannot exceed received quantity (${received_qty}) for product #${item.product_id}.`);
      }

      const accepted_qty = received_qty - rejected_qty;

      totalReceived += received_qty;
      totalAccepted += accepted_qty;
      totalRejected += rejected_qty;

      let reason = item.rejection_reason || '';
      if (rejected_qty > 0 && !reason) {
        reason = `Damaged: ${damaged_qty}, Missing: ${missing_qty}`;
      }

      return {
        po_item_id: parseInt(item.po_item_id, 10),
        product_id: parseInt(item.product_id, 10),
        received_qty,
        damaged_qty,
        missing_qty,
        rejected_qty,
        accepted_qty,
        rejection_reason: reason || null
      };
    });

    if (totalReceived === 0) {
      return res.status(400).json({
        success: false,
        message: 'Total received quantity across all items must be greater than zero.'
      });
    }

    const receivedByUserId = req.user?.id || 1;
    const receivedByUserName = req.user?.name || 'Aarav Sharma (Admin)';

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Memory fallback execution
      const targetPO = inMemoryPOs.find(p => p.id === parseInt(po_id, 10));
      if (!targetPO) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
      }

      if (['completed', 'cancelled'].includes(targetPO.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot record delivery for PO with status "${targetPO.status}".`
        });
      }

      // Check remaining quantities
      for (const vItem of validatedItems) {
        const poItem = targetPO.items.find(i => i.id === vItem.po_item_id || i.product_id === vItem.product_id);
        if (!poItem) {
          return res.status(400).json({
            success: false,
            message: `Product #${vItem.product_id} does not belong to Purchase Order #${targetPO.po_number}.`
          });
        }

        // Calculate already accepted
        let priorAccepted = 0;
        inMemoryDeliveries
          .filter(d => d.po_id === targetPO.id)
          .forEach(d => {
            const match = d.items.find(di => di.po_item_id === poItem.id || di.product_id === vItem.product_id);
            if (match) priorAccepted += match.accepted_qty;
          });

        const remaining = Math.max(0, poItem.ordered_qty - priorAccepted);
        if (!allow_overdelivery && vItem.received_qty > remaining) {
          return res.status(400).json({
            success: false,
            message: `Received quantity (${vItem.received_qty}) exceeds remaining ordered quantity (${remaining}) for product #${vItem.product_id}. Over-delivery must be explicitly approved.`
          });
        }
      }

      // Generate GRN Number
      const delivery_number = await generateGrnNumber(null);
      const deliveryId = nextDeliveryId++;

      // Overall delivery status: 'rejected' | 'completed' | 'partial'
      let deliveryStatus = 'partial';
      if (totalAccepted === 0 && totalRejected > 0) {
        deliveryStatus = 'rejected';
      }

      // Build delivery items
      const createdItems = validatedItems.map(vi => {
        const prod = inMemoryProducts.find(p => p.id === vi.product_id);
        const poItem = targetPO.items.find(i => i.id === vi.po_item_id || i.product_id === vi.product_id);

        const diId = nextDeliveryItemId++;

        // CRUCIAL BUSINESS RULE: Update stock ONLY for accepted_qty
        if (vi.accepted_qty > 0 && prod) {
          prod.current_stock += vi.accepted_qty;

          // Record in inventory transaction ledger
          inMemoryTransactions.unshift({
            id: inMemoryTransactions.length + 1,
            product_id: prod.id,
            product_name: prod.name,
            sku: prod.sku,
            delivery_item_id: diId,
            delivery_number,
            transaction_type: 'PURCHASE_RECEIPT',
            quantity: vi.accepted_qty,
            balance_after: prod.current_stock,
            performed_by_name: receivedByUserName,
            transaction_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
            remarks: `Inward GRN #${delivery_number} for PO #${targetPO.po_number} (Accepted: ${vi.accepted_qty}, Rejected: ${vi.rejected_qty})`
          });
        }

        return {
          id: diId,
          delivery_id: deliveryId,
          po_item_id: vi.po_item_id,
          product_id: vi.product_id,
          product_name: prod ? prod.name : 'Unknown Product',
          sku: prod ? prod.sku : 'N/A',
          uom: prod ? prod.uom : 'pcs',
          ordered_qty: poItem ? poItem.ordered_qty : 0,
          received_qty: vi.received_qty,
          accepted_qty: vi.accepted_qty,
          rejected_qty: vi.rejected_qty,
          damaged_qty: vi.damaged_qty,
          missing_qty: vi.missing_qty,
          rejection_reason: vi.rejection_reason
        };
      });

      const newDelivery = {
        id: deliveryId,
        delivery_number,
        po_id: targetPO.id,
        po_number: targetPO.po_number,
        supplier_id: targetPO.supplier_id,
        supplier_name: targetPO.supplier_name,
        received_by: receivedByUserId,
        received_by_name: receivedByUserName,
        delivery_date,
        delivery_challan_number: delivery_challan_number.trim(),
        vehicle_number: vehicle_number.trim() || null,
        status: deliveryStatus,
        inspection_remarks: inspection_remarks.trim() || null,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        items: createdItems
      };

      inMemoryDeliveries.unshift(newDelivery);

      // Check whether ALL items of this PO are now fully received
      let allFulfilled = true;
      targetPO.items.forEach(poItem => {
        let totalAcceptedForThisItem = 0;
        inMemoryDeliveries
          .filter(d => d.po_id === targetPO.id)
          .forEach(d => {
            const di = d.items.find(item => item.po_item_id === poItem.id || item.product_id === poItem.product_id);
            if (di) totalAcceptedForThisItem += di.accepted_qty;
          });

        if (totalAcceptedForThisItem < poItem.ordered_qty) {
          allFulfilled = false;
        }
      });

      if (allFulfilled) {
        targetPO.status = 'completed';
        newDelivery.status = 'completed';
      } else if (totalAccepted > 0) {
        targetPO.status = 'partially_received';
        newDelivery.status = 'partial';
      }

      return res.status(201).json({
        success: true,
        source: 'memory_fallback',
        message: `Goods Received Note ${delivery_number} recorded successfully. Stock updated for ${totalAccepted} accepted items.`,
        data: {
          delivery: newDelivery,
          po_status: targetPO.status,
          accepted_count: totalAccepted,
          rejected_count: totalRejected
        }
      });
    }

    // MySQL Transactional Execution
    try {
      await connection.beginTransaction();

      // Check PO status
      const [[po]] = await connection.query(
        'SELECT id, po_number, supplier_id, status FROM purchase_orders WHERE id = ? FOR UPDATE',
        [po_id]
      );

      if (!po) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
      }

      if (['completed', 'cancelled'].includes(po.status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot record delivery for PO with status "${po.status}".`
        });
      }

      // Check remaining quantities
      for (const vItem of validatedItems) {
        const [[poi]] = await connection.query(
          `SELECT 
            poi.ordered_qty,
            COALESCE(SUM(di.accepted_qty), 0) AS already_accepted
           FROM purchase_order_items poi
           LEFT JOIN delivery_items di ON poi.id = di.po_item_id
           WHERE poi.id = ? AND poi.purchase_order_id = ?
           GROUP BY poi.id`,
          [vItem.po_item_id, po_id]
        );

        if (!poi) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Purchase order line item #${vItem.po_item_id} does not belong to PO #${po.po_number}.`
          });
        }

        const remaining = Math.max(0, poi.ordered_qty - poi.already_accepted);
        if (!allow_overdelivery && vItem.received_qty > remaining) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Received quantity (${vItem.received_qty}) exceeds remaining ordered quantity (${remaining}) for product #${vItem.product_id}. Over-delivery must be approved.`
          });
        }
      }

      // Generate GRN Number
      const delivery_number = await generateGrnNumber(connection);

      let deliveryStatus = 'partial';
      if (totalAccepted === 0 && totalRejected > 0) {
        deliveryStatus = 'rejected';
      }

      // Insert Deliveries Header
      const [delResult] = await connection.query(
        `INSERT INTO deliveries 
         (delivery_number, po_id, received_by, delivery_date, delivery_challan_number, vehicle_number, status, inspection_remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          delivery_number,
          po_id,
          receivedByUserId,
          delivery_date,
          delivery_challan_number.trim(),
          vehicle_number.trim() || null,
          deliveryStatus,
          inspection_remarks.trim() || null
        ]
      );

      const deliveryId = delResult.insertId;

      // Insert Delivery Items & Update Stock Atomically
      for (const vItem of validatedItems) {
        const [diResult] = await connection.query(
          `INSERT INTO delivery_items 
           (delivery_id, po_item_id, product_id, received_qty, accepted_qty, rejected_qty, rejection_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            deliveryId,
            vItem.po_item_id,
            vItem.product_id,
            vItem.received_qty,
            vItem.accepted_qty,
            vItem.rejected_qty,
            vItem.rejection_reason
          ]
        );

        const deliveryItemId = diResult.insertId;

        // CRUCIAL BUSINESS RULE: Increment stock strictly for accepted items
        if (vItem.accepted_qty > 0) {
          // 1. Increment product current_stock
          await connection.query(
            'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
            [vItem.accepted_qty, vItem.product_id]
          );

          // 2. Fetch current balance
          const [[prod]] = await connection.query(
            'SELECT current_stock, name FROM products WHERE id = ?',
            [vItem.product_id]
          );

          // 3. Insert transaction log
          await connection.query(
            `INSERT INTO inventory_transactions 
             (product_id, delivery_item_id, transaction_type, quantity, balance_after, performed_by, remarks)
             VALUES (?, ?, 'PURCHASE_RECEIPT', ?, ?, ?, ?)`,
            [
              vItem.product_id,
              deliveryItemId,
              vItem.accepted_qty,
              prod.current_stock,
              receivedByUserId,
              `Inward GRN #${delivery_number} for PO #${po.po_number} (Accepted: ${vItem.accepted_qty}, Rejected: ${vItem.rejected_qty})`
            ]
          );
        }
      }

      // Check if PO items are now 100% fulfilled
      const [completionCheck] = await connection.query(
        `SELECT 
          poi.ordered_qty,
          COALESCE(SUM(di.accepted_qty), 0) AS total_accepted
         FROM purchase_order_items poi
         LEFT JOIN delivery_items di ON poi.id = di.po_item_id
         WHERE poi.purchase_order_id = ?
         GROUP BY poi.id`,
        [po_id]
      );

      const isPoComplete = completionCheck.every(row => row.total_accepted >= row.ordered_qty);
      let updatedPoStatus = po.status;

      if (isPoComplete) {
        updatedPoStatus = 'completed';
        await connection.query('UPDATE purchase_orders SET status = ? WHERE id = ?', ['completed', po_id]);
        await connection.query('UPDATE deliveries SET status = ? WHERE id = ?', ['completed', deliveryId]);
      } else if (totalAccepted > 0) {
        updatedPoStatus = 'partially_received';
        await connection.query('UPDATE purchase_orders SET status = ? WHERE id = ?', ['partially_received', po_id]);
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        source: 'mysql',
        message: `Goods Received Note ${delivery_number} recorded successfully. Stock incremented by ${totalAccepted} accepted units.`,
        data: {
          delivery_id: deliveryId,
          delivery_number,
          po_status: updatedPoStatus,
          accepted_count: totalAccepted,
          rejected_count: totalRejected
        }
      });
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeliveries,
  getDeliveryById,
  getReceivablePOs,
  recordDelivery,
  inMemoryDeliveries
};

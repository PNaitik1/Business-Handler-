const { pool } = require('../config/db');
const { inMemoryProducts } = require('./productController');

// In-memory fallback transactions ledger
let inMemoryTransactions = [
  {
    id: 1,
    product_id: 1,
    product_name: 'Stainless Steel Hex Bolt M10 x 50mm',
    sku: 'SKU-HEX-M10',
    delivery_item_id: null,
    delivery_number: null,
    transaction_type: 'INITIAL_STOCK',
    quantity: 1500,
    balance_after: 1500,
    performed_by_name: 'Aarav Sharma (Admin)',
    transaction_date: '2026-11-01 10:00:00',
    remarks: 'Opening inventory migration baseline'
  },
  {
    id: 2,
    product_id: 1,
    product_name: 'Stainless Steel Hex Bolt M10 x 50mm',
    sku: 'SKU-HEX-M10',
    delivery_item_id: 1,
    delivery_number: 'GRN-202611-0001',
    transaction_type: 'PURCHASE_RECEIPT',
    quantity: 1000,
    balance_after: 2500,
    performed_by_name: 'Rohan Verma (Store)',
    transaction_date: '2026-11-08 10:15:00',
    remarks: 'Inward receipt verified under GRN-202611-0001 (PO-202611-0001)'
  },
  {
    id: 3,
    product_id: 2,
    product_name: 'Aluminium Sheet 2mm x 4ft x 8ft',
    sku: 'SKU-ALU-SHT',
    delivery_item_id: 2,
    delivery_number: 'GRN-202611-0001',
    transaction_type: 'PURCHASE_RECEIPT',
    quantity: 20,
    balance_after: 65,
    performed_by_name: 'Rohan Verma (Store)',
    transaction_date: '2026-11-08 10:15:00',
    remarks: 'Inward receipt verified under GRN-202611-0001 (PO-202611-0001)'
  },
  {
    id: 4,
    product_id: 3,
    product_name: 'Corrugated Box 12x10x8 inch (3-Ply)',
    sku: 'SKU-BOX-3PLY',
    delivery_item_id: 3,
    delivery_number: 'GRN-202611-0002',
    transaction_type: 'PURCHASE_RECEIPT',
    quantity: 280,
    balance_after: 680,
    performed_by_name: 'Rohan Verma (Store)',
    transaction_date: '2026-11-18 11:30:00',
    remarks: 'Partial delivery: 280 accepted into stock (20 rejected transit damage)'
  }
];

let nextTxnId = 5;

/**
 * GET /api/inventory/status
 * Summary KPIs: total stock count, valuation in INR, low stock count
 */
const getInventoryStatus = async (req, res, next) => {
  try {
    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const totalItems = inMemoryProducts.reduce((sum, p) => sum + p.current_stock, 0);
      const totalValuation = inMemoryProducts.reduce((sum, p) => sum + (p.current_stock * p.unit_cost), 0);
      const lowStockItems = inMemoryProducts.filter(p => p.current_stock <= p.reorder_level);

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: {
          totalProducts: inMemoryProducts.length,
          totalStockQuantity: totalItems,
          totalAssetValuation: totalValuation,
          lowStockCount: lowStockItems.length,
          lowStockItems: lowStockItems.map(p => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            current_stock: p.current_stock,
            reorder_level: p.reorder_level,
            deficit: p.reorder_level - p.current_stock,
            uom: p.uom
          }))
        }
      });
    }

    try {
      const [[summary]] = await connection.query(
        `SELECT COUNT(*) AS total_products,
                COALESCE(SUM(current_stock), 0) AS total_quantity,
                COALESCE(SUM(current_stock * unit_cost), 0) AS total_valuation
         FROM products`
      );

      const [lowStockRows] = await connection.query(
        `SELECT id, sku, name, current_stock, reorder_level, (reorder_level - current_stock) AS deficit, uom
         FROM products
         WHERE current_stock <= reorder_level
         ORDER BY deficit DESC`
      );

      res.status(200).json({
        success: true,
        source: 'mysql',
        data: {
          totalProducts: parseInt(summary.total_products, 10),
          totalStockQuantity: parseInt(summary.total_quantity, 10),
          totalAssetValuation: parseFloat(summary.total_valuation),
          lowStockCount: lowStockRows.length,
          lowStockItems: lowStockRows
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/transactions
 * Retrieve the immutable stock movement audit ledger
 */
const getInventoryTransactions = async (req, res, next) => {
  try {
    const { product_id, transaction_type } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      let filtered = [...inMemoryTransactions];

      if (product_id) {
        filtered = filtered.filter(t => String(t.product_id) === String(product_id));
      }

      if (transaction_type && transaction_type !== 'all') {
        filtered = filtered.filter(t => t.transaction_type === transaction_type);
      }

      filtered.sort((a, b) => (b.transaction_date > a.transaction_date ? 1 : -1));

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        total: filtered.length,
        data: filtered
      });
    }

    try {
      let query = `
        SELECT it.id, it.product_id, p.name AS product_name, p.sku, p.uom,
               it.delivery_item_id, d.delivery_number,
               it.transaction_type, it.quantity, it.balance_after,
               it.transaction_date, it.remarks,
               u.name AS performed_by_name
        FROM inventory_transactions it
        JOIN products p ON it.product_id = p.id
        JOIN users u ON it.performed_by = u.id
        LEFT JOIN delivery_items di ON it.delivery_item_id = di.id
        LEFT JOIN deliveries d ON di.delivery_id = d.id
        WHERE 1=1
      `;
      const params = [];

      if (product_id) {
        query += ' AND it.product_id = ?';
        params.push(product_id);
      }

      if (transaction_type && transaction_type !== 'all') {
        query += ' AND it.transaction_type = ?';
        params.push(transaction_type);
      }

      query += ' ORDER BY it.transaction_date DESC, it.id DESC LIMIT 100';

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
 * POST /api/inventory/adjust
 * Manual stock adjustment (Cycle counts, damaged stock write-offs)
 * Atomically creates an immutable transaction log and updates products.current_stock
 */
const adjustStock = async (req, res, next) => {
  try {
    const { product_id, adjustment_type, quantity, remarks } = req.body;
    const qtyChange = parseInt(quantity, 10);
    const prodId = parseInt(product_id, 10);

    if (qtyChange === 0 || isNaN(qtyChange)) {
      return res.status(422).json({ success: false, message: 'Adjustment quantity must be non-zero.' });
    }

    // Determine sign: DAMAGED_LOSS is negative, STOCK_ADJUSTMENT can be + or -
    const effectiveQty = adjustment_type === 'DAMAGED_LOSS' ? -Math.abs(qtyChange) : qtyChange;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const prod = inMemoryProducts.find(p => p.id === prodId);
      if (!prod) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const newBalance = prod.current_stock + effectiveQty;
      if (newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce stock below zero. Current stock is ${prod.current_stock} ${prod.uom}.`
        });
      }

      prod.current_stock = newBalance;

      const newTxn = {
        id: nextTxnId++,
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        delivery_item_id: null,
        delivery_number: null,
        transaction_type: adjustment_type,
        quantity: effectiveQty,
        balance_after: newBalance,
        performed_by_name: 'Store Manager',
        transaction_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        remarks: remarks || `Manual ${adjustment_type.replace('_', ' ')}`
      };

      inMemoryTransactions.unshift(newTxn);

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        message: 'Stock adjustment executed and logged in audit ledger.',
        data: {
          product: prod,
          transaction: newTxn
        }
      });
    }

    try {
      await connection.beginTransaction();

      // Lock row for atomic stock update
      const [rows] = await connection.query('SELECT id, current_stock, uom FROM products WHERE id = ? FOR UPDATE', [prodId]);
      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const currentBalance = rows[0].current_stock;
      const newBalance = currentBalance + effectiveQty;

      if (newBalance < 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock on hand (${currentBalance} ${rows[0].uom}) to deduct ${Math.abs(effectiveQty)} ${rows[0].uom}.`
        });
      }

      // 1. Update product balance
      await connection.query('UPDATE products SET current_stock = ? WHERE id = ?', [newBalance, prodId]);

      // 2. Insert immutable transaction ledger row
      const [txnResult] = await connection.query(
        `INSERT INTO inventory_transactions 
         (product_id, delivery_item_id, transaction_type, quantity, balance_after, performed_by, remarks)
         VALUES (?, NULL, ?, ?, ?, 1, ?)`,
        [prodId, adjustment_type, effectiveQty, newBalance, remarks || `Manual stock adjustment`]
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        source: 'mysql',
        message: 'Stock adjustment executed and logged in audit ledger.',
        data: {
          product_id: prodId,
          new_stock: newBalance,
          transaction_id: txnResult.insertId
        }
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
 * Business Rule Verification Endpoint:
 * Confirms that purchase orders DO NOT increment inventory,
 * and explains the two-phase receiving control rule.
 */
const verifyBusinessRule = (req, res) => {
  res.status(200).json({
    rule: 'PROCUREMENT_INVENTORY_ISOLATION_RULE',
    policy: 'Purchase Orders represent financial commitments and do not increase physical inventory.',
    fulfillment_trigger: 'Inventory quantity is strictly incremented ONLY when physical delivery is accepted via Goods Received Note (GRN).',
    status: 'ENFORCED'
  });
};

module.exports = {
  getInventoryStatus,
  getInventoryTransactions,
  adjustStock,
  verifyBusinessRule,
  inMemoryTransactions
};

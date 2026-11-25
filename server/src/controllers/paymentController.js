const { pool } = require('../config/db');
const { inMemoryPOs } = require('./poController');

// In-memory fallback payments matching project seed data
let inMemoryPayments = [
  {
    id: 1,
    payment_reference: 'PAY-202611-0001',
    po_id: 1,
    po_number: 'PO-202611-0001',
    supplier_id: 1,
    supplier_name: 'Apex Industrial Hardware Ltd',
    supplier_email: 'sales@apexhardware.in',
    supplier_phone: '+91 22 2589 1234',
    supplier_tax_id: '27AAACA1234A1Z5',
    processed_by: 4,
    processed_by_name: 'Ananya Iyer (Finance)',
    payment_date: '2026-11-12',
    amount: 46964.00,
    payment_mode: 'bank_transfer',
    transaction_reference: 'HDFCN26315891002',
    payment_status: 'completed',
    notes: 'Full settlement for PO-202611-0001',
    created_at: '2026-11-12 14:30:00'
  },
  {
    id: 2,
    payment_reference: 'PAY-202611-0002',
    po_id: 2,
    po_number: 'PO-202611-0002',
    supplier_id: 2,
    supplier_name: 'Bharat Packagings Pvt Ltd',
    supplier_email: 'contact@bharatpack.com',
    supplier_phone: '+91 80 4123 9876',
    supplier_tax_id: '29BBBCB5678B1Z2',
    processed_by: 4,
    processed_by_name: 'Ananya Iyer (Finance)',
    payment_date: '2026-11-16',
    amount: 7817.50,
    payment_mode: 'upi',
    transaction_reference: 'UPI/20261116/88491038102',
    payment_status: 'completed',
    notes: '50% advance disbursement for PO-202611-0002',
    created_at: '2026-11-16 16:45:00'
  }
];

let nextPaymentId = 3;

/**
 * Generate sequential Payment Voucher Number: PAY-YYYYMM-XXXX
 */
const generatePaymentReference = async (connection) => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `PAY-${yearMonth}-`;

  if (!connection) {
    const seq = String(inMemoryPayments.length + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }

  const [rows] = await connection.query(
    'SELECT payment_reference FROM payments WHERE payment_reference LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}0001`;
  }

  const lastSeq = parseInt(rows[0].payment_reference.split('-')[2], 10);
  const nextSeq = String(lastSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * GET /api/payments
 * Retrieve all payment records with filters for search, payment_mode, and po_id
 */
const getPayments = async (req, res, next) => {
  try {
    const { search = '', payment_mode = 'all', po_id } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      let filtered = [...inMemoryPayments];

      if (po_id) {
        filtered = filtered.filter(p => p.po_id === parseInt(po_id, 10));
      }

      if (payment_mode && payment_mode !== 'all') {
        filtered = filtered.filter(p => p.payment_mode.toLowerCase() === payment_mode.toLowerCase());
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(p =>
          p.payment_reference.toLowerCase().includes(q) ||
          p.po_number.toLowerCase().includes(q) ||
          p.supplier_name.toLowerCase().includes(q) ||
          (p.transaction_reference && p.transaction_reference.toLowerCase().includes(q))
        );
      }

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        count: filtered.length,
        data: filtered
      });
    }

    try {
      let sql = `
        SELECT 
          p.id,
          p.payment_reference,
          p.po_id,
          po.po_number,
          po.total_amount AS po_total_amount,
          p.supplier_id,
          s.name AS supplier_name,
          s.email AS supplier_email,
          s.phone AS supplier_phone,
          s.tax_id AS supplier_tax_id,
          p.processed_by,
          u.name AS processed_by_name,
          p.payment_date,
          p.amount,
          p.payment_mode,
          p.transaction_reference,
          p.payment_status,
          p.notes,
          p.created_at
        FROM payments p
        JOIN purchase_orders po ON p.po_id = po.id
        JOIN suppliers s ON p.supplier_id = s.id
        JOIN users u ON p.processed_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (po_id) {
        sql += ' AND p.po_id = ?';
        params.push(po_id);
      }

      if (payment_mode && payment_mode !== 'all') {
        sql += ' AND p.payment_mode = ?';
        params.push(payment_mode);
      }

      if (search.trim()) {
        sql += ` AND (
          p.payment_reference LIKE ? OR 
          po.po_number LIKE ? OR 
          s.name LIKE ? OR 
          p.transaction_reference LIKE ?
        )`;
        const q = `%${search.trim()}%`;
        params.push(q, q, q, q);
      }

      sql += ' ORDER BY p.id DESC';

      const [payments] = await connection.query(sql, params);

      res.status(200).json({
        success: true,
        source: 'mysql',
        count: payments.length,
        data: payments
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/summary
 * KPI Metrics: Total Procurement Value, Total Paid, Total Outstanding, and counts
 */
const getPaymentSummary = async (req, res, next) => {
  try {
    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Memory fallback aggregation
      const nonCancelledPOs = inMemoryPOs.filter(p => p.status !== 'cancelled');
      const totalProcurementValue = nonCancelledPOs.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      const totalPaid = inMemoryPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalOutstanding = Math.max(0, totalProcurementValue - totalPaid);

      const paidCount = nonCancelledPOs.filter(p => p.payment_status === 'paid').length;
      const partialCount = nonCancelledPOs.filter(p => p.payment_status === 'partially_paid').length;
      const unpaidCount = nonCancelledPOs.filter(p => !p.payment_status || p.payment_status === 'unpaid').length;

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: {
          total_procurement_value: Number(totalProcurementValue.toFixed(2)),
          total_paid: Number(totalPaid.toFixed(2)),
          total_outstanding: Number(totalOutstanding.toFixed(2)),
          total_pos_count: nonCancelledPOs.length,
          paid_count: paidCount,
          partial_count: partialCount,
          unpaid_count: unpaidCount
        }
      });
    }

    try {
      const [[poAgg]] = await connection.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) AS total_procurement_value,
          COUNT(*) AS total_pos_count,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_count,
          COALESCE(SUM(CASE WHEN payment_status = 'partially_paid' THEN 1 ELSE 0 END), 0) AS partial_count,
          COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END), 0) AS unpaid_count
        FROM purchase_orders 
        WHERE status != 'cancelled'
      `);

      const [[payAgg]] = await connection.query(`
        SELECT COALESCE(SUM(amount), 0) AS total_paid
        FROM payments
        WHERE payment_status = 'completed'
      `);

      const totalProcurement = Number(poAgg.total_procurement_value);
      const totalPaid = Number(payAgg.total_paid);
      const totalOutstanding = Math.max(0, totalProcurement - totalPaid);

      res.status(200).json({
        success: true,
        source: 'mysql',
        data: {
          total_procurement_value: Number(totalProcurement.toFixed(2)),
          total_paid: Number(totalPaid.toFixed(2)),
          total_outstanding: Number(totalOutstanding.toFixed(2)),
          total_pos_count: poAgg.total_pos_count,
          paid_count: poAgg.paid_count,
          partial_count: poAgg.partial_count,
          unpaid_count: poAgg.unpaid_count
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
 * GET /api/payments/payable-pos
 * Fetches all purchase orders with calculated total paid and outstanding balance
 */
const getPayablePOs = async (req, res, next) => {
  try {
    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Memory fallback
      const nonCancelledPOs = inMemoryPOs.filter(p => p.status !== 'cancelled');
      const payableList = nonCancelledPOs.map(po => {
        const poPayments = inMemoryPayments.filter(pay => pay.po_id === po.id);
        const totalPaid = poPayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
        const totalAmount = Number(po.total_amount);
        const outstandingBalance = Math.max(0, Number((totalAmount - totalPaid).toFixed(2)));

        return {
          id: po.id,
          po_number: po.po_number,
          supplier_id: po.supplier_id,
          supplier_name: po.supplier_name,
          order_date: po.order_date,
          status: po.status,
          total_amount: totalAmount,
          total_paid: Number(totalPaid.toFixed(2)),
          outstanding_balance: outstandingBalance,
          payment_status: po.payment_status || (totalPaid === 0 ? 'unpaid' : totalPaid >= totalAmount - 0.01 ? 'paid' : 'partially_paid')
        };
      });

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: payableList
      });
    }

    try {
      const [pos] = await connection.query(`
        SELECT 
          po.id,
          po.po_number,
          po.supplier_id,
          s.name AS supplier_name,
          po.order_date,
          po.status,
          po.total_amount,
          COALESCE(SUM(p.amount), 0) AS total_paid,
          po.payment_status
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN payments p ON po.id = p.po_id AND p.payment_status = 'completed'
        WHERE po.status != 'cancelled'
        GROUP BY po.id
        ORDER BY po.id DESC
      `);

      const formatted = pos.map(po => {
        const totalAmount = Number(po.total_amount);
        const totalPaid = Number(po.total_paid);
        const outstandingBalance = Math.max(0, Number((totalAmount - totalPaid).toFixed(2)));
        return {
          ...po,
          total_amount: totalAmount,
          total_paid: totalPaid,
          outstanding_balance: outstandingBalance
        };
      });

      res.status(200).json({
        success: true,
        source: 'mysql',
        data: formatted
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/:id
 * Retrieve details of a specific payment voucher
 */
const getPaymentById = async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    if (isNaN(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID.' });
    }

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const pay = inMemoryPayments.find(p => p.id === paymentId);
      if (!pay) {
        return res.status(404).json({ success: false, message: 'Payment voucher not found.' });
      }
      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: pay
      });
    }

    try {
      const [rows] = await connection.query(`
        SELECT 
          p.id,
          p.payment_reference,
          p.po_id,
          po.po_number,
          po.order_date,
          po.total_amount AS po_total_amount,
          po.status AS po_status,
          p.supplier_id,
          s.name AS supplier_name,
          s.contact_person AS supplier_contact_person,
          s.email AS supplier_email,
          s.phone AS supplier_phone,
          s.address AS supplier_address,
          s.tax_id AS supplier_tax_id,
          p.processed_by,
          u.name AS processed_by_name,
          p.payment_date,
          p.amount,
          p.payment_mode,
          p.transaction_reference,
          p.payment_status,
          p.notes,
          p.created_at
        FROM payments p
        JOIN purchase_orders po ON p.po_id = po.id
        JOIN suppliers s ON p.supplier_id = s.id
        JOIN users u ON p.processed_by = u.id
        WHERE p.id = ?
      `, [paymentId]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Payment voucher not found.' });
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
 * POST /api/payments
 * Record a new payment disbursement against a purchase order
 *
 * Request Body:
 * {
 *   po_id: 2,
 *   amount: 7817.50,
 *   payment_date: "2026-11-25",
 *   payment_mode: "bank_transfer" | "upi" | "cheque" | "cash" | "other",
 *   transaction_reference: "HDFC987162534",
 *   notes: "Final settlement installment",
 *   allow_overpayment: false
 * }
 */
const recordPayment = async (req, res, next) => {
  try {
    const {
      po_id,
      amount,
      payment_date,
      payment_mode = 'bank_transfer',
      transaction_reference = '',
      notes = '',
      allow_overpayment = false
    } = req.body;

    // 1. Validation
    if (!po_id) {
      return res.status(400).json({ success: false, message: 'Purchase Order ID is required.' });
    }
    const payAmount = Number(parseFloat(amount).toFixed(2));
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }
    if (!payment_date) {
      return res.status(400).json({ success: false, message: 'Payment date is required.' });
    }

    const validModes = ['cash', 'upi', 'bank_transfer', 'cheque', 'credit_card', 'other'];
    const normalizedMode = payment_mode.toLowerCase().replace(/[\s-]/g, '_');
    const finalMode = validModes.includes(normalizedMode) ? normalizedMode : 'other';

    const processedByUserId = req.user?.id || 1;
    const processedByUserName = req.user?.name || 'Ananya Iyer (Finance)';

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Memory fallback implementation
      const targetPO = inMemoryPOs.find(p => p.id === parseInt(po_id, 10));
      if (!targetPO) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
      }

      if (targetPO.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot disburse payments against cancelled purchase orders.'
        });
      }

      // Calculate total previous payments for this PO
      const previousPayments = inMemoryPayments.filter(p => p.po_id === targetPO.id);
      const totalPreviouslyPaid = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstandingBalance = Number((targetPO.total_amount - totalPreviouslyPaid).toFixed(2));

      // CRITICAL BUSINESS RULE: Prevent payment exceeding outstanding balance
      if (!allow_overpayment && payAmount > outstandingBalance + 0.01) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (₹${payAmount.toLocaleString('en-IN')}) cannot exceed the remaining balance of ₹${outstandingBalance.toLocaleString('en-IN')}. Over-payment requires authorization.`
        });
      }

      // Generate payment reference
      const payment_reference = await generatePaymentReference(null);
      const paymentId = nextPaymentId++;

      const newPayment = {
        id: paymentId,
        payment_reference,
        po_id: targetPO.id,
        po_number: targetPO.po_number,
        supplier_id: targetPO.supplier_id,
        supplier_name: targetPO.supplier_name,
        supplier_email: targetPO.supplier_email,
        supplier_phone: targetPO.supplier_phone,
        supplier_tax_id: targetPO.supplier_tax_id,
        processed_by: processedByUserId,
        processed_by_name: processedByUserName,
        payment_date,
        amount: payAmount,
        payment_mode: finalMode,
        transaction_reference: transaction_reference.trim() || null,
        payment_status: 'completed',
        notes: notes.trim() || null,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      inMemoryPayments.unshift(newPayment);

      // Update PO Payment Status
      const newTotalPaid = Number((totalPreviouslyPaid + payAmount).toFixed(2));
      let newPaymentStatus = 'unpaid';
      if (newTotalPaid >= targetPO.total_amount - 0.01) {
        newPaymentStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newPaymentStatus = 'partially_paid';
      }
      targetPO.payment_status = newPaymentStatus;

      const remainingAfter = Math.max(0, Number((targetPO.total_amount - newTotalPaid).toFixed(2)));

      return res.status(201).json({
        success: true,
        source: 'memory_fallback',
        message: `Payment voucher ${payment_reference} for ₹${payAmount.toLocaleString('en-IN')} recorded successfully.`,
        data: {
          payment: newPayment,
          po_payment_status: newPaymentStatus,
          total_paid: newTotalPaid,
          outstanding_balance: remainingAfter
        }
      });
    }

    // MySQL Transaction Execution
    try {
      await connection.beginTransaction();

      // Lock PO record for update
      const [[po]] = await connection.query(
        `SELECT id, po_number, supplier_id, total_amount, status, payment_status 
         FROM purchase_orders 
         WHERE id = ? FOR UPDATE`,
        [po_id]
      );

      if (!po) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
      }

      if (po.status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot disburse payments against cancelled purchase orders.'
        });
      }

      // Check previously recorded payments
      const [[payCheck]] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_paid 
         FROM payments 
         WHERE po_id = ? AND payment_status = 'completed'`,
        [po_id]
      );

      const totalPreviouslyPaid = Number(payCheck.total_paid);
      const poTotal = Number(po.total_amount);
      const outstandingBalance = Number((poTotal - totalPreviouslyPaid).toFixed(2));

      // CRITICAL BUSINESS RULE: Prevent over-payment
      if (!allow_overpayment && payAmount > outstandingBalance + 0.01) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Payment amount (₹${payAmount.toLocaleString('en-IN')}) cannot exceed the outstanding balance of ₹${outstandingBalance.toLocaleString('en-IN')}. Over-payment requires authorization.`
        });
      }

      // Generate unique voucher reference
      const payment_reference = await generatePaymentReference(connection);

      // Insert payment record
      // Map other to cash or valid enum if strict mysql enum applies
      const dbPaymentMode = ['bank_transfer', 'upi', 'cheque', 'credit_card', 'cash'].includes(finalMode) 
        ? finalMode 
        : 'bank_transfer';

      const [insertResult] = await connection.query(
        `INSERT INTO payments 
         (payment_reference, po_id, supplier_id, processed_by, payment_date, amount, payment_mode, transaction_reference, payment_status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [
          payment_reference,
          po_id,
          po.supplier_id,
          processedByUserId,
          payment_date,
          payAmount,
          dbPaymentMode,
          transaction_reference.trim() || null,
          notes.trim() || null
        ]
      );

      const paymentId = insertResult.insertId;

      // Calculate new payment status for the Purchase Order
      const newTotalPaid = Number((totalPreviouslyPaid + payAmount).toFixed(2));
      let newPaymentStatus = 'unpaid';
      if (newTotalPaid >= poTotal - 0.01) {
        newPaymentStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newPaymentStatus = 'partially_paid';
      }

      await connection.query(
        'UPDATE purchase_orders SET payment_status = ? WHERE id = ?',
        [newPaymentStatus, po_id]
      );

      await connection.commit();

      const remainingAfter = Math.max(0, Number((poTotal - newTotalPaid).toFixed(2)));

      res.status(201).json({
        success: true,
        source: 'mysql',
        message: `Payment voucher ${payment_reference} for ₹${payAmount.toLocaleString('en-IN')} recorded successfully.`,
        data: {
          payment_id: paymentId,
          payment_reference,
          po_payment_status: newPaymentStatus,
          total_paid: newTotalPaid,
          outstanding_balance: remainingAfter
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
  getPayments,
  getPaymentSummary,
  getPayablePOs,
  getPaymentById,
  recordPayment,
  inMemoryPayments
};

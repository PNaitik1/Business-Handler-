const { pool } = require('../config/db');

/**
 * Fallback baseline mock dataset that mirrors the initial MySQL seed data in supplysync_database.sql
 * Returned ONLY if the MySQL daemon is offline or DB_PASSWORD is not yet configured,
 * ensuring the application remains interactive and informs the user of DB status.
 */
const getFallbackDashboardData = () => ({
  source: 'offline_cache',
  database_connected: false,
  message: 'Using offline schema cache. Connect MySQL and set DB_PASSWORD in server/.env to enable live persistence.',
  stats: {
    totalSuppliers: 4,
    totalProducts: 5,
    totalPurchaseOrders: 2,
    pendingPurchaseOrders: 1,
    monthlyProcurementExpenses: 62599.00,
    outstandingPayments: 7817.50,
    lowStockCount: 1
  },
  lowStockItems: [
    {
      id: 4,
      sku: 'SKU-CBL-2.5',
      name: 'Industrial Flexible Copper Cable 2.5 sq mm',
      current_stock: 12,
      reorder_level: 15,
      deficit: 3,
      uom: 'box',
      unit_cost: 2150.00
    }
  ],
  charts: {
    monthlyExpenses: {
      labels: ['Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'],
      data: [35000, 48000, 52000, 61000, 58000, 62599.00]
    },
    supplierPurchases: {
      labels: ['Apex Industrial Hardware Ltd', 'Bharat Packagings Pvt Ltd'],
      data: [46964.00, 15635.00],
      orderCounts: [1, 1]
    },
    poStatusDistribution: {
      labels: ['Draft', 'Issued', 'Partially Delivered', 'Completed', 'Cancelled'],
      data: [0, 0, 1, 1, 0]
    }
  },
  recentPurchaseOrders: [
    {
      id: 2,
      po_number: 'PO-202611-0002',
      supplier_name: 'Bharat Packagings Pvt Ltd',
      order_date: '2026-11-15',
      expected_delivery_date: '2026-11-25',
      total_amount: 15635.00,
      status: 'partially_delivered',
      payment_status: 'partially_paid'
    },
    {
      id: 1,
      po_number: 'PO-202611-0001',
      supplier_name: 'Apex Industrial Hardware Ltd',
      order_date: '2026-11-01',
      expected_delivery_date: '2026-11-10',
      total_amount: 46964.00,
      status: 'completed',
      payment_status: 'paid'
    }
  ],
  recentActivities: [
    {
      id: 1,
      type: 'PAYMENT',
      title: 'Disbursed Advance Payment PAY-202611-0002 (₹7,817.50)',
      description: 'Paid via UPI to Bharat Packagings Pvt Ltd',
      timestamp: '2026-11-16 14:30:00',
      status: 'completed'
    },
    {
      id: 2,
      type: 'DELIVERY',
      title: 'GRN-202611-0002 Received from Bharat Packagings',
      description: '280 boxes accepted, 20 rejected due to transit damage',
      timestamp: '2026-11-18 11:20:00',
      status: 'partial'
    },
    {
      id: 3,
      type: 'PURCHASE_ORDER',
      title: 'Created Purchase Order PO-202611-0002',
      description: 'Issued to Bharat Packagings Pvt Ltd for ₹15,635.00',
      timestamp: '2026-11-15 09:15:00',
      status: 'issued'
    },
    {
      id: 4,
      type: 'PAYMENT',
      title: 'Settled PO-202611-0001 in full (₹46,964.00)',
      description: 'HDFC Bank Transfer to Apex Industrial Hardware',
      timestamp: '2026-11-12 16:45:00',
      status: 'completed'
    },
    {
      id: 5,
      type: 'DELIVERY',
      title: 'GRN-202611-0001 Completed for PO-202611-0001',
      description: '100% QA pass on SS Bolts & Aluminium Sheets',
      timestamp: '2026-11-08 10:00:00',
      status: 'completed'
    }
  ]
});

/**
 * Controller: Get Unified Dashboard Overview
 * Fetches real aggregate figures from MySQL tables.
 * Route: GET /api/dashboard/overview
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    let connection;
    try {
      connection = await pool.getConnection();
    } catch (connError) {
      console.warn('[Dashboard API] MySQL connection not active. Serving structured baseline:', connError.message);
      return res.status(200).json({
        success: true,
        data: getFallbackDashboardData()
      });
    }

    try {
      // 1. Total Suppliers
      const [[{ total_suppliers }]] = await connection.query(
        "SELECT COUNT(*) AS total_suppliers FROM suppliers WHERE status != 'inactive'"
      );

      // 2. Total Products
      const [[{ total_products }]] = await connection.query(
        "SELECT COUNT(*) AS total_products FROM products"
      );

      // 3. Total Purchase Orders
      const [[{ total_po }]] = await connection.query(
        "SELECT COUNT(*) AS total_po FROM purchase_orders"
      );

      // 4. Pending Purchase Orders (issued or partially delivered)
      const [[{ pending_po }]] = await connection.query(
        "SELECT COUNT(*) AS pending_po FROM purchase_orders WHERE status IN ('issued', 'partially_delivered', 'draft')"
      );

      // 5. Monthly Procurement Expenses (Current month total)
      const [[{ monthly_expenses }]] = await connection.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS monthly_expenses 
         FROM purchase_orders 
         WHERE MONTH(order_date) = MONTH(CURRENT_DATE()) 
           AND YEAR(order_date) = YEAR(CURRENT_DATE()) 
           AND status != 'cancelled'`
      );

      // 6. Outstanding Payments (Total PO amount minus completed payments)
      const [[{ outstanding_payments }]] = await connection.query(
        `SELECT COALESCE(SUM(po.total_amount - COALESCE(paid_tbl.paid_sum, 0)), 0) AS outstanding_payments
         FROM purchase_orders po
         LEFT JOIN (
           SELECT po_id, SUM(amount) AS paid_sum 
           FROM payments 
           WHERE payment_status = 'completed' 
           GROUP BY po_id
         ) paid_tbl ON po.id = paid_tbl.po_id
         WHERE po.payment_status IN ('unpaid', 'partially_paid') 
           AND po.status != 'cancelled'`
      );

      // 7. Low Stock Products
      const [lowStockRows] = await connection.query(
        `SELECT id, sku, name, current_stock, reorder_level, (reorder_level - current_stock) AS deficit, uom, unit_cost
         FROM products
         WHERE current_stock <= reorder_level
         ORDER BY deficit DESC`
      );

      // 8. Recent Purchase Orders
      const [recentPOs] = await connection.query(
        `SELECT po.id, po.po_number, s.company_name AS supplier_name, po.order_date, 
                po.expected_delivery_date, po.total_amount, po.status, po.payment_status
         FROM purchase_orders po
         JOIN suppliers s ON po.supplier_id = s.id
         ORDER BY po.created_at DESC
         LIMIT 6`
      );

      // 9. Monthly Purchase Expense Chart (Last 6 Months)
      const [expenseTrendRows] = await connection.query(
        `SELECT DATE_FORMAT(order_date, '%b %Y') AS month_label,
                DATE_FORMAT(order_date, '%Y-%m') AS year_month,
                COALESCE(SUM(total_amount), 0) AS total_spend
         FROM purchase_orders
         WHERE status != 'cancelled'
         GROUP BY year_month, month_label
         ORDER BY year_month ASC
         LIMIT 6`
      );

      // 10. Supplier-wise Purchase Chart (Top 5 suppliers by spend)
      const [supplierSpendRows] = await connection.query(
        `SELECT s.company_name, COALESCE(SUM(po.total_amount), 0) AS total_spend, COUNT(po.id) AS order_count
         FROM suppliers s
         JOIN purchase_orders po ON s.id = po.supplier_id
         WHERE po.status != 'cancelled'
         GROUP BY s.id, s.company_name
         ORDER BY total_spend DESC
         LIMIT 5`
      );

      // 11. Purchase Order Status Distribution
      const [poStatusRows] = await connection.query(
        `SELECT status, COUNT(*) AS count
         FROM purchase_orders
         GROUP BY status`
      );

      // Build Status Distribution Map
      const allStatuses = ['draft', 'issued', 'partially_delivered', 'completed', 'cancelled'];
      const statusCounts = allStatuses.map(st => {
        const found = poStatusRows.find(r => r.status.toLowerCase() === st);
        return found ? parseInt(found.count, 10) : 0;
      });

      // 12. Recent Activities (Union from POs, Deliveries, and Payments)
      const [activityRows] = await connection.query(
        `(SELECT id, 'PURCHASE_ORDER' AS type, CONCAT('Created PO ', po_number) AS title,
                 CONCAT('Amount: ₹', FORMAT(total_amount, 2)) AS description,
                 created_at AS timestamp, status
          FROM purchase_orders)
         UNION ALL
         (SELECT id, 'DELIVERY' AS type, CONCAT('Received Goods under ', delivery_number) AS title,
                 CONCAT('Challan No: ', delivery_challan_number) AS description,
                 created_at AS timestamp, status
          FROM deliveries)
         UNION ALL
         (SELECT id, 'PAYMENT' AS type, CONCAT('Disbursed Payment ', payment_reference) AS title,
                 CONCAT('Amount: ₹', FORMAT(amount, 2), ' via ', payment_mode) AS description,
                 created_at AS timestamp, payment_status AS status
          FROM payments)
         ORDER BY timestamp DESC
         LIMIT 8`
      );

      res.status(200).json({
        success: true,
        data: {
          source: 'mysql',
          database_connected: true,
          stats: {
            totalSuppliers: parseInt(total_suppliers, 10) || 0,
            totalProducts: parseInt(total_products, 10) || 0,
            totalPurchaseOrders: parseInt(total_po, 10) || 0,
            pendingPurchaseOrders: parseInt(pending_po, 10) || 0,
            monthlyProcurementExpenses: parseFloat(monthly_expenses) || 0,
            outstandingPayments: parseFloat(outstanding_payments) || 0,
            lowStockCount: lowStockRows.length
          },
          lowStockItems: lowStockRows,
          recentPurchaseOrders: recentPOs,
          charts: {
            monthlyExpenses: {
              labels: expenseTrendRows.map(r => r.month_label),
              data: expenseTrendRows.map(r => parseFloat(r.total_spend))
            },
            supplierPurchases: {
              labels: supplierSpendRows.map(r => r.company_name),
              data: supplierSpendRows.map(r => parseFloat(r.total_spend)),
              orderCounts: supplierSpendRows.map(r => r.order_count)
            },
            poStatusDistribution: {
              labels: ['Draft', 'Issued', 'Partially Delivered', 'Completed', 'Cancelled'],
              data: statusCounts
            }
          },
          recentActivities: activityRows
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview
};

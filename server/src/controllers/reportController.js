const { pool } = require('../config/db');
const { inMemoryPOs } = require('./poController');
const { inMemoryDeliveries } = require('./deliveryController');
const { inMemoryPayments } = require('./paymentController');
const { inMemoryProducts } = require('./productController');
const { inMemorySuppliers } = require('./supplierController');

/**
 * GET /api/reports/analytics
 * Executive KPI summary metrics and interactive charts dataset
 */
const getAnalyticsOverview = async (req, res, next) => {
  try {
    const { start_date, end_date, timeframe = 'all' } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Memory fallback aggregation
      let pos = inMemoryPOs.filter(p => p.status !== 'cancelled');

      if (start_date) {
        pos = pos.filter(p => p.order_date >= start_date);
      }
      if (end_date) {
        pos = pos.filter(p => p.order_date <= end_date);
      }

      const totalSpend = pos.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      const totalOrders = pos.length;
      
      const totalPaid = inMemoryPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalOutstanding = Math.max(0, totalSpend - totalPaid);

      // Deliveries QA calculation
      let totalReceived = 0;
      let totalAccepted = 0;
      let onTimeCount = 0;

      inMemoryDeliveries.forEach(del => {
        const po = inMemoryPOs.find(p => p.id === del.po_id);
        del.items?.forEach(i => {
          totalReceived += Number(i.received_qty) || 0;
          totalAccepted += Number(i.accepted_qty) || 0;
        });

        if (po && del.delivery_date <= po.expected_delivery_date) {
          onTimeCount++;
        }
      });

      const acceptanceRate = totalReceived > 0 
        ? Number(((totalAccepted / totalReceived) * 100).toFixed(1)) 
        : 100.0;

      const onTimeRate = inMemoryDeliveries.length > 0 
        ? Number(((onTimeCount / inMemoryDeliveries.length) * 100).toFixed(1)) 
        : 100.0;

      // Low Stock
      const lowStockItems = inMemoryProducts.filter(p => p.current_stock <= p.reorder_level);

      // Delayed POs check
      const today = new Date().toISOString().split('T')[0];
      const delayedCount = pos.filter(p => p.status !== 'completed' && p.expected_delivery_date < today).length;

      // Chart 1: Monthly expenses trend
      const monthlyExpenses = {
        labels: ['Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'],
        data: [35000, 48000, 52000, 61000, 58000, Number(totalSpend.toFixed(2))]
      };

      // Chart 2: Supplier-wise purchases
      const supplierMap = {};
      pos.forEach(p => {
        const name = p.supplier_name || 'Other';
        supplierMap[name] = (supplierMap[name] || 0) + Number(p.total_amount);
      });
      const supplierPurchases = {
        labels: Object.keys(supplierMap),
        data: Object.values(supplierMap).map(v => Number(v.toFixed(2)))
      };

      // Chart 3: Product-wise spend
      const productMap = {};
      pos.forEach(p => {
        p.items?.forEach(i => {
          const name = i.product_name || `Product #${i.product_id}`;
          productMap[name] = (productMap[name] || 0) + Number(i.total_price);
        });
      });
      const productPurchases = {
        labels: Object.keys(productMap),
        data: Object.values(productMap).map(v => Number(v.toFixed(2)))
      };

      // Chart 4: PO status distribution
      const statusMap = { draft: 0, pending: 0, confirmed: 0, partially_received: 0, completed: 0, cancelled: 0 };
      inMemoryPOs.forEach(p => {
        const s = p.status?.toLowerCase() || 'pending';
        if (statusMap[s] !== undefined) statusMap[s]++;
      });
      const poStatusDistribution = {
        labels: ['Draft', 'Pending', 'Confirmed', 'Partially Received', 'Completed', 'Cancelled'],
        data: Object.values(statusMap)
      };

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        summary: {
          total_spend: Number(totalSpend.toFixed(2)),
          total_orders: totalOrders,
          total_paid: Number(totalPaid.toFixed(2)),
          total_outstanding: Number(totalOutstanding.toFixed(2)),
          acceptance_rate: acceptanceRate,
          on_time_rate: onTimeRate,
          low_stock_count: lowStockItems.length,
          delayed_orders_count: delayedCount
        },
        charts: {
          monthlyExpenses,
          supplierPurchases,
          productPurchases,
          poStatusDistribution
        }
      });
    }

    try {
      // Live MySQL Aggregation
      let whereClause = "WHERE po.status != 'cancelled'";
      const params = [];

      if (start_date) {
        whereClause += ' AND po.order_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        whereClause += ' AND po.order_date <= ?';
        params.push(end_date);
      }

      const [[poAgg]] = await connection.query(`
        SELECT 
          COALESCE(SUM(po.total_amount), 0) AS total_spend,
          COUNT(po.id) AS total_orders
        FROM purchase_orders po
        ${whereClause}
      `, params);

      const [[payAgg]] = await connection.query(`
        SELECT COALESCE(SUM(amount), 0) AS total_paid
        FROM payments
        WHERE payment_status = 'completed'
      `);

      const [[qaAgg]] = await connection.query(`
        SELECT 
          COALESCE(SUM(received_qty), 0) AS total_received,
          COALESCE(SUM(accepted_qty), 0) AS total_accepted
        FROM delivery_items
      `);

      const [[onTimeAgg]] = await connection.query(`
        SELECT 
          COUNT(d.id) AS total_del,
          COALESCE(SUM(CASE WHEN d.delivery_date <= po.expected_delivery_date THEN 1 ELSE 0 END), 0) AS on_time_del
        FROM deliveries d
        JOIN purchase_orders po ON d.po_id = po.id
      `);

      const [[lowStockAgg]] = await connection.query(`
        SELECT COUNT(*) AS low_stock_count
        FROM products
        WHERE current_stock <= reorder_level
      `);

      const [[delayedAgg]] = await connection.query(`
        SELECT COUNT(*) AS delayed_count
        FROM purchase_orders
        WHERE status NOT IN ('completed', 'cancelled') AND expected_delivery_date < CURRENT_DATE
      `);

      // Monthly expenses query (last 6 months)
      const [monthlyRows] = await connection.query(`
        SELECT 
          DATE_FORMAT(order_date, '%b %Y') AS month_label,
          DATE_FORMAT(order_date, '%Y-%m') AS ym,
          COALESCE(SUM(total_amount), 0) AS spend
        FROM purchase_orders
        WHERE status != 'cancelled'
        GROUP BY ym, month_label
        ORDER BY ym ASC
        LIMIT 6
      `);

      // Supplier-wise purchases
      const [supplierRows] = await connection.query(`
        SELECT 
          s.name AS supplier_name,
          COALESCE(SUM(po.total_amount), 0) AS spend
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.status != 'cancelled'
        GROUP BY s.id, s.name
        ORDER BY spend DESC
        LIMIT 6
      `);

      // Product-wise purchases
      const [productRows] = await connection.query(`
        SELECT 
          p.name AS product_name,
          COALESCE(SUM(poi.total_price), 0) AS spend
        FROM purchase_order_items poi
        JOIN products p ON poi.product_id = p.id
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.status != 'cancelled'
        GROUP BY p.id, p.name
        ORDER BY spend DESC
        LIMIT 6
      `);

      // PO status counts
      const [statusRows] = await connection.query(`
        SELECT status, COUNT(*) AS count
        FROM purchase_orders
        GROUP BY status
      `);

      const totalSpend = Number(poAgg.total_spend);
      const totalPaid = Number(payAgg.total_paid);
      const totalOutstanding = Math.max(0, totalSpend - totalPaid);

      const totRec = Number(qaAgg.total_received);
      const totAcc = Number(qaAgg.total_accepted);
      const acceptanceRate = totRec > 0 ? Number(((totAcc / totRec) * 100).toFixed(1)) : 100.0;

      const totDel = Number(onTimeAgg.total_del);
      const onTimeDel = Number(onTimeAgg.on_time_del);
      const onTimeRate = totDel > 0 ? Number(((onTimeDel / totDel) * 100).toFixed(1)) : 100.0;

      res.status(200).json({
        success: true,
        source: 'mysql',
        summary: {
          total_spend: totalSpend,
          total_orders: Number(poAgg.total_orders),
          total_paid: totalPaid,
          total_outstanding: totalOutstanding,
          acceptance_rate: acceptanceRate,
          on_time_rate: onTimeRate,
          low_stock_count: Number(lowStockAgg.low_stock_count),
          delayed_orders_count: Number(delayedAgg.delayed_count)
        },
        charts: {
          monthlyExpenses: {
            labels: monthlyRows.map(r => r.month_label),
            data: monthlyRows.map(r => Number(r.spend))
          },
          supplierPurchases: {
            labels: supplierRows.map(r => r.supplier_name),
            data: supplierRows.map(r => Number(r.spend))
          },
          productPurchases: {
            labels: productRows.map(r => r.product_name),
            data: productRows.map(r => Number(r.spend))
          },
          poStatusDistribution: {
            labels: statusRows.map(r => r.status.toUpperCase()),
            data: statusRows.map(r => Number(r.count))
          }
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
 * GET /api/reports/detail/:type
 * Returns tabular detailed records for a specific report category:
 * - monthly-expenses
 * - supplier-purchases
 * - product-purchases
 * - pending-orders
 * - delayed-deliveries
 * - outstanding-payments
 * - low-stock
 * - supplier-performance
 */
const getReportDetail = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { start_date, end_date } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Memory fallback data generators
      let records = [];

      switch (type) {
        case 'monthly-expenses': {
          records = [
            { period: 'Nov 2026', total_spend: 62599.00, order_count: inMemoryPOs.length, avg_order_value: 31299.50, tax_amount: 9549.00 },
            { period: 'Oct 2026', total_spend: 58000.00, order_count: 3, avg_order_value: 19333.33, tax_amount: 8847.45 },
            { period: 'Sep 2026', total_spend: 61000.00, order_count: 4, avg_order_value: 15250.00, tax_amount: 9305.08 },
            { period: 'Aug 2026', total_spend: 52000.00, order_count: 2, avg_order_value: 26000.00, tax_amount: 7932.20 }
          ];
          break;
        }

        case 'supplier-purchases': {
          records = inMemorySuppliers.map(s => {
            const pos = inMemoryPOs.filter(p => p.supplier_id === s.id && p.status !== 'cancelled');
            const totalSpend = pos.reduce((sum, p) => sum + Number(p.total_amount), 0);
            const payments = inMemoryPayments.filter(p => p.supplier_id === s.id);
            const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const balanceDue = Math.max(0, totalSpend - totalPaid);

            return {
              supplier_name: s.company_name || s.name,
              contact_person: s.contact_person,
              tax_id: s.tax_id,
              order_count: pos.length,
              total_spend: totalSpend,
              total_paid: totalPaid,
              balance_due: balanceDue,
              rating: s.rating
            };
          }).filter(s => s.order_count > 0 || s.total_spend > 0);
          break;
        }

        case 'product-purchases': {
          records = inMemoryProducts.map(p => {
            let totalOrdered = 0;
            let totalSpend = 0;

            inMemoryPOs.forEach(po => {
              po.items?.forEach(i => {
                if (i.product_id === p.id) {
                  totalOrdered += Number(i.ordered_qty);
                  totalSpend += Number(i.total_price);
                }
              });
            });

            return {
              product_name: p.name,
              sku: p.sku,
              category: p.category_name || 'General',
              uom: p.uom,
              total_ordered_qty: totalOrdered,
              total_spend: totalSpend,
              current_stock: p.current_stock,
              reorder_level: p.reorder_level,
              unit_cost: p.unit_cost
            };
          });
          break;
        }

        case 'pending-orders': {
          records = inMemoryPOs
            .filter(p => ['pending', 'confirmed', 'partially_received'].includes(p.status))
            .map(p => ({
              po_number: p.po_number,
              supplier_name: p.supplier_name,
              order_date: p.order_date,
              expected_delivery_date: p.expected_delivery_date,
              total_amount: p.total_amount,
              status: p.status,
              payment_status: p.payment_status || 'unpaid',
              item_count: p.items?.length || 0
            }));
          break;
        }

        case 'delayed-deliveries': {
          const today = new Date().toISOString().split('T')[0];
          records = inMemoryPOs
            .filter(p => p.status !== 'completed' && p.status !== 'cancelled' && p.expected_delivery_date < today)
            .map(p => {
              const diffMs = new Date(today) - new Date(p.expected_delivery_date);
              const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
              return {
                po_number: p.po_number,
                supplier_name: p.supplier_name,
                expected_date: p.expected_delivery_date,
                days_overdue: daysOverdue,
                status: p.status,
                total_amount: p.total_amount,
                notes: p.notes
              };
            });
          break;
        }

        case 'outstanding-payments': {
          records = inMemoryPOs
            .filter(p => p.status !== 'cancelled')
            .map(p => {
              const pays = inMemoryPayments.filter(pay => pay.po_id === p.id);
              const paid = pays.reduce((sum, pay) => sum + Number(pay.amount), 0);
              const bal = Math.max(0, Number((p.total_amount - paid).toFixed(2)));
              return {
                po_number: p.po_number,
                supplier_name: p.supplier_name,
                order_date: p.order_date,
                total_amount: p.total_amount,
                total_paid: paid,
                outstanding_balance: bal,
                payment_status: p.payment_status || (paid === 0 ? 'unpaid' : bal === 0 ? 'paid' : 'partially_paid')
              };
            })
            .filter(r => r.outstanding_balance > 0);
          break;
        }

        case 'low-stock': {
          records = inMemoryProducts
            .filter(p => p.current_stock <= p.reorder_level)
            .map(p => {
              const deficit = Math.max(0, p.reorder_level - p.current_stock);
              const estRestockCost = Number((deficit * p.unit_cost).toFixed(2));
              return {
                product_name: p.name,
                sku: p.sku,
                category: p.category_name || 'General',
                current_stock: p.current_stock,
                reorder_level: p.reorder_level,
                deficit,
                uom: p.uom,
                unit_cost: p.unit_cost,
                estimated_restock_cost: estRestockCost
              };
            });
          break;
        }

        case 'supplier-performance': {
          records = inMemorySuppliers.map(s => {
            const pos = inMemoryPOs.filter(p => p.supplier_id === s.id);
            const dels = inMemoryDeliveries.filter(d => d.supplier_id === s.id);

            let totalRec = 0;
            let totalAcc = 0;
            let onTimeCount = 0;

            dels.forEach(d => {
              const po = inMemoryPOs.find(p => p.id === d.po_id);
              if (po && d.delivery_date <= po.expected_delivery_date) onTimeCount++;
              d.items?.forEach(i => {
                totalRec += Number(i.received_qty);
                totalAcc += Number(i.accepted_qty);
              });
            });

            const onTimePct = dels.length > 0 ? Number(((onTimeCount / dels.length) * 100).toFixed(1)) : 100.0;
            const qaAccPct = totalRec > 0 ? Number(((totalAcc / totalRec) * 100).toFixed(1)) : 100.0;
            const totalSpend = pos.reduce((sum, p) => sum + Number(p.total_amount), 0);

            return {
              supplier_name: s.company_name || s.name,
              tax_id: s.tax_id,
              total_orders: pos.length,
              total_spend: totalSpend,
              on_time_rate: onTimePct,
              quality_acceptance_rate: qaAccPct,
              rating: s.rating,
              performance_status: onTimePct >= 90 && qaAccPct >= 95 ? 'Preferred' : onTimePct >= 75 ? 'Standard' : 'Under Review'
            };
          }).filter(s => s.total_orders > 0 || s.total_spend > 0);
          break;
        }

        default:
          return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
      }

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        type,
        count: records.length,
        data: records
      });
    }

    try {
      let records = [];

      switch (type) {
        case 'monthly-expenses': {
          const [rows] = await connection.query(`
            SELECT 
              DATE_FORMAT(order_date, '%b %Y') AS period,
              COALESCE(SUM(total_amount), 0) AS total_spend,
              COUNT(id) AS order_count,
              COALESCE(AVG(total_amount), 0) AS avg_order_value,
              COALESCE(SUM(tax_amount), 0) AS tax_amount
            FROM purchase_orders
            WHERE status != 'cancelled'
            GROUP BY DATE_FORMAT(order_date, '%Y-%m'), period
            ORDER BY DATE_FORMAT(order_date, '%Y-%m') DESC
          `);
          records = rows;
          break;
        }

        case 'supplier-purchases': {
          const [rows] = await connection.query(`
            SELECT 
              s.name AS supplier_name,
              s.contact_person,
              s.tax_id,
              COUNT(po.id) AS order_count,
              COALESCE(SUM(po.total_amount), 0) AS total_spend,
              COALESCE(SUM(pay.amount), 0) AS total_paid,
              GREATEST(0, COALESCE(SUM(po.total_amount), 0) - COALESCE(SUM(pay.amount), 0)) AS balance_due,
              s.rating
            FROM suppliers s
            LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'cancelled'
            LEFT JOIN payments pay ON po.id = pay.po_id AND pay.payment_status = 'completed'
            GROUP BY s.id
            HAVING total_spend > 0 OR order_count > 0
            ORDER BY total_spend DESC
          `);
          records = rows;
          break;
        }

        case 'product-purchases': {
          const [rows] = await connection.query(`
            SELECT 
              p.name AS product_name,
              p.sku,
              c.name AS category,
              p.uom,
              COALESCE(SUM(poi.ordered_qty), 0) AS total_ordered_qty,
              COALESCE(SUM(poi.total_price), 0) AS total_spend,
              p.current_stock,
              p.reorder_level,
              p.unit_cost
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN purchase_order_items poi ON p.id = poi.product_id
            LEFT JOIN purchase_orders po ON poi.purchase_order_id = po.id AND po.status != 'cancelled'
            GROUP BY p.id
            ORDER BY total_spend DESC
          `);
          records = rows;
          break;
        }

        case 'pending-orders': {
          const [rows] = await connection.query(`
            SELECT 
              po.po_number,
              s.name AS supplier_name,
              po.order_date,
              po.expected_delivery_date,
              po.total_amount,
              po.status,
              po.payment_status,
              COUNT(poi.id) AS item_count
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
            WHERE po.status IN ('pending', 'confirmed', 'partially_received')
            GROUP BY po.id
            ORDER BY po.order_date DESC
          `);
          records = rows;
          break;
        }

        case 'delayed-deliveries': {
          const [rows] = await connection.query(`
            SELECT 
              po.po_number,
              s.name AS supplier_name,
              po.expected_delivery_date AS expected_date,
              DATEDIFF(CURRENT_DATE, po.expected_delivery_date) AS days_overdue,
              po.status,
              po.total_amount,
              po.notes
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.status NOT IN ('completed', 'cancelled') 
              AND po.expected_delivery_date < CURRENT_DATE
            ORDER BY days_overdue DESC
          `);
          records = rows;
          break;
        }

        case 'outstanding-payments': {
          const [rows] = await connection.query(`
            SELECT 
              po.po_number,
              s.name AS supplier_name,
              po.order_date,
              po.total_amount,
              COALESCE(SUM(p.amount), 0) AS total_paid,
              GREATEST(0, po.total_amount - COALESCE(SUM(p.amount), 0)) AS outstanding_balance,
              po.payment_status
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN payments p ON po.id = p.po_id AND p.payment_status = 'completed'
            WHERE po.status != 'cancelled'
            GROUP BY po.id
            HAVING outstanding_balance > 0.01
            ORDER BY outstanding_balance DESC
          `);
          records = rows;
          break;
        }

        case 'low-stock': {
          const [rows] = await connection.query(`
            SELECT 
              p.name AS product_name,
              p.sku,
              c.name AS category,
              p.current_stock,
              p.reorder_level,
              GREATEST(0, p.reorder_level - p.current_stock) AS deficit,
              p.uom,
              p.unit_cost,
              ROUND(GREATEST(0, p.reorder_level - p.current_stock) * p.unit_cost, 2) AS estimated_restock_cost
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.current_stock <= p.reorder_level
            ORDER BY deficit DESC
          `);
          records = rows;
          break;
        }

        case 'supplier-performance': {
          const [rows] = await connection.query(`
            SELECT 
              s.name AS supplier_name,
              s.tax_id,
              COUNT(DISTINCT po.id) AS total_orders,
              COALESCE(SUM(po.total_amount), 0) AS total_spend,
              ROUND(COALESCE(SUM(CASE WHEN d.delivery_date <= po.expected_delivery_date THEN 1 ELSE 0 END) / NULLIF(COUNT(d.id), 0) * 100, 100.0), 1) AS on_time_rate,
              ROUND(COALESCE(SUM(di.accepted_qty) / NULLIF(SUM(di.received_qty), 0) * 100, 100.0), 1) AS quality_acceptance_rate,
              s.rating,
              CASE 
                WHEN s.rating >= 4.5 THEN 'Preferred'
                WHEN s.rating >= 3.5 THEN 'Standard'
                ELSE 'Under Review'
              END AS performance_status
            FROM suppliers s
            LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'cancelled'
            LEFT JOIN deliveries d ON po.id = d.po_id
            LEFT JOIN delivery_items di ON d.id = di.delivery_id
            GROUP BY s.id
            HAVING total_orders > 0 OR total_spend > 0
            ORDER BY total_spend DESC
          `);
          records = rows;
          break;
        }

        default:
          return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
      }

      res.status(200).json({
        success: true,
        source: 'mysql',
        type,
        count: records.length,
        data: records
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalyticsOverview,
  getReportDetail
};

const { pool } = require('../config/db');

// In-memory fallback quotes matching the initial seed data
let inMemoryQuotations = [
  {
    id: 1,
    quote_ref_number: 'QT-2026-APX-01',
    supplier_id: 1,
    supplier_name: 'Apex Industrial Hardware Ltd',
    supplier_rating: 4.85,
    supplier_city: 'Mumbai',
    product_id: 1,
    product_name: 'Stainless Steel Hex Bolt M10 x 50mm',
    sku: 'SKU-HEX-M10',
    uom: 'pcs',
    unit_price: 11.80,
    minimum_order_qty: 500,
    lead_time_days: 5,
    availability: 'in_stock',
    quotation_date: '2026-11-01',
    valid_until: '2026-12-31',
    status: 'accepted',
    remarks: 'Bulk tier rate for grade 304 fasteners'
  },
  {
    id: 2,
    quote_ref_number: 'QT-2026-ZEN-02',
    supplier_id: 3,
    supplier_name: 'Zenith Electronics & Cables',
    supplier_rating: 4.20,
    supplier_city: 'New Delhi',
    product_id: 1,
    product_name: 'Stainless Steel Hex Bolt M10 x 50mm',
    sku: 'SKU-HEX-M10',
    uom: 'pcs',
    unit_price: 12.25,
    minimum_order_qty: 200,
    lead_time_days: 2,
    availability: 'in_stock',
    quotation_date: '2026-11-04',
    valid_until: '2026-12-31',
    status: 'active',
    remarks: 'Express dispatch from Delhi distribution hub'
  },
  {
    id: 3,
    quote_ref_number: 'QT-2026-DLT-01',
    supplier_id: 4,
    supplier_name: 'Delta Chem Logistics',
    supplier_rating: 3.40,
    supplier_city: 'Kolkata',
    product_id: 1,
    product_name: 'Stainless Steel Hex Bolt M10 x 50mm',
    sku: 'SKU-HEX-M10',
    uom: 'pcs',
    unit_price: 11.20,
    minimum_order_qty: 1000,
    lead_time_days: 14,
    availability: 'made_to_order',
    quotation_date: '2026-11-08',
    valid_until: '2026-12-31',
    status: 'active',
    remarks: 'Economy batch fabrication, longer transit time'
  },
  {
    id: 4,
    quote_ref_number: 'QT-2026-APX-02',
    supplier_id: 1,
    supplier_name: 'Apex Industrial Hardware Ltd',
    supplier_rating: 4.85,
    supplier_city: 'Mumbai',
    product_id: 2,
    product_name: 'Aluminium Sheet 2mm x 4ft x 8ft',
    sku: 'SKU-ALU-SHT',
    uom: 'pcs',
    unit_price: 1400.00,
    minimum_order_qty: 10,
    lead_time_days: 7,
    availability: 'in_stock',
    quotation_date: '2026-11-01',
    valid_until: '2026-12-31',
    status: 'accepted',
    remarks: '1100 alloy mill finish'
  },
  {
    id: 5,
    quote_ref_number: 'QT-2026-BPK-01',
    supplier_id: 2,
    supplier_name: 'Bharat Packagings Pvt Ltd',
    supplier_rating: 4.50,
    supplier_city: 'Bengaluru',
    product_id: 3,
    product_name: 'Corrugated Box 12x10x8 inch (3-Ply)',
    sku: 'SKU-BOX-3PLY',
    uom: 'box',
    unit_price: 26.50,
    minimum_order_qty: 200,
    lead_time_days: 3,
    availability: 'in_stock',
    quotation_date: '2026-11-02',
    valid_until: '2026-12-31',
    status: 'accepted',
    remarks: '3-ply standard brown carton stock'
  },
  {
    id: 6,
    quote_ref_number: 'QT-2026-ZEN-01',
    supplier_id: 3,
    supplier_name: 'Zenith Electronics & Cables',
    supplier_rating: 4.20,
    supplier_city: 'New Delhi',
    product_id: 4,
    product_name: 'Industrial Flexible Copper Cable 2.5 sq mm',
    sku: 'SKU-CBL-2.5',
    uom: 'box',
    unit_price: 2050.00,
    minimum_order_qty: 5,
    lead_time_days: 6,
    availability: 'in_stock',
    quotation_date: '2026-11-03',
    valid_until: '2026-12-31',
    status: 'active',
    remarks: 'Flame retardant 100m roll rolls'
  }
];

let nextQuoteId = 7;

/**
 * Multi-Criteria Decision Analysis (MCDA) Scoring Algorithm
 * Balanced evaluation: Price Weight (65%) + Delivery Speed Weight (35%)
 * Prevents choosing a slow supplier that jeopardizes warehouse schedules just to save a negligible amount.
 */
const calculateComparisonMetrics = (quotes, requiredQty = 100) => {
  if (!quotes || quotes.length === 0) return [];

  const qty = parseInt(requiredQty, 10) || 1;

  // Find minimums across valid quotes for normalization
  const minPrice = Math.min(...quotes.map(q => parseFloat(q.unit_price)));
  const minLeadTime = Math.min(...quotes.map(q => parseInt(q.lead_time_days, 10) || 1));

  // Compute total cost and normalized scores
  const analyzedQuotes = quotes.map(q => {
    const unitPrice = parseFloat(q.unit_price);
    const leadTime = parseInt(q.lead_time_days, 10) || 1;
    const totalCost = unitPrice * qty;

    // Normalization: (Min / Actual) * 100 -> Lower price & lower lead time give higher score
    const priceScore = (minPrice / unitPrice) * 100;
    const speedScore = (minLeadTime / leadTime) * 100;

    // Composite weighted score (65% Price, 35% Speed)
    const compositeScore = (0.65 * priceScore) + (0.35 * speedScore);

    return {
      ...q,
      unit_price: unitPrice,
      lead_time_days: leadTime,
      required_quantity: qty,
      total_cost: totalCost,
      is_lowest_price: unitPrice === minPrice,
      is_fastest_delivery: leadTime === minLeadTime,
      composite_score: parseFloat(compositeScore.toFixed(2))
    };
  });

  // Identify highest composite score as Recommended
  const highestScore = Math.max(...analyzedQuotes.map(q => q.composite_score));

  return analyzedQuotes.map(q => {
    const isRecommended = q.composite_score === highestScore;
    let recommendationReason = '';

    if (isRecommended) {
      if (q.is_lowest_price && q.is_fastest_delivery) {
        recommendationReason = 'Optimal Choice: Offers both lowest price and fastest dispatch.';
      } else if (q.is_lowest_price) {
        recommendationReason = 'Lowest Cost: Maximum financial savings with acceptable delivery timeframe.';
      } else if (q.is_fastest_delivery) {
        recommendationReason = 'Fast Track: Superior delivery speed with highly competitive pricing.';
      } else {
        recommendationReason = 'Best Value: Optimal balance between price affordability and lead time.';
      }
    }

    return {
      ...q,
      is_recommended: isRecommended,
      recommendation_reason: recommendationReason
    };
  }).sort((a, b) => b.composite_score - a.composite_score);
};

/**
 * GET /api/quotations
 * List all quotation history with search and product filtering
 */
const getQuotations = async (req, res, next) => {
  try {
    const { product_id, supplier_id, status, search = '' } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      let filtered = [...inMemoryQuotations];

      if (product_id && product_id !== 'all') {
        filtered = filtered.filter(q => String(q.product_id) === String(product_id));
      }
      if (supplier_id && supplier_id !== 'all') {
        filtered = filtered.filter(q => String(q.supplier_id) === String(supplier_id));
      }
      if (status && status !== 'all') {
        filtered = filtered.filter(q => q.status === status);
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        filtered = filtered.filter(q =>
          q.quote_ref_number.toLowerCase().includes(query) ||
          q.supplier_name.toLowerCase().includes(query) ||
          q.product_name.toLowerCase().includes(query) ||
          q.sku.toLowerCase().includes(query)
        );
      }

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        total: filtered.length,
        data: filtered
      });
    }

    try {
      let query = `
        SELECT sq.*, 
               s.company_name AS supplier_name, s.rating AS supplier_rating, s.city AS supplier_city,
               p.name AS product_name, p.sku, p.uom,
               DATE_FORMAT(sq.created_at, '%Y-%m-%d') AS quotation_date
        FROM supplier_quotes sq
        JOIN suppliers s ON sq.supplier_id = s.id
        JOIN products p ON sq.product_id = p.id
        WHERE 1=1
      `;
      const params = [];

      if (product_id && product_id !== 'all') {
        query += ' AND sq.product_id = ?';
        params.push(product_id);
      }
      if (supplier_id && supplier_id !== 'all') {
        query += ' AND sq.supplier_id = ?';
        params.push(supplier_id);
      }
      if (status && status !== 'all') {
        query += ' AND sq.status = ?';
        params.push(status);
      }
      if (search.trim()) {
        query += ' AND (sq.quote_ref_number LIKE ? OR s.company_name LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)';
        const pattern = `%${search.trim()}%`;
        params.push(pattern, pattern, pattern, pattern);
      }

      query += ' ORDER BY sq.created_at DESC';

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
 * GET /api/quotations/compare
 * Multi-Supplier Side-by-Side Comparison Matrix for a selected product
 */
const compareQuotations = async (req, res, next) => {
  try {
    const { product_id, quantity = 100 } = req.query;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'Please select a product to compare quotations.' });
    }

    const requiredQty = parseInt(quantity, 10) || 100;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const matched = inMemoryQuotations.filter(q => String(q.product_id) === String(product_id));
      const comparisonResults = calculateComparisonMetrics(matched, requiredQty);

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        product_id: parseInt(product_id, 10),
        required_quantity: requiredQty,
        total_quotes: comparisonResults.length,
        data: comparisonResults
      });
    }

    try {
      const [rows] = await connection.query(
        `SELECT sq.*, 
                s.company_name AS supplier_name, s.rating AS supplier_rating, s.city AS supplier_city,
                p.name AS product_name, p.sku, p.uom,
                DATE_FORMAT(sq.created_at, '%Y-%m-%d') AS quotation_date
         FROM supplier_quotes sq
         JOIN suppliers s ON sq.supplier_id = s.id
         JOIN products p ON sq.product_id = p.id
         WHERE sq.product_id = ?
         ORDER BY sq.unit_price ASC`,
        [product_id]
      );

      const comparisonResults = calculateComparisonMetrics(rows, requiredQty);

      res.status(200).json({
        success: true,
        source: 'mysql',
        product_id: parseInt(product_id, 10),
        required_quantity: requiredQty,
        total_quotes: comparisonResults.length,
        data: comparisonResults
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/quotations
 * Add a new supplier quotation
 */
const createQuotation = async (req, res, next) => {
  try {
    const {
      quote_ref_number,
      supplier_id,
      product_id,
      unit_price,
      lead_time_days = 7,
      minimum_order_qty = 1,
      valid_until,
      availability = 'in_stock',
      status = 'active',
      remarks = ''
    } = req.body;

    const refNo = quote_ref_number || `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const newQuote = {
        id: nextQuoteId++,
        quote_ref_number: refNo,
        supplier_id: parseInt(supplier_id, 10),
        supplier_name: 'Apex Industrial Hardware Ltd',
        supplier_rating: 4.85,
        supplier_city: 'Mumbai',
        product_id: parseInt(product_id, 10),
        product_name: 'Selected Product',
        sku: 'SKU-PROD',
        uom: 'pcs',
        unit_price: parseFloat(unit_price),
        minimum_order_qty: parseInt(minimum_order_qty, 10) || 1,
        lead_time_days: parseInt(lead_time_days, 10) || 7,
        availability,
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: valid_until || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        status,
        remarks
      };

      inMemoryQuotations.unshift(newQuote);

      return res.status(201).json({
        success: true,
        source: 'memory_fallback',
        message: 'Supplier quotation recorded successfully.',
        data: newQuote
      });
    }

    try {
      const [result] = await connection.query(
        `INSERT INTO supplier_quotes 
         (quote_ref_number, supplier_id, product_id, unit_price, minimum_order_qty, lead_time_days, valid_until, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          refNo,
          supplier_id,
          product_id,
          unit_price,
          minimum_order_qty,
          lead_time_days,
          valid_until || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          status
        ]
      );

      const [created] = await connection.query(
        `SELECT sq.*, s.company_name AS supplier_name, p.name AS product_name, p.sku
         FROM supplier_quotes sq
         JOIN suppliers s ON sq.supplier_id = s.id
         JOIN products p ON sq.product_id = p.id
         WHERE sq.id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        source: 'mysql',
        message: 'Supplier quotation recorded successfully in database.',
        data: created[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/quotations/:id
 * Delete a quotation
 */
const deleteQuotation = async (req, res, next) => {
  try {
    const quoteId = parseInt(req.params.id, 10);

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const idx = inMemoryQuotations.findIndex(q => q.id === quoteId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }
      inMemoryQuotations.splice(idx, 1);
      return res.status(200).json({ success: true, message: 'Quotation removed.' });
    }

    try {
      const [result] = await connection.query('DELETE FROM supplier_quotes WHERE id = ?', [quoteId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Quotation not found.' });
      }
      res.status(200).json({ success: true, message: 'Quotation deleted successfully.' });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuotations,
  compareQuotations,
  createQuotation,
  deleteQuotation
};

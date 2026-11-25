const { pool } = require('../config/db');

// In-memory fallback stores matching the seed data
let inMemoryCategories = [
  { id: 1, code: 'RAW-MTL', name: 'Raw Materials', description: 'Metals, industrial sheets, fasteners, and basic fabrication inputs' },
  { id: 2, code: 'PKG-MAT', name: 'Packaging Materials', description: 'Corrugated boxes, protective bubble wraps, and packaging tapes' },
  { id: 3, code: 'ELEC-CMP', name: 'Electrical & Wiring', description: 'Copper wiring, circuit breakers, power switches, and terminal connectors' },
  { id: 4, code: 'SAFE-EQP', name: 'Safety & PPE', description: 'Industrial safety helmets, high-visibility vests, and protective gloves' }
];

let inMemoryProducts = [
  {
    id: 1,
    category_id: 1,
    category_name: 'Raw Materials',
    sku: 'SKU-HEX-M10',
    name: 'Stainless Steel Hex Bolt M10 x 50mm',
    description: 'Grade 304 stainless steel hex head fasteners',
    uom: 'pcs',
    unit_cost: 12.50,
    current_stock: 2500,
    reorder_level: 500,
    is_active: true,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 2,
    category_id: 1,
    category_name: 'Raw Materials',
    sku: 'SKU-ALU-SHT',
    name: 'Aluminium Sheet 2mm x 4ft x 8ft',
    description: 'Commercial grade 1100 alloy sheet for metal enclosures',
    uom: 'pcs',
    unit_cost: 1450.00,
    current_stock: 65,
    reorder_level: 20,
    is_active: true,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 3,
    category_id: 2,
    category_name: 'Packaging Materials',
    sku: 'SKU-BOX-3PLY',
    name: 'Corrugated Box 12x10x8 inch (3-Ply)',
    description: 'Standard brown export shipping cartons',
    uom: 'box',
    unit_cost: 28.00,
    current_stock: 680,
    reorder_level: 150,
    is_active: true,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 4,
    category_id: 3,
    category_name: 'Electrical & Wiring',
    sku: 'SKU-CBL-2.5',
    name: 'Industrial Flexible Copper Cable 2.5 sq mm',
    description: 'Flame retardant multi-strand copper roll (100 meters)',
    uom: 'box',
    unit_cost: 2150.00,
    current_stock: 12,
    reorder_level: 15,
    is_active: true,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  },
  {
    id: 5,
    category_id: 4,
    category_name: 'Safety & PPE',
    sku: 'SKU-GLV-NIT',
    name: 'Nitrile Coated Work Safety Gloves',
    description: 'Heavy duty abrasion resistant safety gloves (Pack of 10 pairs)',
    uom: 'box',
    unit_cost: 350.00,
    current_stock: 85,
    reorder_level: 30,
    is_active: true,
    created_at: '2026-11-01 10:00:00',
    updated_at: '2026-11-01 10:00:00'
  }
];

let nextProductId = 6;
let nextCategoryId = 5;

/**
 * GET /api/products/categories
 * List all categories
 */
const getCategories = async (req, res, next) => {
  try {
    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        data: inMemoryCategories
      });
    }

    try {
      const [rows] = await connection.query('SELECT * FROM categories ORDER BY name ASC');
      res.status(200).json({
        success: true,
        source: 'mysql',
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
 * POST /api/products/categories
 * Create a new category
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, code, description = '' } = req.body;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const newCat = {
        id: nextCategoryId++,
        code: code.toUpperCase(),
        name,
        description
      };
      inMemoryCategories.push(newCat);
      return res.status(201).json({
        success: true,
        source: 'memory_fallback',
        message: 'Category created successfully.',
        data: newCat
      });
    }

    try {
      const [result] = await connection.query(
        'INSERT INTO categories (code, name, description) VALUES (?, ?, ?)',
        [code.toUpperCase(), name, description]
      );
      const [created] = await connection.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);

      res.status(201).json({
        success: true,
        source: 'mysql',
        message: 'Category created successfully in database.',
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
 * GET /api/products
 * List products with search, category filtering, and low stock filtering
 */
const getProducts = async (req, res, next) => {
  try {
    const { search = '', category_id = 'all', low_stock = 'false', sortBy = 'name', sortOrder = 'ASC' } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      let filtered = [...inMemoryProducts];

      if (category_id && category_id !== 'all') {
        filtered = filtered.filter(p => String(p.category_id) === String(category_id));
      }

      if (low_stock === 'true') {
        filtered = filtered.filter(p => p.current_stock <= p.reorder_level);
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category_name.toLowerCase().includes(q)
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
        SELECT p.*, c.name AS category_name, c.code AS category_code
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (category_id && category_id !== 'all') {
        query += ' AND p.category_id = ?';
        params.push(category_id);
      }

      if (low_stock === 'true') {
        query += ' AND p.current_stock <= p.reorder_level';
      }

      if (search.trim()) {
        query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
        const pattern = `%${search.trim()}%`;
        params.push(pattern, pattern, pattern);
      }

      query += ` ORDER BY p.${sortBy === 'sku' ? 'sku' : sortBy === 'current_stock' ? 'current_stock' : 'name'} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;

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
 * GET /api/products/:id
 * Retrieve single product with category and recent stock movements
 */
const getProductById = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const prod = inMemoryProducts.find(p => p.id === productId);
      if (!prod) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.status(200).json({ success: true, source: 'memory_fallback', data: prod });
    }

    try {
      const [rows] = await connection.query(
        `SELECT p.*, c.name AS category_name, c.code AS category_code
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`,
        [productId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.status(200).json({ success: true, source: 'mysql', data: rows[0] });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products
 * Register a new product SKU and log opening stock transaction if stock > 0
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      category_id,
      uom = 'pcs',
      unit_cost = 0.00,
      current_stock = 0,
      reorder_level = 10,
      description = ''
    } = req.body;

    const initialStockQty = parseInt(current_stock, 10) || 0;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      // Duplicate check
      const duplicate = inMemoryProducts.find(p => p.sku.toUpperCase() === sku.toUpperCase());
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'A product with this SKU code already exists.' });
      }

      const cat = inMemoryCategories.find(c => c.id === parseInt(category_id, 10)) || inMemoryCategories[0];

      const newProd = {
        id: nextProductId++,
        category_id: cat.id,
        category_name: cat.name,
        sku: sku.toUpperCase(),
        name,
        description,
        uom,
        unit_cost: parseFloat(unit_cost) || 0.00,
        current_stock: initialStockQty,
        reorder_level: parseInt(reorder_level, 10) || 10,
        is_active: true,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      inMemoryProducts.unshift(newProd);

      return res.status(201).json({
        success: true,
        source: 'memory_fallback',
        message: 'Product created successfully.',
        data: newProd
      });
    }

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO products 
         (category_id, sku, name, description, uom, unit_cost, current_stock, reorder_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [category_id, sku.toUpperCase(), name, description, uom, unit_cost, initialStockQty, reorder_level]
      );

      const newId = result.insertId;

      // If opening stock was specified, log an INITIAL_STOCK transaction record
      if (initialStockQty > 0) {
        await connection.query(
          `INSERT INTO inventory_transactions 
           (product_id, delivery_item_id, transaction_type, quantity, balance_after, performed_by, remarks)
           VALUES (?, NULL, 'INITIAL_STOCK', ?, ?, 1, 'Initial opening stock upon product creation')`,
          [newId, initialStockQty, initialStockQty]
        );
      }

      await connection.commit();

      const [created] = await connection.query(
        `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
        [newId]
      );

      res.status(201).json({
        success: true,
        source: 'mysql',
        message: 'Product SKU created successfully in database.',
        data: created[0]
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
 * PUT /api/products/:id
 * Update product details
 */
const updateProduct = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const {
      name,
      sku,
      category_id,
      uom,
      unit_cost,
      reorder_level,
      description
    } = req.body;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const index = inMemoryProducts.findIndex(p => p.id === productId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const cat = inMemoryCategories.find(c => c.id === parseInt(category_id, 10)) || inMemoryCategories[0];

      inMemoryProducts[index] = {
        ...inMemoryProducts[index],
        name: name || inMemoryProducts[index].name,
        sku: sku ? sku.toUpperCase() : inMemoryProducts[index].sku,
        category_id: cat.id,
        category_name: cat.name,
        uom: uom || inMemoryProducts[index].uom,
        unit_cost: unit_cost !== undefined ? parseFloat(unit_cost) : inMemoryProducts[index].unit_cost,
        reorder_level: reorder_level !== undefined ? parseInt(reorder_level, 10) : inMemoryProducts[index].reorder_level,
        description: description !== undefined ? description : inMemoryProducts[index].description,
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        message: 'Product updated successfully.',
        data: inMemoryProducts[index]
      });
    }

    try {
      await connection.query(
        `UPDATE products SET 
          name = ?, sku = ?, category_id = ?, uom = ?, 
          unit_cost = ?, reorder_level = ?, description = ?
         WHERE id = ?`,
        [name, sku.toUpperCase(), category_id, uom, unit_cost, reorder_level, description, productId]
      );

      const [updated] = await connection.query(
        `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
        [productId]
      );

      res.status(200).json({
        success: true,
        source: 'mysql',
        message: 'Product updated successfully.',
        data: updated[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 * Delete or soft-deactivate product. Checks foreign key references!
 */
const deleteProduct = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { action = 'delete' } = req.query;

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (dbErr) {
      const index = inMemoryProducts.findIndex(p => p.id === productId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      if (action === 'deactivate') {
        inMemoryProducts[index].is_active = false;
        return res.status(200).json({
          success: true,
          message: 'Product marked as inactive.'
        });
      }

      // Check if product is referenced in demo orders (Product ID 1, 2, 3)
      if ([1, 2, 3].includes(productId)) {
        return res.status(400).json({
          success: false,
          hasLinkedRecords: true,
          message: 'Cannot delete product. This SKU is linked to existing purchase order records. You can deactivate it instead.'
        });
      }

      inMemoryProducts.splice(index, 1);
      return res.status(200).json({ success: true, message: 'Product deleted successfully.' });
    }

    try {
      // 1. Check if linked to purchase order items or delivery items
      const [[{ po_count }]] = await connection.query(
        'SELECT COUNT(*) AS po_count FROM purchase_order_items WHERE product_id = ?',
        [productId]
      );

      const [[{ grn_count }]] = await connection.query(
        'SELECT COUNT(*) AS grn_count FROM delivery_items WHERE product_id = ?',
        [productId]
      );

      if (action === 'deactivate') {
        await connection.query('UPDATE products SET is_active = FALSE WHERE id = ?', [productId]);
        return res.status(200).json({ success: true, message: 'Product marked as inactive.' });
      }

      if (po_count > 0 || grn_count > 0) {
        return res.status(400).json({
          success: false,
          hasLinkedRecords: true,
          message: `Cannot delete product. This item is referenced in ${po_count} PO item(s) and ${grn_count} GRN delivery line(s). Deactivate it to preserve stock audit integrity.`
        });
      }

      await connection.query('DELETE FROM products WHERE id = ?', [productId]);

      res.status(200).json({
        success: true,
        source: 'mysql',
        message: 'Product permanently deleted from catalog.'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  inMemoryProducts // Exported for inventory transactions sync in fallback mode
};

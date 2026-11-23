const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { syncProductEmbedding } = require('../ai/embeddings');
const { runInventoryBatchAnalysis, applyBatchUpdates } = require('../ai/langchain/inventoryBatch');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const ALLOWED_CATEGORIES = new Set([
  'electronics',
  'furniture',
  'office-supplies',
  'it-hardware',
  'raw-materials'
]);

// Helper to extract and strictly enforce authenticated tenant context
function getTenantId(req, res) {
  const tenantId = req.user?.tenant_id;
  if (!tenantId || typeof tenantId !== 'string' || !UUID_REGEX.test(tenantId.trim())) {
    res.status(401).json({ success: false, message: 'Unauthorized: Valid organization tenant context is required.' });
    return null;
  }
  return tenantId.trim();
}

// GET /api/v1/inventory/products  - Get all products (Tenant isolated)
router.get('/products', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { search, category, page = 1, limit = 20 } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category = c.slug
    `;
    const params = [tenantId];
    const conditions = ['p.tenant_id = $1', 'p.is_active = true'];

    if (search) {
      conditions.push(`(p.name ILIKE $${params.length + 1} OR p.sku ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (category) {
      conditions.push(`p.category = $${params.length + 1}`);
      params.push(category);
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');

    // Pagination
    const offset = (page - 1) * limit;
    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    let countSql = 'SELECT COUNT(*) FROM products p';
    let countParams = [tenantId];
    let countConditions = ['p.tenant_id = $1', 'p.is_active = true'];
    if (search) {
      countConditions.push(`(p.name ILIKE $${countParams.length + 1} OR p.sku ILIKE $${countParams.length + 1})`);
      countParams.push(`%${search}%`);
    }
    if (category) {
      countConditions.push(`p.category = $${countParams.length + 1}`);
      countParams.push(category);
    }
    countSql += ' WHERE ' + countConditions.join(' AND ');

    const [products, total] = await Promise.all([
      query(sql, params),
      query(countSql, countParams)
    ]);

    res.json({
      success: true,
      data: products.rows,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total: parseInt(total.rows[0].count, 10) }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// POST /api/v1/inventory/products  - Create a product (RBAC: Admin or Manager)
router.post('/products', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { name, sku, category, description, unit_price, quantity, reorder_level, unit } = req.body || {};

    if (!name || !sku) {
      return res.status(400).json({ success: false, message: 'Product name and SKU are required' });
    }

    const price = unit_price !== undefined && unit_price !== '' ? Number(unit_price) : 0;
    const qty = quantity !== undefined && quantity !== '' ? parseInt(quantity, 10) : 0;
    const reorder = reorder_level !== undefined && reorder_level !== '' ? parseInt(reorder_level, 10) : 10;

    const id = uuidv4();
    const result = await query(
      `INSERT INTO products (id, name, sku, category, description, unit_price, quantity, reorder_level, unit, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [id, name, sku, category || 'electronics', description || '', price, qty, reorder, unit || 'pcs', tenantId]
    );

    const newProduct = result.rows[0];
    syncProductEmbedding(newProduct.id, newProduct.name, newProduct.description, newProduct.category, tenantId).catch(() => {});

    res.status(201).json({ success: true, data: newProduct, message: 'Product created' });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// PUT /api/v1/inventory/products/:id  - Update a product (Tenant isolated)
router.put('/products/:id', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID. Expected a valid UUID.' });
    }

    const { name, unit_price, quantity, reorder_level, description, category, unit } = req.body || {};

    const price = unit_price !== undefined && unit_price !== '' ? Number(unit_price) : null;
    const qty = quantity !== undefined && quantity !== '' ? parseInt(quantity, 10) : null;
    const reorder = reorder_level !== undefined && reorder_level !== '' ? parseInt(reorder_level, 10) : null;

    const result = await query(
      `UPDATE products 
       SET name = COALESCE($1, name), 
           unit_price = COALESCE($2, unit_price), 
           quantity = COALESCE($3, quantity), 
           reorder_level = COALESCE($4, reorder_level), 
           description = COALESCE($5, description),
           category = COALESCE($6, category),
           unit = COALESCE($7, unit),
           updated_at = NOW()
       WHERE id = $8 AND tenant_id = $9 RETURNING * `,
      [name, price, qty, reorder, description, category, unit, id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updatedProduct = result.rows[0];
    syncProductEmbedding(updatedProduct.id, updatedProduct.name, updatedProduct.description, updatedProduct.category, tenantId).catch(() => {});

    res.json({ success: true, data: updatedProduct, message: 'Product updated' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// DELETE /api/v1/inventory/products/:id (Tenant isolated)
router.delete('/products/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID. Expected a valid UUID.' });
    }

    const result = await query(
      'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id', 
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product because it is linked to existing orders.'
      });
    }
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// GET /api/v1/inventory/low-stock  - Low stock alerts (Tenant isolated)
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const result = await query(
      'SELECT * FROM products WHERE quantity <= reorder_level AND tenant_id = $1 AND is_active = true ORDER BY quantity ASC',
      [tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching low stock:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch low stock' });
  }
});

// ============================================================
// 🦜 LANGCHAIN BATCH PROCESSING ROUTES
// ============================================================

// POST /api/v1/inventory/ai-batch-analyze (RBAC: Admin or Manager)
router.post('/ai-batch-analyze', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { product_ids } = req.body || {};

    // Validate product_ids if supplied
    if (product_ids !== undefined && product_ids !== null) {
      if (!Array.isArray(product_ids)) {
        return res.status(400).json({ success: false, message: 'product_ids must be an array of product UUIDs.' });
      }
      for (const id of product_ids) {
        if (typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
          return res.status(400).json({ success: false, message: `Invalid product ID "${id}". Expected a valid UUID.` });
        }
      }
    }

    const result = await runInventoryBatchAnalysis(tenantId, product_ids);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('LangChain AI batch analyze error:', error);
    res.status(500).json({ success: false, message: error.message || 'AI Batch Analysis failed' });
  }
});

// POST /api/v1/inventory/ai-batch-apply (RBAC: Admin or Manager)
router.post('/ai-batch-apply', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { updates } = req.body || {};

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'updates must be a non-empty array of product updates.' });
    }

    if (updates.length > 50) {
      return res.status(400).json({ success: false, message: 'Cannot update more than 50 items in a single operation.' });
    }

    // Validate all update items before database execution
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      if (!u || typeof u !== 'object') {
        return res.status(400).json({ success: false, message: `Invalid update object at index ${i}.` });
      }
      if (!u.id || typeof u.id !== 'string' || !UUID_REGEX.test(u.id.trim())) {
        return res.status(400).json({ success: false, message: `Invalid or missing UUID at index ${i}: "${u.id}".` });
      }
      if (u.category !== undefined && u.category !== null) {
        if (typeof u.category !== 'string' || !ALLOWED_CATEGORIES.has(u.category.trim())) {
          return res.status(400).json({
            success: false,
            message: `Invalid category "${u.category}" for item ${u.id}. Allowed categories: ${Array.from(ALLOWED_CATEGORIES).join(', ')}`
          });
        }
      }
      if (u.name !== undefined && u.name !== null) {
        if (typeof u.name !== 'string' || u.name.trim().length === 0) {
          return res.status(400).json({ success: false, message: `Product name for item ${u.id} cannot be empty.` });
        }
        if (u.name.trim().length > 255) {
          return res.status(400).json({ success: false, message: `Product name for item ${u.id} exceeds 255 characters.` });
        }
      }
    }

    const result = await applyBatchUpdates(tenantId, updates);
    res.json(result);
  } catch (error) {
    console.error('LangChain AI batch apply error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to apply AI batch updates' });
  }
});

module.exports = router;

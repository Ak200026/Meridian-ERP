const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { pool, query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const getTenantId = (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId || typeof tenantId !== 'string' || !UUID_REGEX.test(tenantId.trim())) {
    res.status(401).json({ success: false, message: 'Unauthorized: Valid organization tenant context is required.' });
    return null;
  }
  return tenantId.trim();
};

// GET /api/v1/purchase/orders - List purchase orders with tenant isolation
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const result = await query(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.tenant_id = $1
       ORDER BY po.created_at DESC`,
      [tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase orders' });
  }
});

// POST /api/v1/purchase/orders - Create purchase order scoped to tenant
router.post('/orders', verifyToken, requireRole('admin', 'manager', 'purchase'), async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const client = await pool.connect();
  try {
    const { supplier_id, items, expected_date, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Purchase order must have items' });
      }

      // Verify supplier exists and belongs to this tenant if supplier_id is provided
      if (supplier_id) {
        const supCheck = await client.query(
          'SELECT id FROM suppliers WHERE id = $1 AND tenant_id = $2',
          [supplier_id, tenantId]
        );
        if (supCheck.rows.length === 0) {
          return res.status(400).json({ success: false, message: 'Supplier not found or belongs to another tenant' });
        }
      }

      await client.query('BEGIN');

      let totalAmount = 0;
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        const cost = parseFloat(item.unit_cost);

        if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Invalid quantity or unit cost for purchase item' });
        }

        // Verify product belongs to this tenant
        const prodCheck = await client.query(
          'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
          [item.product_id, tenantId]
        );
        if (prodCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Product ${item.product_id} not found in this catalog` });
        }

        totalAmount += qty * cost;
      }

      const id = uuidv4();
      const orderNumber = `PO-${Date.now()}`;

      const result = await client.query(
        `INSERT INTO purchase_orders (id, order_number, supplier_id, total_amount, status, expected_date, notes, created_by, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, NOW()) RETURNING *`,
        [id, orderNumber, supplier_id || null, totalAmount, expected_date || null, notes || '', req.user.id, tenantId]
      );

    for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        const cost = parseFloat(item.unit_cost);
        await client.query(
          `INSERT INTO purchase_order_items (id, order_id, product_id, quantity, unit_cost, total_cost)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), id, item.product_id, qty, cost, qty * cost]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: result.rows[0], message: 'Purchase order created' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating purchase order:', error);
      res.status(500).json({ success: false, message: 'Failed to create purchase order' });
    } finally {
      client.release();
    }
  });

// PATCH /api/v1/purchase/orders/:id/receive - Receive goods and atomically increment stock within tenant
router.patch('/orders/:id/receive', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify order exists, belongs to tenant, and is not already received
    const orderCheck = await client.query(
      'SELECT id, status FROM purchase_orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [req.params.id, tenantId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (orderCheck.rows[0].status === 'received') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Purchase order has already been received' });
    }

    // Get order items
    const items = await client.query('SELECT * FROM purchase_order_items WHERE order_id = $1', [req.params.id]);

    // Update inventory for each item scoped to tenant
    for (const item of items.rows) {
      await client.query(
        'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [item.quantity, item.product_id, tenantId]
      );
    }

    // Update order status to received
    const result = await client.query(
      "UPDATE purchase_orders SET status='received', received_at=NOW(), updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *",
      [req.params.id, tenantId]
    );

await client.query('COMMIT');
res.json({ success: true, data: result.rows[0], message: 'Goods received and inventory updated' });
  } catch (error) {
  await client.query('ROLLBACK');
  console.error('Error receiving purchase order goods:', error);
  res.status(500).json({ success: false, message: 'Failed to receive goods' });
} finally {
  client.release();
}
});

// GET /api/v1/purchase/suppliers - List suppliers for tenant
router.get('/suppliers', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const result = await query(
      'SELECT * FROM suppliers WHERE tenant_id = $1 AND is_active = true ORDER BY name',
      [tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
});

// POST /api/v1/purchase/suppliers - Create supplier scoped to tenant
router.post('/suppliers', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { name, email, phone, address, gst_number } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const id = uuidv4();
    const result = await query(
        `INSERT INTO suppliers (id, name, email, phone, address, gst_number, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [id, name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, address || null, gst_number || null, tenantId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
});

module.exports = router;

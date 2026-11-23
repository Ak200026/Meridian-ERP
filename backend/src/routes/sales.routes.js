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

// GET /api/v1/sales/orders - List orders with strict tenant isolation
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { status, page = 1, limit = 20 } = req.query;

    let sql = `
      SELECT so.*, c.name as customer_name, c.email as customer_email
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.tenant_id = $1
    `;
    const params = [tenantId];

    if (status) {
      sql += ` AND so.status = $${params.length + 1}`;
      params.push(status);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    sql += ` ORDER BY so.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// POST /api/v1/sales/orders - Create new sales order with tenant isolation & transactional inventory verification
router.post('/orders', verifyToken, requireRole('admin', 'manager', 'sales'), async (req, res) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const client = await pool.connect();
  try {
    const { customer_id, items, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
      }

      // Verify customer exists and belongs to this tenant if customer_id is provided
      if (customer_id) {
        const custCheck = await client.query(
          'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2',
          [customer_id, tenantId]
        );
        if (custCheck.rows.length === 0) {
          return res.status(400).json({ success: false, message: 'Customer not found or belongs to another tenant' });
        }
      }

      // Start SQL transaction
      await client.query('BEGIN');

      // Calculate total and verify product ownership and stock availability
      let totalAmount = 0;
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        const price = parseFloat(item.unit_price);

        if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Invalid quantity or unit price for ordered item' });
        }

        // Check product belongs to tenant and has sufficient stock
        const prodCheck = await client.query(
          'SELECT id, name, quantity FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
          [item.product_id, tenantId]
        );

        if (prodCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Product ${item.product_id} not found in this catalog` });
        }

        const availableStock = prodCheck.rows[0].quantity;
        if (availableStock < qty) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${prodCheck.rows[0].name}". Requested: ${qty}, In Stock: ${availableStock}`
          });
        }

        totalAmount += qty * price;
      }

      const orderId = uuidv4();
      const orderNumber = `SO-${Date.now()}`;

      // 1. Create the sales order with tenant_id
      const orderResult = await client.query(
      `INSERT INTO sales_orders (id, order_number, customer_id, total_amount, status, notes, created_by, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, NOW()) RETURNING *`,
        [orderId, orderNumber, customer_id || null, totalAmount, notes || '', req.user.id, tenantId]
    );

    // 2. Create order items and reduce stock
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const price = parseFloat(item.unit_price);
      const itemTotal = qty * price;

      await client.query(
        `INSERT INTO sales_order_items(id, order_id, product_id, quantity, unit_price, total_price)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), orderId, item.product_id, qty, price, itemTotal]
      );

      // 3. Atomically reduce inventory quantity within tenant
      await client.query(
        `UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [qty, item.product_id, tenantId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: orderResult.rows[0], message: 'Order created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sales order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// PATCH /api/v1/sales/orders/:id/status - Update order status scoped to tenant
router.patch('/orders/:id/status', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await query(
      'UPDATE sales_orders SET status=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *',
      [status, req.params.id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// GET /api/v1/sales/customers - List customers for tenant
router.get('/customers', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const result = await query(
      'SELECT * FROM customers WHERE tenant_id = $1 AND is_active = true ORDER BY name',
      [tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

// POST /api/v1/sales/customers - Create new customer scoped to tenant
router.post('/customers', verifyToken, requireRole('admin', 'manager', 'sales'), async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { name, email, phone, address, gst_number } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO customers(id, name, email, phone, address, gst_number, tenant_id, created_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING * `,
      [id, name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, address || null, gst_number || null, tenantId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
});

module.exports = router;

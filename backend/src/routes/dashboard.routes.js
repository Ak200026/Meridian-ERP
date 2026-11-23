const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { query } = require('../config/database');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const getTenantId = (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId || typeof tenantId !== 'string' || !UUID_REGEX.test(tenantId.trim())) {
    res.status(401).json({ success: false, message: 'Unauthorized: Valid organization tenant context is required.' });
    return null;
  }
  return tenantId.trim();
};

// GET /api/v1/dashboard/stats
// Returns summary metrics for the ERP dashboard scoped to tenant
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    // Run all tenant-scoped queries in parallel
    const [products, lowStock, orders, revenue, recentOrders] = await Promise.all([
      query('SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND is_active = true', [tenantId]),
      query('SELECT COUNT(*) as count FROM products WHERE quantity <= reorder_level AND tenant_id = $1 AND is_active = true', [tenantId]),
      query("SELECT COUNT(*) as count FROM sales_orders WHERE DATE(created_at) = CURRENT_DATE AND tenant_id = $1", [tenantId]),
      query("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales_orders WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND tenant_id = $1", [tenantId]),
      query(`
        SELECT so.id, so.order_number, so.total_amount, so.status, so.created_at,
               c.name as customer_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.tenant_id = $1
        ORDER BY so.created_at DESC LIMIT 5
        `, [tenantId])
    ]);

    res.json({
      success: true,
      data: {
        totalProducts: parseInt(products.rows[0].count, 10),
        lowStockItems: parseInt(lowStock.rows[0].count, 10),
        todaysOrders: parseInt(orders.rows[0].count, 10),
        monthlyRevenue: parseFloat(revenue.rows[0].total),
        recentOrders: recentOrders.rows
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/v1/dashboard/charts
// Returns chart data for revenue and inventory trends scoped to tenant
router.get('/charts', verifyToken, async (req, res) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const [monthlyRevenue, categoryStock] = await Promise.all([
      query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
      SUM(total_amount) as revenue,
      COUNT(*) as orders
        FROM sales_orders
        WHERE created_at >= NOW() - INTERVAL '6 months' AND tenant_id = $1
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `, [tenantId]),
      query(`
        SELECT category, SUM(quantity) as total_stock, COUNT(*) as items
        FROM products
        WHERE tenant_id = $1 AND is_active = true
        GROUP BY category
        ORDER BY total_stock DESC
        LIMIT 6
        `, [tenantId])
    ]);

    res.json({
      success: true,
      data: {
        monthlyRevenue: monthlyRevenue.rows,
        categoryStock: categoryStock.rows
      }
    });
  } catch (error) {
    console.error('Charts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chart data' });
  }
});

module.exports = router;

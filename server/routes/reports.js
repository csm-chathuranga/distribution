const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

router.get('/sales-summary', authorize('reports.sales'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const result = await sequelize.query(`
      SELECT DATE(i.invoice_date) AS date,
        COUNT(i.id) AS invoice_count,
        SUM(i.subtotal) AS subtotal,
        SUM(i.vat_amount) AS vat,
        SUM(i.total_amount) AS total,
        SUM(i.paid_amount) AS collected,
        SUM(i.balance_due) AS outstanding
      FROM invoices i
      WHERE i.status IN ('POSTED','PAID','PARTIAL')
        ${from ? 'AND i.invoice_date >= :from' : ''}
        ${to ? 'AND i.invoice_date <= :to' : ''}
      GROUP BY DATE(i.invoice_date)
      ORDER BY date DESC
    `, { type: QueryTypes.SELECT, replacements: { from, to } });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/aged-debtors', authorize('reports.finance'), async (req, res, next) => {
  try {
    const result = await sequelize.query(`
      SELECT c.id, c.name, c.code, c.credit_days,
        SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) <= 0 THEN i.balance_due ELSE 0 END) AS current_amount,
        SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 1 AND 30 THEN i.balance_due ELSE 0 END) AS days_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END) AS days_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END) AS days_90,
        SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) > 90 THEN i.balance_due ELSE 0 END) AS over_90,
        SUM(i.balance_due) AS total_outstanding
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id
      WHERE i.status IN ('POSTED','PARTIAL','OVERDUE') AND i.balance_due > 0
      GROUP BY c.id
      ORDER BY total_outstanding DESC
    `, { type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/stock-movement', authorize('reports.inventory'), async (req, res, next) => {
  try {
    const { warehouse_id, product_id, from, to } = req.query;
    const result = await sequelize.query(`
      SELECT sm.created_at, sm.movement_type, sm.quantity, sm.balance_after, sm.unit_cost,
        p.sku, p.name AS product_name, w.name AS warehouse_name, sm.source_type
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      JOIN warehouses w ON w.id = sm.warehouse_id
      WHERE 1=1
        ${warehouse_id ? 'AND sm.warehouse_id = :warehouse_id' : ''}
        ${product_id ? 'AND sm.product_id = :product_id' : ''}
        ${from ? 'AND DATE(sm.created_at) >= :from' : ''}
        ${to ? 'AND DATE(sm.created_at) <= :to' : ''}
      ORDER BY sm.created_at DESC
      LIMIT 500
    `, { type: QueryTypes.SELECT, replacements: { warehouse_id, product_id, from, to } });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/profit-loss', authorize('reports.finance'), async (req, res, next) => {
  try {
    const { period_id } = req.query;
    const result = await sequelize.query(`
      SELECT a.type, a.name, a.code,
        COALESCE(SUM(jl.debit),0) AS total_debit,
        COALESCE(SUM(jl.credit),0) AS total_credit
      FROM accounts a
      LEFT JOIN journal_lines jl ON jl.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jl.journal_id ${period_id ? 'AND je.period_id = :period_id' : ''}
      WHERE a.type IN ('REVENUE','EXPENSE','COGS')
      GROUP BY a.id
      ORDER BY a.type, a.code
    `, { type: QueryTypes.SELECT, replacements: { period_id } });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/low-stock', authorize('reports.inventory'), async (req, res, next) => {
  try {
    const result = await sequelize.query(`
      SELECT p.id, p.sku, p.name, p.reorder_point, s.quantity, w.name AS warehouse
      FROM stock s
      JOIN products p ON p.id = s.product_id
      JOIN warehouses w ON w.id = s.warehouse_id
      WHERE s.quantity <= p.reorder_point AND p.reorder_point > 0
      ORDER BY s.quantity ASC
    `, { type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/vat-summary', authorize('reports.finance'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = (col) =>
      (from ? `AND ${col} >= :from` : '') + (to ? ` AND ${col} <= :to` : '');
    const [outputRows, inputRows] = await Promise.all([
      sequelize.query(`
        SELECT DATE_FORMAT(invoice_date, '%Y-%m') AS month,
          SUM(vat_amount) AS output_vat, SUM(subtotal) AS subtotal, SUM(total_amount) AS total
        FROM invoices
        WHERE status IN ('POSTED','PARTIAL','PAID','OVERDUE')
          AND invoice_type != 'CREDIT_NOTE'
          ${dateFilter('invoice_date')}
        GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
        ORDER BY month DESC
      `, { type: QueryTypes.SELECT, replacements: { from, to } }),
      sequelize.query(`
        SELECT DATE_FORMAT(grn_date, '%Y-%m') AS month, SUM(vat_amount) AS input_vat
        FROM goods_received
        WHERE status = 'POSTED'
          ${dateFilter('grn_date')}
        GROUP BY DATE_FORMAT(grn_date, '%Y-%m')
      `, { type: QueryTypes.SELECT, replacements: { from, to } }),
    ]);
    const months = [...new Set([...outputRows.map(r => r.month), ...inputRows.map(r => r.month)])].sort().reverse();
    const result = months.map(month => {
      const out = outputRows.find(r => r.month === month) || {};
      const inp = inputRows.find(r => r.month === month) || {};
      return {
        month,
        subtotal: parseFloat(out.subtotal || 0),
        output_vat: parseFloat(out.output_vat || 0),
        input_vat: parseFloat(inp.input_vat || 0),
        net_vat: parseFloat(out.output_vat || 0) - parseFloat(inp.input_vat || 0),
      };
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/customer-statement/:customerId', authorize('reports.finance'), async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { from, to } = req.query;
    const [invoices, receipts] = await Promise.all([
      sequelize.query(`
        SELECT id, invoice_number AS reference, invoice_date AS date,
          total_amount AS debit, 0 AS credit, invoice_type, status, balance_due
        FROM invoices
        WHERE customer_id = :cid AND status IN ('POSTED','PARTIAL','PAID','OVERDUE')
          ${from ? 'AND invoice_date >= :from' : ''}
          ${to ? 'AND invoice_date <= :to' : ''}
        ORDER BY invoice_date
      `, { type: QueryTypes.SELECT, replacements: { cid: customerId, from, to } }),
      sequelize.query(`
        SELECT id, receipt_number AS reference, receipt_date AS date,
          0 AS debit, total_amount AS credit, 'RECEIPT' AS invoice_type, status, 0 AS balance_due
        FROM receipts
        WHERE customer_id = :cid
          ${from ? 'AND receipt_date >= :from' : ''}
          ${to ? 'AND receipt_date <= :to' : ''}
        ORDER BY receipt_date
      `, { type: QueryTypes.SELECT, replacements: { cid: customerId, from, to } }),
    ]);
    const rows = [...invoices, ...receipts].sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    const result = rows.map(r => {
      balance += parseFloat(r.debit || 0) - parseFloat(r.credit || 0);
      return { ...r, running_balance: balance };
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/product-profitability', authorize('reports.finance'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const result = await sequelize.query(`
      SELECT p.id, p.sku, p.name,
        SUM(il.quantity) AS qty_sold,
        SUM(il.line_total) AS revenue,
        SUM(il.quantity * il.cost_price) AS cost,
        SUM(il.line_total) - SUM(il.quantity * il.cost_price) AS gross_profit,
        ROUND((SUM(il.line_total) - SUM(il.quantity * il.cost_price)) / NULLIF(SUM(il.line_total),0) * 100, 2) AS gp_pct
      FROM invoice_lines il
      JOIN invoices i ON i.id = il.invoice_id
      JOIN products p ON p.id = il.product_id
      WHERE i.status IN ('POSTED','PARTIAL','PAID','OVERDUE')
        AND i.invoice_type != 'CREDIT_NOTE'
        ${from ? 'AND i.invoice_date >= :from' : ''}
        ${to ? 'AND i.invoice_date <= :to' : ''}
      GROUP BY p.id
      ORDER BY gross_profit DESC
    `, { type: QueryTypes.SELECT, replacements: { from, to } });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/reorder-suggestions', authorize('reports.inventory'), async (req, res, next) => {
  try {
    const result = await sequelize.query(`
      SELECT p.id, p.sku, p.name, p.reorder_point, p.reorder_quantity,
        s.quantity AS current_stock, w.id AS warehouse_id, w.name AS warehouse,
        COALESCE(sales.avg_monthly, 0) AS avg_monthly_sales,
        GREATEST(p.reorder_quantity, ROUND(COALESCE(sales.avg_monthly, 0) * 3 - s.quantity, 0)) AS suggested_order
      FROM stock s
      JOIN products p ON p.id = s.product_id
      JOIN warehouses w ON w.id = s.warehouse_id
      LEFT JOIN (
        SELECT il.product_id, SUM(il.quantity) / 3 AS avg_monthly
        FROM invoice_lines il
        JOIN invoices i ON i.id = il.invoice_id
        WHERE i.status IN ('POSTED','PARTIAL','PAID','OVERDUE')
          AND i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        GROUP BY il.product_id
      ) sales ON sales.product_id = p.id
      WHERE s.quantity <= p.reorder_point AND p.reorder_point > 0
      ORDER BY s.quantity ASC
    `, { type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/sales-rep-kpi', authorize('reports.sales'), async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentDate = new Date();
    const y = year || currentDate.getFullYear();
    const m = month || (currentDate.getMonth() + 1);
    const result = await sequelize.query(`
      SELECT u.id, u.name AS rep_name, u.email,
        COUNT(i.id) AS invoice_count,
        COALESCE(SUM(i.total_amount), 0) AS total_sales,
        COALESCE(SUM(i.paid_amount), 0) AS collected,
        COUNT(DISTINCT i.customer_id) AS customers_served
      FROM users u
      LEFT JOIN invoices i ON i.sales_rep_id = u.id
        AND YEAR(i.invoice_date) = :year
        AND MONTH(i.invoice_date) = :month
        AND i.status IN ('POSTED','PARTIAL','PAID','OVERDUE')
      WHERE u.company_id = :company_id
      GROUP BY u.id
      ORDER BY total_sales DESC
    `, { type: QueryTypes.SELECT, replacements: { year: y, month: m, company_id: 1 } });
    res.json(result);
  } catch (err) { next(err); }
});

// ── Stock × Price Matrix ─────────────────────────────────────────
router.get('/stock-matrix', authorize('reports.inventory'), async (req, res, next) => {
  try {
    const rows = await sequelize.query(`
      SELECT p.id AS product_id, p.sku, p.name, p.selling_price, p.cost_price,
             p.reorder_point, p.reorder_quantity, p.is_active,
             w.id AS warehouse_id, w.name AS warehouse_name,
             COALESCE(s.quantity, 0) AS quantity
      FROM products p
      CROSS JOIN warehouses w
      LEFT JOIN stock s ON s.product_id = p.id AND s.warehouse_id = w.id
      WHERE p.is_active = 1
      ORDER BY p.name ASC, w.name ASC
    `, { type: QueryTypes.SELECT });

    // Pivot: group by product, warehouses as columns
    const warehouseMap = {};
    const productMap = {};
    rows.forEach(r => {
      warehouseMap[r.warehouse_id] = r.warehouse_name;
      if (!productMap[r.product_id]) {
        productMap[r.product_id] = {
          id: r.product_id, sku: r.sku, name: r.name,
          selling_price: r.selling_price, cost_price: r.cost_price,
          reorder_point: r.reorder_point, stock: {},
        };
      }
      productMap[r.product_id].stock[r.warehouse_id] = Number(r.quantity);
    });

    res.json({
      warehouses: Object.entries(warehouseMap).map(([id, name]) => ({ id: Number(id), name })),
      products: Object.values(productMap),
    });
  } catch (err) { next(err); }
});

// ── Fast / Slow Movers ───────────────────────────────────────────
router.get('/fast-movers', authorize('reports.sales'), async (req, res, next) => {
  try {
    const { days = 30, limit = 20 } = req.query;
    const rows = await sequelize.query(`
      SELECT p.id, p.sku, p.name,
        SUM(il.quantity)   AS units_sold,
        SUM(il.line_total) AS revenue,
        COUNT(DISTINCT i.id) AS invoice_count,
        COUNT(DISTINCT i.customer_id) AS customers,
        SUM(il.quantity * il.cost_price) AS cost,
        ROUND((SUM(il.line_total) - SUM(il.quantity * il.cost_price)) / NULLIF(SUM(il.line_total),0) * 100, 1) AS gp_pct
      FROM invoice_lines il
      JOIN invoices i ON i.id = il.invoice_id
      JOIN products  p ON p.id = il.product_id
      WHERE i.status IN ('POSTED','PARTIAL','PAID','OVERDUE')
        AND i.invoice_type != 'CREDIT_NOTE'
        AND i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT :lim
    `, { type: QueryTypes.SELECT, replacements: { days: Number(days), lim: Number(limit) } });
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Best Routes ──────────────────────────────────────────────────
router.get('/best-routes', authorize('reports.sales'), async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const rows = await sequelize.query(`
      SELECT r.id, r.name AS route_name,
        COALESCE(u.name,'Unassigned') AS sales_rep,
        COUNT(DISTINCT i.id)          AS invoice_count,
        COUNT(DISTINCT i.customer_id) AS customers_served,
        COALESCE(SUM(i.total_amount),0) AS total_sales,
        COALESCE(SUM(i.paid_amount),0)  AS collected,
        COALESCE(SUM(i.balance_due),0)  AS outstanding,
        COALESCE(SUM(il.quantity),0)    AS units_sold
      FROM routes r
      LEFT JOIN users u ON u.id = r.sales_rep_id
      LEFT JOIN customers c ON c.route_id = r.id
      LEFT JOIN invoices i ON i.customer_id = c.id
        AND i.status IN ('POSTED','PARTIAL','PAID','OVERDUE')
        AND i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
      LEFT JOIN invoice_lines il ON il.invoice_id = i.id
      GROUP BY r.id
      ORDER BY total_sales DESC
    `, { type: QueryTypes.SELECT, replacements: { days: Number(days) } });
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Customer Ranking ─────────────────────────────────────────────
router.get('/customer-ranking', authorize('reports.sales'), async (req, res, next) => {
  try {
    const { days = 90 } = req.query;
    const rows = await sequelize.query(`
      SELECT c.id, c.name, c.code, c.customer_type, c.credit_limit,
        COALESCE(r.route_name,'—') AS route,
        COUNT(DISTINCT i.id)          AS invoice_count,
        COALESCE(SUM(i.total_amount),0) AS total_sales,
        COALESCE(SUM(i.paid_amount),0)  AS collected,
        COALESCE(SUM(i.balance_due),0)  AS outstanding,
        MAX(i.invoice_date)             AS last_invoice_date
      FROM customers c
      LEFT JOIN (SELECT id, name FROM routes) r ON r.id = c.route_id
      LEFT JOIN invoices i ON i.customer_id = c.id
        AND i.status IN ('POSTED','PARTIAL','PAID','OVERDUE')
        AND i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY total_sales DESC
    `, { type: QueryTypes.SELECT, replacements: { days: Number(days) } });
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/aged-creditors', authorize('reports.finance'), async (req, res, next) => {
  try {
    const result = await sequelize.query(`
      SELECT
        s.id, s.name, s.code, s.credit_days,
        SUM(CASE WHEN DATEDIFF(CURDATE(), g.grn_date) <= 30
          THEN (g.total_amount - COALESCE(pa.paid, 0)) ELSE 0 END) AS current_amount,
        SUM(CASE WHEN DATEDIFF(CURDATE(), g.grn_date) BETWEEN 31 AND 60
          THEN (g.total_amount - COALESCE(pa.paid, 0)) ELSE 0 END) AS days_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), g.grn_date) BETWEEN 61 AND 90
          THEN (g.total_amount - COALESCE(pa.paid, 0)) ELSE 0 END) AS days_90,
        SUM(CASE WHEN DATEDIFF(CURDATE(), g.grn_date) > 90
          THEN (g.total_amount - COALESCE(pa.paid, 0)) ELSE 0 END) AS over_90,
        SUM(g.total_amount - COALESCE(pa.paid, 0))                  AS total_outstanding,
        COUNT(g.id)                                                  AS grn_count
      FROM suppliers s
      JOIN goods_received g ON g.supplier_id = s.id AND g.status = 'POSTED'
      LEFT JOIN (
        SELECT grn_id, SUM(allocated_amount) AS paid
        FROM payment_allocations
        GROUP BY grn_id
      ) pa ON pa.grn_id = g.id
      WHERE (g.total_amount - COALESCE(pa.paid, 0)) > 0.001
      GROUP BY s.id
      ORDER BY total_outstanding DESC
    `, { type: QueryTypes.SELECT });
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;

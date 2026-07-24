const router = require('express').Router();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

router.get('/', async (req, res, next) => {
  try {
    const [sales, collections, stock, topProducts, statusDist, monthlyTrend] = await Promise.all([
      sequelize.query(`
        SELECT
          SUM(CASE WHEN DATE(invoice_date) = CURDATE() THEN total_amount ELSE 0 END) AS today,
          SUM(CASE WHEN YEARWEEK(invoice_date,1) = YEARWEEK(CURDATE(),1) THEN total_amount ELSE 0 END) AS this_week,
          SUM(CASE WHEN MONTH(invoice_date) = MONTH(CURDATE()) AND YEAR(invoice_date) = YEAR(CURDATE()) THEN total_amount ELSE 0 END) AS this_month,
          COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) AS overdue_count,
          SUM(CASE WHEN status IN ('POSTED','PARTIAL','OVERDUE') THEN balance_due ELSE 0 END) AS total_outstanding
        FROM invoices WHERE status != 'CANCELLED'
      `, { type: QueryTypes.SELECT }),

      sequelize.query(`
        SELECT SUM(CASE WHEN DATE(receipt_date) = CURDATE() THEN amount ELSE 0 END) AS today,
          SUM(CASE WHEN MONTH(receipt_date) = MONTH(CURDATE()) THEN amount ELSE 0 END) AS this_month
        FROM receipts WHERE status = 'POSTED'
      `, { type: QueryTypes.SELECT }),

      sequelize.query(`
        SELECT COUNT(*) AS low_stock_count FROM stock s
        JOIN products p ON p.id = s.product_id
        WHERE s.quantity <= p.reorder_point AND p.reorder_point > 0
      `, { type: QueryTypes.SELECT }),

      sequelize.query(`
        SELECT p.name, SUM(il.quantity) AS qty_sold, SUM(il.line_total) AS revenue
        FROM invoice_lines il JOIN products p ON p.id = il.product_id
        JOIN invoices i ON i.id = il.invoice_id
        WHERE MONTH(i.invoice_date) = MONTH(CURDATE()) AND i.status != 'CANCELLED'
        GROUP BY il.product_id ORDER BY revenue DESC LIMIT 5
      `, { type: QueryTypes.SELECT }),

      sequelize.query(`
        SELECT status, COUNT(*) AS count FROM invoices
        WHERE status != 'CANCELLED'
        GROUP BY status
      `, { type: QueryTypes.SELECT }),

      sequelize.query(`
        SELECT m.month,
          COALESCE(s.sales, 0) AS sales,
          COALESCE(c.collected, 0) AS collected
        FROM (
          SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month
          FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) nums
        ) m
        LEFT JOIN (
          SELECT DATE_FORMAT(invoice_date, '%Y-%m') AS month, SUM(total_amount) AS sales
          FROM invoices WHERE status != 'CANCELLED'
            AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
        ) s ON s.month = m.month
        LEFT JOIN (
          SELECT DATE_FORMAT(receipt_date, '%Y-%m') AS month, SUM(amount) AS collected
          FROM receipts WHERE status = 'POSTED'
            AND receipt_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(receipt_date, '%Y-%m')
        ) c ON c.month = m.month
        ORDER BY m.month ASC
      `, { type: QueryTypes.SELECT }),
    ]);

    res.json({
      sales: sales[0],
      collections: collections[0],
      stock: stock[0],
      top_products: topProducts,
      status_dist: statusDist,
      monthly_trend: monthlyTrend,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/trend?days=30
router.get('/trend', async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const rows = await sequelize.query(`
      SELECT
        DATE(invoice_date) AS date,
        SUM(total_amount) AS sales,
        COUNT(*) AS count
      FROM invoices
      WHERE status != 'CANCELLED'
        AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
      GROUP BY DATE(invoice_date)
      ORDER BY date ASC
    `, { replacements: { days }, type: QueryTypes.SELECT });
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;

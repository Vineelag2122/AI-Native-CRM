import pool from '../config/db.js';

// Get analytics for all customers (for user)
export const getCustomerAnalytics = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.email,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_spend,
        COALESCE(AVG(o.amount), 0) as average_order_value,
        MAX(o.order_date) as last_purchase_date,
        c.signup_date,
        c.city
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.name, c.email, c.signup_date, c.city
       ORDER BY total_spend DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get analytics for single customer
export const getCustomerAnalyticsDetail = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
      [customerId, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.city,
        c.gender,
        c.signup_date,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_spend,
        COALESCE(AVG(o.amount), 0) as average_order_value,
        COALESCE(MIN(o.order_date), NULL) as first_purchase_date,
        COALESCE(MAX(o.order_date), NULL) as last_purchase_date,
        EXTRACT(DAY FROM NOW() - MAX(o.order_date)) as days_since_last_purchase,
        array_agg(DISTINCT o.product_category) FILTER (WHERE o.product_category IS NOT NULL) as product_categories
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.id = $1
       GROUP BY c.id, c.name, c.email, c.phone, c.city, c.gender, c.signup_date`,
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer analytics detail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get top customers by spend
export const getTopCustomers = async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const result = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.email,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_spend,
        COALESCE(AVG(o.amount), 0) as average_order_value,
        MAX(o.order_date) as last_purchase_date
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.name, c.email
       ORDER BY total_spend DESC
       LIMIT $2`,
      [req.userId, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get inactive customers (no purchase in last N days)
export const getInactiveCustomers = async (req, res) => {
  try {
    const days = req.query.days || 60;

    const result = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.email,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_spend,
        MAX(o.order_date) as last_purchase_date,
        EXTRACT(DAY FROM NOW() - MAX(o.order_date)) as days_since_purchase
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.name, c.email
       HAVING MAX(o.order_date) IS NULL OR MAX(o.order_date) < NOW() - INTERVAL '1 day' * $2
       ORDER BY days_since_purchase DESC NULLS FIRST`,
      [req.userId, days]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get inactive customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customers by spend range
export const getCustomersBySpend = async (req, res) => {
  try {
    const { minSpend, maxSpend } = req.query;

    if (!minSpend || !maxSpend) {
      return res
        .status(400)
        .json({ message: 'minSpend and maxSpend are required' });
    }

    const result = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.email,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_spend,
        COALESCE(AVG(o.amount), 0) as average_order_value
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.name, c.email
       HAVING COALESCE(SUM(o.amount), 0) >= $2 AND COALESCE(SUM(o.amount), 0) <= $3
       ORDER BY total_spend DESC`,
      [req.userId, minSpend, maxSpend]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get customers by spend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customer lifetime value distribution
export const getAnalyticsSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.amount), 0) as total_revenue,
        COALESCE(AVG(o.amount), 0) as avg_order_value,
        COALESCE(MAX(o.amount), 0) as max_order_value,
        COALESCE(MIN(o.amount), 0) as min_order_value,
        ROUND(COALESCE(AVG(customer_spend.total_spend), 0), 2) as avg_customer_ltv
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       LEFT JOIN (
         SELECT customer_id, SUM(amount) as total_spend
         FROM orders
         GROUP BY customer_id
       ) customer_spend ON c.id = customer_spend.customer_id
       WHERE c.user_id = $1`,
      [req.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

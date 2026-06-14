import pool from '../config/db.js';
import { updateCampaignAnalytics } from './communications.js';

// Get all orders for a user
export const getOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.order_id_external, c.name as customer_name, o.customer_id,
              o.amount, o.order_date, o.product_category, o.created_at
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.user_id = $1
       ORDER BY o.order_date DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get orders for specific customer
export const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Verify customer belongs to user
    const customerCheck = await pool.query(
      'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
      [customerId, req.userId]
    );

    if (customerCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      `SELECT id, order_id_external, amount, order_date, product_category, created_at
       FROM orders WHERE customer_id = $1 AND user_id = $2
       ORDER BY order_date DESC`,
      [customerId, req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single order
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT o.id, o.order_id_external, o.customer_id, c.name as customer_name,
              o.amount, o.order_date, o.product_category, o.created_at
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add order
export const addOrder = async (req, res) => {
  try {
    const { customer_id, order_id_external, amount, order_date, product_category } = req.body;

    if (!customer_id || !order_id_external || !amount || !order_date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify customer belongs to user
    const customerCheck = await pool.query(
      'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
      [customer_id, req.userId]
    );

    if (customerCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Customer not found' });
    }

    const result = await pool.query(
      `INSERT INTO orders (user_id, customer_id, order_id_external, amount, order_date, product_category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, order_id_external, customer_id, amount, order_date, product_category`,
      [req.userId, customer_id, order_id_external, amount, order_date, product_category]
    );

    const orderId = result.rows[0].id;

    // Attribution Logic: Link order to most recent clicked campaign communication
    try {
      const clickResult = await pool.query(
        `SELECT id, campaign_id FROM communications
         WHERE customer_id = $1 AND status = 'clicked' AND converted = false
           AND clicked_at <= $2::timestamp AND clicked_at >= $2::timestamp - INTERVAL '7 days'
         ORDER BY clicked_at DESC LIMIT 1`,
        [customer_id, order_date]
      );

      if (clickResult.rows.length > 0) {
        const commId = clickResult.rows[0].id;
        const campaignId = clickResult.rows[0].campaign_id;

        console.log(`[Attribution] Linking order ${orderId} to communication ${commId} for campaign ${campaignId}`);

        await pool.query(
          `UPDATE communications
           SET converted = true, status = 'converted', conversion_order_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [orderId, commId]
        );

        // Update campaign analytics
        await updateCampaignAnalytics(campaignId);
      }
    } catch (attrError) {
      console.error('Attribution processing error:', attrError);
    }

    res.status(201).json({
      message: 'Order added successfully',
      order: result.rows[0],
    });
  } catch (error) {
    console.error('Add order error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Order ID already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit order
export const editOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, order_date, product_category } = req.body;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE orders
       SET amount = COALESCE($1, amount),
           order_date = COALESCE($2, order_date),
           product_category = COALESCE($3, product_category),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING id, order_id_external, customer_id, amount, order_date, product_category`,
      [amount, order_date, product_category, id, req.userId]
    );

    res.json({
      message: 'Order updated successfully',
      order: result.rows[0],
    });
  } catch (error) {
    console.error('Edit order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('DELETE FROM orders WHERE id = $1', [id]);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

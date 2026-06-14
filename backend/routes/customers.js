import pool from '../config/db.js';

// Get all customers for a user
export const getCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, city, gender, signup_date, created_at
       FROM customers WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single customer
export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, email, phone, city, gender, signup_date, created_at
       FROM customers WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add customer
export const addCustomer = async (req, res) => {
  try {
    const { name, email, phone, city, gender } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const result = await pool.query(
      `INSERT INTO customers (user_id, name, email, phone, city, gender, signup_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, email, phone, city, gender, signup_date`,
      [req.userId, name, email, phone, city, gender]
    );

    res.status(201).json({
      message: 'Customer added successfully',
      customer: result.rows[0],
    });
  } catch (error) {
    console.error('Add customer error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Email already exists for this customer' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit customer
export const editCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, city, gender } = req.body;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE customers
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           city = COALESCE($4, city),
           gender = COALESCE($5, gender),
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, name, email, phone, city, gender, signup_date`,
      [name, email, phone, city, gender, id, req.userId]
    );

    res.json({
      message: 'Customer updated successfully',
      customer: result.rows[0],
    });
  } catch (error) {
    console.error('Edit customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete customer
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('DELETE FROM customers WHERE id = $1', [id]);

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

import pool from '../config/db.js';

// Get all segments for user
export const getSegments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, segment_type, filters, created_at, updated_at
       FROM segments WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get segments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single segment with members
export const getSegment = async (req, res) => {
  try {
    const { id } = req.params;

    const segmentResult = await pool.query(
      `SELECT id, name, description, segment_type, filters, created_at
       FROM segments WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (segmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Segment not found' });
    }

    const membersResult = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, c.city
       FROM segment_members sm
       JOIN customers c ON sm.customer_id = c.id
       WHERE sm.segment_id = $1`,
      [id]
    );

    res.json({
      ...segmentResult.rows[0],
      members: membersResult.rows,
      member_count: membersResult.rows.length,
    });
  } catch (error) {
    console.error('Get segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create segment with filters
export const createSegment = async (req, res) => {
  try {
    const { name, description, filters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({ message: 'Name and filters are required' });
    }

    // Insert segment
    const segmentResult = await pool.query(
      `INSERT INTO segments (user_id, name, description, filters, segment_type)
       VALUES ($1, $2, $3, $4, 'manual')
       RETURNING id, name, description, filters`,
      [req.userId, name, description, JSON.stringify(filters)]
    );

    const segmentId = segmentResult.rows[0].id;

    // Apply filters to find matching customers
    const matchingCustomers = await applyFilters(req.userId, filters);

    // Insert segment members
    for (const customerId of matchingCustomers) {
      await pool.query(
        `INSERT INTO segment_members (segment_id, customer_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [segmentId, customerId]
      );
    }

    res.status(201).json({
      message: 'Segment created successfully',
      segment: {
        ...segmentResult.rows[0],
        member_count: matchingCustomers.length,
      },
    });
  } catch (error) {
    console.error('Create segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update segment
export const updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, filters } = req.body;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM segments WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update segment
    const result = await pool.query(
      `UPDATE segments
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           filters = COALESCE($3, filters),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING id, name, description, filters`,
      [name, description, filters ? JSON.stringify(filters) : null, id, req.userId]
    );

    // If filters changed, recompute members
    if (filters) {
      // Clear old members
      await pool.query('DELETE FROM segment_members WHERE segment_id = $1', [id]);

      // Find and add new members
      const matchingCustomers = await applyFilters(req.userId, filters);
      for (const customerId of matchingCustomers) {
        await pool.query(
          `INSERT INTO segment_members (segment_id, customer_id) VALUES ($1, $2)`,
          [id, customerId]
        );
      }
    }

    res.json({
      message: 'Segment updated successfully',
      segment: result.rows[0],
    });
  } catch (error) {
    console.error('Update segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete segment
export const deleteSegment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM segments WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete segment members first
    await pool.query('DELETE FROM segment_members WHERE segment_id = $1', [id]);

    // Delete segment
    await pool.query('DELETE FROM segments WHERE id = $1', [id]);

    res.json({ message: 'Segment deleted successfully' });
  } catch (error) {
    console.error('Delete segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Test segment filters (preview customers)
export const previewSegment = async (req, res) => {
  try {
    const { filters } = req.body;

    if (!filters) {
      return res.status(400).json({ message: 'Filters are required' });
    }

    const matchingCustomers = await applyFilters(req.userId, filters);

    // Get customer details
    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, c.city,
              COUNT(o.id) as order_count,
              COALESCE(SUM(o.amount), 0) as total_spend
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.user_id = $1 AND c.id = ANY($2)
       GROUP BY c.id, c.name, c.email, c.phone, c.city`,
      [req.userId, matchingCustomers]
    );

    res.json({
      total_count: result.rows.length,
      preview: result.rows.slice(0, 10),
    });
  } catch (error) {
    console.error('Preview segment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to apply filters
async function applyFilters(userId, filters) {
  // Build SQL query based on filters using a CTE to safely aggregate and filter
  // Filters format: { condition: 'AND', filters: [{field, operator, value}, ...] }

  let query = `
    WITH customer_stats AS (
      SELECT 
        c.id,
        c.user_id,
        c.city,
        c.gender,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.amount), 0) as total_spend,
        EXTRACT(DAY FROM NOW() - MAX(o.order_date)) as last_purchase_days
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.user_id = $1
      GROUP BY c.id
    )
    SELECT id FROM customer_stats
  `;

  const params = [userId];
  let paramIndex = 2;

  function buildFilterClause(filterGroup) {
    const condition = filterGroup.condition || 'AND';
    const clauses = [];

    for (const filter of filterGroup.filters) {
      if (filter.filters) {
        // Nested filter group
        clauses.push(`(${buildFilterClause(filter)})`);
      } else {
        // Individual filter
        const { field, operator, value } = filter;

        if (field === 'total_spend') {
          if (operator === '>') {
            clauses.push(`total_spend > $${paramIndex}`);
          } else if (operator === '<') {
            clauses.push(`total_spend < $${paramIndex}`);
          } else if (operator === '=') {
            clauses.push(`total_spend = $${paramIndex}`);
          }
          params.push(value);
          paramIndex++;
        } else if (field === 'order_count') {
          if (operator === '>') {
            clauses.push(`order_count > $${paramIndex}`);
          } else if (operator === '<') {
            clauses.push(`order_count < $${paramIndex}`);
          } else if (operator === '=') {
            clauses.push(`order_count = $${paramIndex}`);
          }
          params.push(value);
          paramIndex++;
        } else if (field === 'last_purchase_days') {
          if (operator === '>') {
            clauses.push(`last_purchase_days > $${paramIndex}`);
          } else if (operator === '<') {
            clauses.push(`last_purchase_days < $${paramIndex}`);
          }
          params.push(value);
          paramIndex++;
        } else if (field === 'city') {
          clauses.push(`city = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        } else if (field === 'gender') {
          clauses.push(`gender = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
    }

    return clauses.join(` ${condition} `);
  }

  const filterClause = buildFilterClause(filters);
  if (filterClause) {
    query += ` WHERE ${filterClause}`;
  }

  const result = await pool.query(query, params);
  return result.rows.map((r) => r.id);
}

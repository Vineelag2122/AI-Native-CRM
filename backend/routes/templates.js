import pool from '../config/db.js';

// Get all templates for user
export const getTemplates = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category, template_text, channels, created_at, updated_at
       FROM message_templates WHERE user_id = $1
       ORDER BY category, created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single template
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, category, template_text, channels, created_at
       FROM message_templates WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create template
export const createTemplate = async (req, res) => {
  try {
    const { name, category, template_text, channels } = req.body;

    if (!name || !template_text) {
      return res.status(400).json({ message: 'Name and template text are required' });
    }

    // Validate channels
    const validChannels = ['WhatsApp', 'SMS', 'Email', 'RCS'];
    const selectedChannels = Array.isArray(channels) ? channels : [];
    if (selectedChannels.length === 0) {
      return res.status(400).json({ message: 'At least one channel is required' });
    }

    const result = await pool.query(
      `INSERT INTO message_templates (user_id, name, category, template_text, channels)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, category, template_text, channels, created_at`,
      [req.userId, name, category, template_text, selectedChannels]
    );

    res.status(201).json({
      message: 'Template created successfully',
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update template
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, template_text, channels } = req.body;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM message_templates WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE message_templates
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           template_text = COALESCE($3, template_text),
           channels = COALESCE($4, channels),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, name, category, template_text, channels, updated_at`,
      [name, category, template_text, channels || null, id, req.userId]
    );

    res.json({
      message: 'Template updated successfully',
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete template
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM message_templates WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('DELETE FROM message_templates WHERE id = $1', [id]);

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get templates by category
export const getTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const result = await pool.query(
      `SELECT id, name, template_text, channels FROM message_templates
       WHERE user_id = $1 AND category = $2
       ORDER BY created_at DESC`,
      [req.userId, category]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get templates by category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get template categories (grouped)
export const getTemplateCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM message_templates
       WHERE user_id = $1 AND category IS NOT NULL
       GROUP BY category
       ORDER BY category`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

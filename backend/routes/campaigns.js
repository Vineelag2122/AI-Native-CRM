import pool from '../config/db.js';
import axios from 'axios';

// Get all campaigns for user
export const getCampaigns = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.campaign_name, s.name as segment_name, c.channel, c.status,
              COUNT(com.id) as total_sent,
              SUM(CASE WHEN com.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) as total_delivered,
              c.created_at, c.sent_at
       FROM campaigns c
       JOIN segments s ON c.segment_id = s.id
       LEFT JOIN communications com ON c.id = com.campaign_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.campaign_name, s.name, c.channel, c.status, c.created_at, c.sent_at
       ORDER BY c.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single campaign with full details
export const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.id, c.campaign_name, c.segment_id, s.name as segment_name,
              c.channel, c.message_content, c.status, c.created_at, c.sent_at,
              COUNT(com.id) as total_sent
       FROM campaigns c
       JOIN segments s ON c.segment_id = s.id
       LEFT JOIN communications com ON c.id = com.campaign_id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id, c.campaign_name, c.segment_id, s.name, c.channel, c.message_content, c.status, c.created_at, c.sent_at`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = result.rows[0];

    // Get analytics for this campaign
    const analyticsResult = await pool.query(
      `SELECT * FROM campaign_analytics WHERE campaign_id = $1`,
      [id]
    );

    res.json({
      ...campaign,
      analytics: analyticsResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create campaign (draft)
export const createCampaign = async (req, res) => {
  try {
    const { campaign_name, segment_id, channel, message_content, message_template_id } = req.body;

    if (!campaign_name || !segment_id || !channel || !message_content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify ownership of segment
    const segmentCheck = await pool.query(
      'SELECT id FROM segments WHERE id = $1 AND user_id = $2',
      [segment_id, req.userId]
    );

    if (segmentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Segment not found' });
    }

    const result = await pool.query(
      `INSERT INTO campaigns (user_id, segment_id, campaign_name, channel, message_content, message_template_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING id, campaign_name, segment_id, channel, message_content, status, created_at`,
      [req.userId, segment_id, campaign_name, channel, message_content, message_template_id || null]
    );

    // Create campaign analytics record
    await pool.query(
      `INSERT INTO campaign_analytics (campaign_id) VALUES ($1)`,
      [result.rows[0].id]
    );

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update campaign (only if draft)
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { campaign_name, segment_id, channel, message_content } = req.body;

    // Check ownership and status
    const ownershipCheck = await pool.query(
      'SELECT status FROM campaigns WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (ownershipCheck.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Can only edit draft campaigns' });
    }

    const result = await pool.query(
      `UPDATE campaigns
       SET campaign_name = COALESCE($1, campaign_name),
           segment_id = COALESCE($2, segment_id),
           channel = COALESCE($3, channel),
           message_content = COALESCE($4, message_content),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, campaign_name, segment_id, channel, message_content, status`,
      [campaign_name, segment_id, channel, message_content, id, req.userId]
    );

    res.json({
      message: 'Campaign updated successfully',
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send campaign
export const sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const campaignResult = await pool.query(
      `SELECT c.id, c.campaign_name, c.segment_id, c.channel, c.message_content, c.user_id
       FROM campaigns c
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, req.userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    // Get segment members count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM segment_members WHERE segment_id = $1`,
      [campaign.segment_id]
    );

    const totalRecipients = parseInt(countResult.rows[0].total) || 0;
    if (totalRecipients === 0) {
      return res.status(400).json({ message: 'Segment has no members' });
    }

    // Insert dispatch tasks into queue table in bulk
    await pool.query(
      `INSERT INTO campaign_jobs (campaign_id, customer_id, channel, message)
       SELECT $1, customer_id, $2, $3 FROM segment_members WHERE segment_id = $4`,
      [campaign.id, campaign.channel, campaign.message_content, campaign.segment_id]
    );

    // Update campaign status
    await pool.query(
      `UPDATE campaigns SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({
      message: `Campaign queued successfully for dispatch to ${totalRecipients} recipients`,
      sent_count: totalRecipients,
      total_recipients: totalRecipients,
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ message: 'Failed to queue campaign dispatches' });
  }
};

// Delete campaign (only if draft)
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership and status
    const ownershipCheck = await pool.query(
      'SELECT status FROM campaigns WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (ownershipCheck.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Can only delete draft campaigns' });
    }

    await pool.query('DELETE FROM communications WHERE campaign_id = $1', [id]);
    await pool.query('DELETE FROM campaign_analytics WHERE campaign_id = $1', [id]);
    await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get campaign preview (show sample customers)
export const previewCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone FROM segment_members sm
       JOIN customers c ON sm.customer_id = c.id
       WHERE sm.segment_id = (SELECT segment_id FROM campaigns WHERE id = $1)
       LIMIT 10`,
      [id]
    );

    res.json({
      preview_count: result.rows.length,
      preview: result.rows,
    });
  } catch (error) {
    console.error('Preview campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

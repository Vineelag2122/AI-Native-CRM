import pool from '../config/db.js';

// Receive callback from channel service
export const receiveCallback = async (req, res) => {
  try {
    const { message_id, campaign_id, customer_id, event } = req.body;

    if (!message_id || !campaign_id || !customer_id || !event) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find the communication record
    const commResult = await pool.query(
      'SELECT id, status FROM communications WHERE external_id = $1 AND campaign_id = $2',
      [message_id, campaign_id]
    );

    if (commResult.rows.length === 0) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    const communication = commResult.rows[0];
    let updateData = {};
    let eventTimestamp = new Date();

    // Handle different events
    if (event === 'delivered') {
      updateData.status = 'delivered';
      updateData.delivered_at = eventTimestamp;
    } else if (event === 'opened') {
      updateData.status = 'opened';
      updateData.opened_at = eventTimestamp;
    } else if (event === 'read') {
      updateData.status = 'read';
      updateData.read_at = eventTimestamp;
    } else if (event === 'clicked') {
      updateData.status = 'clicked';
      updateData.clicked_at = eventTimestamp;
    } else if (event === 'failed') {
      updateData.status = 'failed';
    } else if (event === 'converted') {
      updateData.converted = true;
      updateData.status = 'converted';
    }

    // Update communication record
    await pool.query(
      `UPDATE communications
       SET status = $1,
           delivered_at = COALESCE($2, delivered_at),
           opened_at = COALESCE($3, opened_at),
           read_at = COALESCE($4, read_at),
           clicked_at = COALESCE($5, clicked_at),
           converted = COALESCE($6, converted),
           updated_at = NOW()
       WHERE id = $7`,
      [
        updateData.status,
        updateData.delivered_at || null,
        updateData.opened_at || null,
        updateData.read_at || null,
        updateData.clicked_at || null,
        updateData.converted || null,
        communication.id,
      ]
    );

    // Update campaign analytics
    await updateCampaignAnalytics(campaign_id);

    res.json({
      message: 'Callback processed successfully',
      communication_id: message_id,
      event,
      timestamp: eventTimestamp,
    });
  } catch (error) {
    console.error('Receive callback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get communication details
export const getCommunication = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.id, c.campaign_id, c.customer_id, c.channel, c.message,
              c.status, c.sent_at, c.delivered_at, c.opened_at, c.clicked_at,
              c.converted, c.created_at, c.updated_at,
              cust.name as customer_name, cust.email as customer_email,
              cam.campaign_name
       FROM communications c
       JOIN customers cust ON c.customer_id = cust.id
       JOIN campaigns cam ON c.campaign_id = cam.id
       WHERE c.id = $1 AND cam.user_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get communication error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get communications for a campaign
export const getCampaignCommunications = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify campaign ownership
    const campaignCheck = await pool.query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, req.userId]
    );

    if (campaignCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      `SELECT c.id, c.customer_id, c.channel, c.status,
              cust.name as customer_name, cust.email as customer_email,
              c.sent_at, c.delivered_at, c.opened_at, c.clicked_at,
              c.converted
       FROM communications c
       JOIN customers cust ON c.customer_id = cust.id
       WHERE c.campaign_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [campaignId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM communications WHERE campaign_id = $1',
      [campaignId]
    );

    res.json({
      communications: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Get campaign communications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get communication status by event timeline
export const getCommunicationTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        'sent' as event, created_at as timestamp
       FROM communications
       WHERE id = $1

       UNION ALL

       SELECT 'delivered' as event, delivered_at as timestamp
       FROM communications
       WHERE id = $1 AND delivered_at IS NOT NULL

       UNION ALL

       SELECT 'opened' as event, opened_at as timestamp
       FROM communications
       WHERE id = $1 AND opened_at IS NOT NULL

       UNION ALL

       SELECT 'read' as event, read_at as timestamp
       FROM communications
       WHERE id = $1 AND read_at IS NOT NULL

       UNION ALL

       SELECT 'clicked' as event, clicked_at as timestamp
       FROM communications
       WHERE id = $1 AND clicked_at IS NOT NULL

       ORDER BY timestamp ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get communication timeline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to update campaign analytics
export async function updateCampaignAnalytics(campaignId) {
  try {
    // Get current stats
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_sent,
        SUM(CASE WHEN status IN ('delivered', 'opened', 'read', 'clicked', 'converted') THEN 1 ELSE 0 END) as total_delivered,
        SUM(CASE WHEN status IN ('opened', 'read', 'clicked', 'converted') THEN 1 ELSE 0 END) as total_opened,
        SUM(CASE WHEN status IN ('read', 'clicked', 'converted') THEN 1 ELSE 0 END) as total_read,
        SUM(CASE WHEN status IN ('clicked', 'converted') THEN 1 ELSE 0 END) as total_clicked,
        SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as total_converted,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed
       FROM communications
       WHERE campaign_id = $1`,
      [campaignId]
    );

    const stats = result.rows[0];

    // Calculate rates
    const delivery_rate =
      stats.total_sent > 0 ? ((stats.total_delivered / stats.total_sent) * 100).toFixed(2) : 0;
    const open_rate =
      stats.total_delivered > 0 ? ((stats.total_opened / stats.total_delivered) * 100).toFixed(2) : 0;
    const read_rate =
      stats.total_opened > 0 ? ((stats.total_read / stats.total_opened) * 100).toFixed(2) : 0;
    const click_rate =
      stats.total_read > 0 ? ((stats.total_clicked / stats.total_read) * 100).toFixed(2) : 0;
    const conversion_rate =
      stats.total_sent > 0 ? ((stats.total_converted / stats.total_sent) * 100).toFixed(2) : 0;

    // Update or insert analytics
    await pool.query(
      `INSERT INTO campaign_analytics
       (campaign_id, total_sent, total_delivered, total_read, total_opened, total_clicked, total_converted, total_failed,
        delivery_rate, read_rate, open_rate, click_rate, conversion_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (campaign_id) DO UPDATE SET
       total_sent = $2,
       total_delivered = $3,
       total_read = $4,
       total_opened = $5,
       total_clicked = $6,
       total_converted = $7,
       total_failed = $8,
       delivery_rate = $9,
       read_rate = $10,
       open_rate = $11,
       click_rate = $12,
       conversion_rate = $13,
       updated_at = NOW()`,
      [
        campaignId,
        stats.total_sent,
        stats.total_delivered,
        stats.total_read,
        stats.total_opened,
        stats.total_clicked,
        stats.total_converted,
        stats.total_failed,
        delivery_rate,
        read_rate,
        open_rate,
        click_rate,
        conversion_rate,
      ]
    );
  } catch (error) {
    console.error('Update campaign analytics error:', error);
  }
}


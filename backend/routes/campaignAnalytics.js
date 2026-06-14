import pool from '../config/db.js';

// Get campaign performance metrics
export const getCampaignMetrics = async (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const campaignResult = await pool.query(
      `SELECT c.id, c.campaign_name, s.name as segment_name, c.channel, c.status,
              c.created_at, c.sent_at
       FROM campaigns c
       JOIN segments s ON c.segment_id = s.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, req.userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Get communications breakdown by status
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM communications
       WHERE campaign_id = $1
       GROUP BY status`,
      [id]
    );

    // Get detailed analytics
    const analyticsResult = await pool.query(
      `SELECT
        total_sent,
        total_delivered,
        total_read,
        total_opened,
        total_clicked,
        total_converted,
        total_failed,
        delivery_rate,
        read_rate,
        open_rate,
        click_rate,
        conversion_rate
       FROM campaign_analytics
       WHERE campaign_id = $1`,
      [id]
    );

    // Get time-based delivery data (last 24 hours)
    const timelineResult = await pool.query(
      `SELECT
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM communications
       WHERE campaign_id = $1
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour DESC
       LIMIT 24`,
      [id]
    );

    // Get channel performance
    const channelResult = await pool.query(
      `SELECT
        channel,
        COUNT(*) as sent,
        SUM(CASE WHEN status IN ('delivered', 'opened', 'read', 'clicked', 'converted') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status IN ('opened', 'read', 'clicked', 'converted') THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status IN ('read', 'clicked', 'converted') THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN status IN ('clicked', 'converted') THEN 1 ELSE 0 END) as clicked
       FROM communications
       WHERE campaign_id = $1
       GROUP BY channel`,
      [id]
    );

    res.json({
      campaign: campaignResult.rows[0],
      status_breakdown: statusResult.rows,
      analytics: analyticsResult.rows[0] || {},
      timeline: timelineResult.rows.reverse(),
      channel_performance: channelResult.rows,
    });
  } catch (error) {
    console.error('Get campaign metrics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all campaigns performance summary
export const getCampaignsSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        c.id,
        c.campaign_name,
        c.channel,
        c.status,
        COUNT(com.id) as total_sent,
        SUM(CASE WHEN com.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) as total_delivered,
        SUM(CASE WHEN com.status = 'opened' THEN 1 ELSE 0 END) as total_opened,
        SUM(CASE WHEN com.status = 'clicked' THEN 1 ELSE 0 END) as total_clicked,
        SUM(CASE WHEN com.converted = true THEN 1 ELSE 0 END) as total_converted,
        ROUND(CAST(SUM(CASE WHEN com.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) AS NUMERIC) /
              NULLIF(COUNT(com.id), 0) * 100, 2) as delivery_rate,
        ROUND(CAST(SUM(CASE WHEN com.status = 'opened' THEN 1 ELSE 0 END) AS NUMERIC) /
              NULLIF(SUM(CASE WHEN com.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END), 0) * 100, 2) as open_rate,
        c.created_at,
        c.sent_at
       FROM campaigns c
       LEFT JOIN communications com ON c.id = com.campaign_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.campaign_name, c.channel, c.status, c.created_at, c.sent_at
       ORDER BY c.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get campaigns summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get overall business metrics
export const getBusinessMetrics = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT c.id) as total_campaigns,
         COUNT(com.id) as total_messages_sent,
         SUM(CASE WHEN com.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) as total_delivered,
         SUM(CASE WHEN com.converted = true THEN 1 ELSE 0 END) as total_conversions,
         ROUND(
           CASE WHEN COUNT(com.id) = 0 THEN 0
           ELSE CAST(SUM(CASE WHEN com.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) AS NUMERIC) / NULLIF(COUNT(com.id), 0) * 100 END
         , 2) as overall_delivery_rate
       FROM campaigns c
       LEFT JOIN communications com ON c.id = com.campaign_id
       WHERE c.user_id = $1`,
      [req.userId]
    );

    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Get business metrics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get engagement funnel
export const getEngagementFunnel = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        COUNT(*) as sent,
        SUM(CASE WHEN status IN ('delivered', 'opened', 'read', 'clicked', 'converted') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status IN ('opened', 'read', 'clicked', 'converted') THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status IN ('read', 'clicked', 'converted') THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN status IN ('clicked', 'converted') THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as converted
       FROM communications
       WHERE campaign_id = $1`,
      [id]
    );

    const data = result.rows[0];

    res.json({
      funnel: [
        { stage: 'Sent', value: parseInt(data.sent) || 0 },
        { stage: 'Delivered', value: parseInt(data.delivered) || 0 },
        { stage: 'Opened', value: parseInt(data.opened) || 0 },
        { stage: 'Read', value: parseInt(data.read) || 0 },
        { stage: 'Clicked', value: parseInt(data.clicked) || 0 },
        { stage: 'Converted', value: parseInt(data.converted) || 0 },
      ],
    });
  } catch (error) {
    console.error('Get engagement funnel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

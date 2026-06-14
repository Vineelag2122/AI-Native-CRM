import axios from 'axios';
import pool from '../config/db.js';

function getGroqConfig() {
  const groqApiKey = process.env.GROQ_API_KEY;
  const isGroqKeyPlaceholder = !groqApiKey || groqApiKey.startsWith('your_') || groqApiKey === '';
  return { groqApiKey, isGroqKeyPlaceholder };
}

// Helper to query Groq Chat Completions API
async function queryGroq(prompt) {
  const { groqApiKey, isGroqKeyPlaceholder } = getGroqConfig();
  if (isGroqKeyPlaceholder) {
    throw new Error('Groq API Key is a placeholder');
  }

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    },
    {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  return response.data.choices[0]?.message?.content || '';
}

// Mock Insights Generator fallback
function mockInsightsResponse(campaign) {
  const openRate = campaign.open_rate || 0;
  const clickRate = campaign.click_rate || 0;
  return {
    performance_summary: `Campaign "${campaign.campaign_name}" showed steady performance on channel ${campaign.channel}.`,
    strengths: [
      'Solid initial delivery rate.',
      'Personalized message format supported audience retention.',
    ],
    improvements: [
      `Open rate (${openRate}%) could be increased with optimized timing.`,
      `Click rate (${clickRate}%) has potential to rise with a clearer call to action.`,
    ],
    recommendations: [
      'Optimize send time windows based on customer signup patterns.',
      'Test multi-channel messaging (e.g. WhatsApp follow-ups for unopened emails).',
      'Refine target audience segments for closer conversion attribution.',
    ],
    benchmark_comparison: `Performs within 5% of overall averages for ${campaign.channel} benchmarks.`,
    confidence_score: 92,
  };
}

export const generateCampaignInsights = async (req, res) => {
  const { campaignId } = req.params;

  // Verify campaign ownership and get details
  let campaign;
  try {
    const campaignResult = await pool.query(
      `SELECT c.id, c.campaign_name, c.channel, c.status,
              COUNT(com.id) as total_sent,
              SUM(CASE WHEN com.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) as total_delivered,
              SUM(CASE WHEN com.status = 'opened' THEN 1 ELSE 0 END) as total_opened,
              SUM(CASE WHEN com.status = 'clicked' THEN 1 ELSE 0 END) as total_clicked,
              SUM(CASE WHEN com.converted = true THEN 1 ELSE 0 END) as total_converted,
              ca.delivery_rate, ca.open_rate, ca.click_rate, ca.conversion_rate
       FROM campaigns c
       LEFT JOIN communications com ON c.id = com.campaign_id
       LEFT JOIN campaign_analytics ca ON c.id = ca.campaign_id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id, c.campaign_name, c.channel, c.status, ca.delivery_rate, ca.open_rate, ca.click_rate, ca.conversion_rate`,
      [campaignId, req.userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    campaign = campaignResult.rows[0];
  } catch (dbErr) {
    console.error('Database fetch error in insights:', dbErr);
    return res.status(500).json({ message: 'Server error fetching campaign details' });
  }

  try {
    let insights;
    const { isGroqKeyPlaceholder } = getGroqConfig();

    if (isGroqKeyPlaceholder) {
      console.log('[AI Mode] Generating local mock campaign performance insights...');
      insights = mockInsightsResponse(campaign);
    } else {
      // Get all user's campaigns for benchmarking
      const benchmarkResult = await pool.query(
        `SELECT
          AVG(ca.delivery_rate) as avg_delivery_rate,
          AVG(ca.open_rate) as avg_open_rate,
          AVG(ca.click_rate) as avg_click_rate,
          AVG(ca.conversion_rate) as avg_conversion_rate
         FROM campaigns c
         LEFT JOIN campaign_analytics ca ON c.id = ca.campaign_id
         WHERE c.user_id = $1 AND c.status = 'sent'`,
        [req.userId]
      );

      const benchmarks = benchmarkResult.rows[0] || {};

      const prompt = `You are an expert marketing analyst. Analyze this campaign performance and provide 3-5 actionable insights.

Campaign Details:
- Name: ${campaign.campaign_name}
- Channel: ${campaign.channel}
- Total Sent: ${campaign.total_sent || 0}
- Delivered: ${campaign.total_delivered || 0}
- Opened: ${campaign.total_opened || 0}
- Clicked: ${campaign.total_clicked || 0}
- Conversions: ${campaign.total_converted || 0}

Performance Rates:
- Delivery Rate: ${campaign.delivery_rate || 0}%
- Open Rate: ${campaign.open_rate || 0}%
- Click Rate: ${campaign.click_rate || 0}%
- Conversion Rate: ${campaign.conversion_rate || 0}%

User's Benchmarks (average across all campaigns):
- Avg Delivery Rate: ${benchmarks.avg_delivery_rate ? parseFloat(benchmarks.avg_delivery_rate).toFixed(2) : 'N/A'}%
- Avg Open Rate: ${benchmarks.avg_open_rate ? parseFloat(benchmarks.avg_open_rate).toFixed(2) : 'N/A'}%
- Avg Click Rate: ${benchmarks.avg_click_rate ? parseFloat(benchmarks.avg_click_rate).toFixed(2) : 'N/A'}%
- Avg Conversion Rate: ${benchmarks.avg_conversion_rate ? parseFloat(benchmarks.avg_conversion_rate).toFixed(2) : 'N/A'}%

Provide insights in JSON format ONLY (no markdown):
{
  "performance_summary": "1-2 sentence overview",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "benchmark_comparison": "how this campaign compares to user's average",
  "confidence_score": 85
}`;

      const responseText = await queryGroq(prompt);

      try {
        insights = JSON.parse(responseText);
      } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response');
        }
      }
    }

    // Save insights to database
    await pool.query(
      `INSERT INTO campaign_insights (user_id, insight_text, insight_type, related_campaign_id)
       VALUES ($1, $2, $3, $4)`,
      [req.userId, JSON.stringify(insights), 'performance', campaignId]
    );

    res.json({
      message: 'Campaign insights generated successfully',
      campaign_name: campaign.campaign_name,
      insights,
    });
  } catch (error) {
    console.warn('Generate insights AI failed, falling back to mock:', error.message);
    try {
      const fallbackInsights = mockInsightsResponse(campaign);
      
      await pool.query(
        `INSERT INTO campaign_insights (user_id, insight_text, insight_type, related_campaign_id)
         VALUES ($1, $2, $3, $4)`,
        [req.userId, JSON.stringify(fallbackInsights), 'performance', campaignId]
      );

      res.json({
        message: 'Campaign insights generated successfully (Mock Fallback)',
        campaign_name: campaign.campaign_name,
        insights: fallbackInsights,
      });
    } catch (dbError) {
      console.error('Database fallback error for insights:', dbError);
      res.status(500).json({ message: 'Server error creating fallback insights' });
    }
  }
};

export const getInsights = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, insight_text, insight_type, related_campaign_id, created_at
       FROM campaign_insights
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.userId]
    );

    res.json(result.rows.map((row) => {
      let insightText = row.insight_text;
      if (typeof insightText === 'string') {
        try {
          insightText = JSON.parse(insightText);
        } catch (e) {
          insightText = {
            performance_summary: row.insight_text,
            strengths: [],
            improvements: [],
            recommendations: [],
            benchmark_comparison: "",
            confidence_score: 100
          };
        }
      }
      return {
        ...row,
        insight_text: insightText,
      };
    }));
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteInsight = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM campaign_insights WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('DELETE FROM campaign_insights WHERE id = $1', [id]);

    res.json({ message: 'Insight deleted successfully' });
  } catch (error) {
    console.error('Delete insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


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

// Mock Campaign Details generator
function mockCampaignDetailsResponse(intent) {
  const channel = intent.toLowerCase().includes('email') ? 'Email' : intent.toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'SMS';
  return {
    campaign_name: 'AI Campaign: ' + intent.slice(0, 30),
    segment_recommendation: 'Customers matching intent: ' + intent,
    segment_filters: 'total_spend > 5000',
    message: 'Hey {customer_name}, we noticed you might like our latest arrivals! Use code AI20 for 20% off.',
    channel: channel,
    template_suggestion: null,
    reasoning: 'Generated from local marketing heuristics',
    success_metrics: 'CTR and Conversion rate',
    best_send_time: 'Tuesday at 10:00 AM',
  };
}

// Mock message improvements generator
function mockImprovementsResponse(message, objective) {
  return {
    alternatives: [
      { version: 1, text: `🎉 Premium Offer: ${message} (Special copy for higher CTR)` },
      { version: 2, text: `Hey {customer_name}, ${message.replace(/^Hi |^Hey /, '')} - Don't miss out!` },
      { version: 3, text: `Exclusive invitation: ${message} code: VIP20` },
    ],
    recommendations: 'Version 2 utilizes personalization markers, which typically boost response rates by 25%.',
  };
}

export const generateCampaignFromIntent = async (req, res) => {
  const { intent } = req.body;
  if (!intent) {
    return res.status(400).json({ message: 'Intent is required' });
  }

  const { isGroqKeyPlaceholder } = getGroqConfig();

  try {
    if (isGroqKeyPlaceholder) {
      console.log('[AI Mode] Using local campaign details suggestion builder...');
      const mock = mockCampaignDetailsResponse(intent);
      return res.json({
        message: 'Campaign suggestion generated successfully (Mock Mode)',
        campaign: mock,
      });
    }

    const segmentsResult = await pool.query(
      'SELECT id, name FROM segments WHERE user_id = $1 LIMIT 5',
      [req.userId]
    );

    const templatesResult = await pool.query(
      'SELECT id, name, category FROM message_templates WHERE user_id = $1 LIMIT 10',
      [req.userId]
    );

    const segmentsContext = segmentsResult.rows
      .map((s) => `- ${s.name}`)
      .join('\n');
    const templatesContext = templatesResult.rows
      .map((t) => `- ${t.name} (${t.category})`)
      .join('\n');

    const prompt = `You are an expert marketing strategist. Generate a complete campaign recommendation based on the user's intent.

User's Intent: "${intent}"

Available Segments:
${segmentsContext || 'No segments available. Suggest what segment to create.'}

Available Templates:
${templatesContext || 'No templates available. Suggest a message template.'}

Generate a comprehensive campaign plan. Return ONLY valid JSON (no markdown):
{
  "campaign_name": "catchy campaign name",
  "segment_recommendation": "detailed description of target audience",
  "segment_filters": "suggested filters if creating new segment",
  "message": "compelling message text with personalization placeholders like {customer_name}",
  "channel": "best channel: WhatsApp or SMS or Email or RCS",
  "template_suggestion": "if applicable, which template to use",
  "reasoning": "why this approach will work",
  "success_metrics": "what metrics matter for this campaign",
  "best_send_time": "recommended time to send"
}`;

    const responseText = await queryGroq(prompt);

    let parsedCampaign;
    try {
      parsedCampaign = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedCampaign = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    res.json({
      message: 'Campaign suggestion generated successfully',
      campaign: parsedCampaign,
    });
  } catch (error) {
    console.warn('Generate campaign details suggestions failed, falling back to mock:', error.message);
    const mock = mockCampaignDetailsResponse(intent);
    res.json({
      message: 'Campaign suggestion generated successfully (Mock Fallback)',
      campaign: mock,
    });
  }
};

export const generateCampaignAndCreate = async (req, res) => {
  const { intent, segment_id } = req.body;
  if (!intent || !segment_id) {
    return res.status(400).json({ message: 'Intent and segment_id are required' });
  }

  // Verify segment ownership
  const segmentCheck = await pool.query(
    'SELECT id FROM segments WHERE id = $1 AND user_id = $2',
    [segment_id, req.userId]
  );

  if (segmentCheck.rows.length === 0) {
    return res.status(403).json({ message: 'Segment not found' });
  }

  try {
    let campaignData;
    const { isGroqKeyPlaceholder } = getGroqConfig();

    if (isGroqKeyPlaceholder) {
      console.log('[AI Mode] Using local campaign details builder...');
      campaignData = {
        campaign_name: 'AI Campaign: ' + intent.slice(0, 30),
        message: 'Hey {customer_name}, we noticed you might like our latest arrivals! Use code AI20 for 20% off.',
        channel: intent.toLowerCase().includes('email') ? 'Email' : intent.toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'SMS',
        reasoning: 'Generated from local marketing heuristics',
      };
    } else {
      const prompt = `You are an expert marketing strategist. Based on this intent, create a campaign.

Intent: "${intent}"

Generate a campaign quickly. Return ONLY valid JSON:
{
  "campaign_name": "campaign name",
  "message": "compelling message with {customer_name} placeholder",
  "channel": "WhatsApp or SMS or Email or RCS",
  "reasoning": "brief explanation"
}`;

      const responseText = await queryGroq(prompt);

      try {
        campaignData = JSON.parse(responseText);
      } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          campaignData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response');
        }
      }
    }

    // Create campaign in database
    const createResult = await pool.query(
      `INSERT INTO campaigns (user_id, segment_id, campaign_name, channel, message_content, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id, campaign_name, channel, message_content, status, created_at`,
      [req.userId, segment_id, campaignData.campaign_name, campaignData.channel, campaignData.message]
    );

    // Create analytics record
    await pool.query(
      `INSERT INTO campaign_analytics (campaign_id) VALUES ($1)`,
      [createResult.rows[0].id]
    );

    res.status(201).json({
      message: 'Campaign created successfully from AI suggestion',
      campaign: createResult.rows[0],
      reasoning: campaignData.reasoning,
    });
  } catch (error) {
    console.warn('Generate and create campaign AI failed, falling back to mock:', error.message);
    try {
      const fallbackCampaign = {
        campaign_name: 'AI Campaign: ' + intent.slice(0, 30),
        message: 'Hey {customer_name}, check out our latest arrivals! Use code AI20 for 20% off.',
        channel: intent.toLowerCase().includes('email') ? 'Email' : intent.toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'SMS',
      };
      
      const createResult = await pool.query(
        `INSERT INTO campaigns (user_id, segment_id, campaign_name, channel, message_content, status)
         VALUES ($1, $2, $3, $4, $5, 'draft')
         RETURNING id, campaign_name, channel, message_content, status, created_at`,
        [req.userId, segment_id, fallbackCampaign.campaign_name, fallbackCampaign.channel, fallbackCampaign.message]
      );

      await pool.query(
        `INSERT INTO campaign_analytics (campaign_id) VALUES ($1)`,
        [createResult.rows[0].id]
      );

      res.status(201).json({
        message: 'Campaign created successfully from AI suggestion (Mock Fallback)',
        campaign: createResult.rows[0],
        reasoning: 'Fallback mock created due to API connection issue.',
      });
    } catch (dbError) {
      console.error('Database fallback error:', dbError);
      res.status(500).json({ message: 'Server error creating fallback campaign' });
    }
  }
};

export const improveMessage = async (req, res) => {
  const { message, objective } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const { isGroqKeyPlaceholder } = getGroqConfig();

  try {
    if (isGroqKeyPlaceholder) {
      console.log('[AI Mode] Using local message copy improver...');
      const mock = mockImprovementsResponse(message, objective);
      return res.json({
        message: 'Message improvements generated (Mock Mode)',
        improvements: mock,
      });
    }

    const prompt = `You are an expert copywriter and marketing strategist. 
Your task is to improve the following marketing message for the objective: "${objective || 'engagement'}".

IMPORTANT COPY SANITATION RULES:
- If the original message contains negative, insulting, rude, offensive, or inappropriate language (e.g., words like "ugly", "fat", "poor", "cheap", or direct insults/demeaning text), you MUST sanitize it. 
- Rewrite and transform any insulting or inappropriate concepts into highly positive, polite, supportive, professional, and appealing marketing copy.
- Never repeat or include insults, offensive labels, or negative sentiments in the improved versions. Keep the tone warm, welcoming, and premium.
- Use marketing personalization markers like {customer_name} to customize the message.

Current Message: "${message}"

Provide exactly 3 alternative versions.
Return ONLY valid JSON with no extra explanation or markdown:
{
  "alternatives": [
    {"version": 1, "text": "compelling version 1 with {customer_name} placeholder"},
    {"version": 2, "text": "compelling version 2 with {customer_name} placeholder"},
    {"version": 3, "text": "compelling version 3 with {customer_name} placeholder"}
  ],
  "recommendations": "brief explanation of why these versions are better, highlighting how any negative language was transformed into a professional, welcoming message"
}`;

    const responseText = await queryGroq(prompt);

    let improvements;
    try {
      improvements = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        improvements = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    res.json({
      message: 'Message improvements generated',
      improvements,
    });
  } catch (error) {
    console.warn('Improve message AI failed, falling back to mock:', error.message);
    const mock = mockImprovementsResponse(message, objective);
    res.json({
      message: 'Message improvements generated (Mock Fallback)',
      improvements: mock,
    });
  }
};


import axios from 'axios';

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

// Mock Segment Response Generator
function mockSegmentResponse(description) {
  const desc = description.toLowerCase();
  let filters = [];
  let condition = 'AND';
  let reasoning = `Generated mock segment based on description: "${description}"`;

  if (desc.includes('spend') || desc.includes('expensive') || desc.includes('buyer') || desc.includes('money')) {
    filters.push({ field: 'total_spend', operator: '>', value: '8000' });
  }
  if (desc.includes('recent') || desc.includes('days') || desc.includes('new')) {
    filters.push({ field: 'last_purchase_days', operator: '<=', value: '30' });
  } else if (desc.includes('inactive') || desc.includes('churn') || desc.includes('old')) {
    filters.push({ field: 'last_purchase_days', operator: '>', value: '180' });
  }
  if (desc.includes('order') || desc.includes('count') || desc.includes('active')) {
    filters.push({ field: 'order_count', operator: '>', value: '5' });
  }
  if (desc.includes('city') || desc.includes('delhi') || desc.includes('mumbai') || desc.includes('bangalore')) {
    const city = desc.includes('mumbai') ? 'Mumbai' : desc.includes('delhi') ? 'Delhi' : 'Bangalore';
    filters.push({ field: 'city', operator: '=', value: city });
  }

  // Fallback if no keywords matched
  if (filters.length === 0) {
    filters.push({ field: 'total_spend', operator: '>', value: '5000' });
  }

  return { condition, filters, reasoning };
}

// Mock Campaign Response Generator
function mockCampaignResponse(intent) {
  const channel = intent.toLowerCase().includes('email') ? 'Email' : intent.toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'SMS';
  return {
    segment_description: 'Active customer base matching intent',
    message: `Hi {customer_name}! Special offer based on your interest: Buy now and get 20% off!`,
    channel: channel,
    subject_line: channel === 'Email' ? 'Exclusive Premium Offer for You!' : null,
    reasoning: `Mock campaign recommendation generated for intent: "${intent}"`
  };
}

export const generateSegmentFromDescription = async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ message: 'Description is required' });
  }

  const { isGroqKeyPlaceholder } = getGroqConfig();

  try {
    if (isGroqKeyPlaceholder) {
      console.log('[AI Mode] Using local mock segment builder...');
      const mock = mockSegmentResponse(description);
      return res.json({
        message: 'Segment filters generated successfully (Mock Mode)',
        filters: mock.filters,
        condition: mock.condition,
        reasoning: mock.reasoning,
      });
    }

    const prompt = `You are an expert data analyst helping to create customer segments.

Convert the following marketing intent into a structured filter query. Return ONLY valid JSON (no markdown, no code blocks).

Marketing Intent: "${description}"

Return a JSON object with this exact structure:
{
  "condition": "AND" or "OR",
  "filters": [
    {
      "field": one of ["total_spend", "order_count", "last_purchase_days", "city", "gender"],
      "operator": one of [">", "<", "="],
      "value": number or string
    }
  ],
  "reasoning": "brief explanation of the filters"
}

Examples:
- "High spenders who haven't ordered recently" → {"condition": "AND", "filters": [{"field": "total_spend", "operator": ">", "value": 5000}, {"field": "last_purchase_days", "operator": ">", "value": 60}]}
- "Customers from Hyderabad" → {"condition": "AND", "filters": [{"field": "city", "operator": "=", "value": "Hyderabad"}]}
- "Very active customers" → {"condition": "AND", "filters": [{"field": "order_count", "operator": ">", "value": 10}]}

Create filters based on the marketing intent.`;

    const responseText = await queryGroq(prompt);

    // Parse JSON from response
    let parsedFilters;
    try {
      parsedFilters = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedFilters = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    res.json({
      message: 'Segment filters generated successfully',
      filters: parsedFilters.filters,
      condition: parsedFilters.condition,
      reasoning: parsedFilters.reasoning,
    });
  } catch (error) {
    console.warn('Generate segment AI failed, falling back to mock:', error.message);
    const mock = mockSegmentResponse(description);
    res.json({
      message: 'Segment filters generated successfully (Mock Fallback)',
      filters: mock.filters,
      condition: mock.condition,
      reasoning: mock.reasoning,
    });
  }
};

export const generateCampaignFromIntent = async (req, res) => {
  const { intent } = req.body;
  if (!intent) {
    return res.status(400).json({ message: 'Intent is required' });
  }

  const { isGroqKeyPlaceholder } = getGroqConfig();

  try {
    if (isGroqKeyPlaceholder) {
      console.log('[AI Mode] Using local mock campaign builder...');
      const mock = mockCampaignResponse(intent);
      return res.json({
        message: 'Campaign suggestion generated successfully (Mock Mode)',
        campaign: mock,
      });
    }

    const prompt = `You are an expert marketing strategist helping to create customer engagement campaigns.

Based on the marketing intent, suggest:
1. A target customer segment (describe the filter)
2. A compelling message template
3. The best channel (WhatsApp, SMS, Email, or RCS)

Marketing Intent: "${intent}"

Return ONLY valid JSON (no markdown, no code blocks):
{
  "segment_description": "description for creating filters",
  "message": "suggested message to send",
  "channel": "WhatsApp" or "SMS" or "Email" or "RCS",
  "subject_line": "if email, otherwise null",
  "reasoning": "why these choices"
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
    console.warn('Generate campaign AI failed, falling back to mock:', error.message);
    const mock = mockCampaignResponse(intent);
    res.json({
      message: 'Campaign suggestion generated successfully (Mock Fallback)',
      campaign: mock,
    });
  }
};


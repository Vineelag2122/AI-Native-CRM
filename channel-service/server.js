import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const CRM_API_URL = process.env.CRM_API_URL || 'http://localhost:5000';

// Store pending messages (simulated queue)
const messageQueue = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Channel Service is running' });
});

// Send message endpoint (CRM calls this)
app.post('/api/send', async (req, res) => {
  try {
    const { campaign_id, customer_id, customer_name, channel, message, token } = req.body;

    if (!campaign_id || !customer_id || !channel || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const messageId = uuidv4();

    console.log(`Sending message to ${customer_name || 'unknown'}`);

    // Simulate message sending with random outcome
    const outcomes = ['delivered', 'failed', 'delivered', 'delivered']; // 75% delivery rate
    const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    // Store message with callback info
    messageQueue.push({
      id: messageId,
      campaign_id,
      customer_id,
      customer_name: customer_name || 'unknown',
      channel,
      message,
      status: randomOutcome,
      sent_at: new Date(),
      token,
    });

    res.status(200).json({
      message: 'Message accepted for processing',
      message_id: messageId,
      status: 'queued',
    });

    // Simulate async callbacks with delays
    simulateCallbacks(messageId);
  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simulate delivery and engagement callbacks
async function simulateCallbacks(messageId) {
  const msg = messageQueue.find((m) => m.id === messageId);
  if (!msg) return;

  try {
    // Callback 1: Delivered (after 2-5 seconds)
    setTimeout(async () => {
      if (msg.status === 'failed') {
        await sendCallback(messageId, msg, 'failed', msg.token);
      } else {
        await sendCallback(messageId, msg, 'delivered', msg.token);

        // Callback 2: Opened (after 3-8 seconds)
        setTimeout(async () => {
          if (Math.random() > 0.2) {
            // 80% open rate
            await sendCallback(messageId, msg, 'opened', msg.token);

            // Callback 3: Read (after 2-5 seconds)
            setTimeout(async () => {
              if (Math.random() > 0.1) {
                // 90% read rate (given opened)
                await sendCallback(messageId, msg, 'read', msg.token);

                // Callback 4: Clicked (after 5-15 seconds)
                setTimeout(async () => {
                  if (Math.random() > 0.4) {
                    // 60% click rate (given read)
                    await sendCallback(messageId, msg, 'clicked', msg.token);

                    // Simulate conversion (30% probability)
                    if (Math.random() <= 0.3) {
                      setTimeout(async () => {
                        await simulatePurchase(msg);
                      }, Math.random() * 5000 + 3000);
                    }
                  }
                }, Math.random() * 10000 + 5000);
              }
            }, Math.random() * 3000 + 2000);
          }
        }, Math.random() * 5000 + 3000);
      }
    }, Math.random() * 3000 + 2000);
  } catch (error) {
    console.error('Callback simulation error:', error);
  }
}

// Simulate purchase on clicked message
async function simulatePurchase(msg) {
  try {
    const categories = ['Apparel', 'Electronics', 'Beauty', 'Home', 'Coffee'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomAmount = Number((Math.random() * 8000 + 200).toFixed(2));
    const orderIdExternal = 'SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const payload = {
      customer_id: msg.customer_id,
      order_id_external: orderIdExternal,
      amount: randomAmount,
      order_date: new Date(),
      product_category: randomCategory
    };

    console.log(`[Simulator] Triggering order webhook for customer ${msg.customer_name} (ID: ${msg.customer_id}) on campaign ${msg.campaign_id}...`);

    await axios.post(
      `${CRM_API_URL}/api/orders`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${msg.token}`,
        },
      }
    );

    console.log(`✓ [Simulator] Order webhook created: ${orderIdExternal}`);
  } catch (error) {
    console.error(`✗ [Simulator] Failed order webhook: ${error.response?.data?.message || error.message}`);
  }
}

// Send callback to CRM with retries and exponential backoff
async function sendCallback(messageId, msg, event, token, attempt = 1) {
  const maxAttempts = 3;
  try {
    const payload = {
      message_id: messageId,
      campaign_id: msg.campaign_id,
      customer_id: msg.customer_id,
      event, // 'delivered', 'failed', 'opened', 'read', 'clicked'
    };

    await axios.post(
      `${CRM_API_URL}/api/communications/callback`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      }
    );

    console.log(`✓ Callback sent: ${event} for ${msg.customer_name}`);
  } catch (error) {
    const errMessage = error.response?.data?.message || error.message;
    console.error(`✗ Failed to send callback (Attempt ${attempt}/${maxAttempts}) for ${msg.customer_name}: ${errMessage}`);
    
    if (attempt < maxAttempts) {
      const backoffMs = 2000 * attempt;
      console.log(`[Simulator] Retrying callback in ${backoffMs}ms...`);
      setTimeout(() => {
        sendCallback(messageId, msg, event, token, attempt + 1);
      }, backoffMs);
    } else {
      console.error(`✗ [Simulator] Permanent webhook failure: dropped callback ${event} for ${msg.customer_name}`);
    }
  }
}

// View queued messages (for debugging)
app.get('/api/queue', (req, res) => {
  res.json({
    queued_messages: messageQueue.length,
    messages: messageQueue.map((m) => ({
      id: m.id,
      campaign_id: m.campaign_id,
      customer_id: m.customer_id,
      channel: m.channel,
      status: m.status,
    })),
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Channel Service running on port ${PORT}`);
});

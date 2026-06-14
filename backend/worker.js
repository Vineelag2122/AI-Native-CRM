import pool from './config/db.js';
import axios from 'axios';
import { generateToken } from './middleware/auth.js';

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';
const BATCH_SIZE = 5;
const POLL_INTERVAL_MS = 2000;

export async function processJobs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch pending jobs using SKIP LOCKED
    const result = await client.query(
      `SELECT j.id, j.campaign_id, j.customer_id, j.channel, j.message, j.retry_count, j.max_retries, c.name as customer_name
       FROM campaign_jobs j
       JOIN customers c ON j.customer_id = c.id
       WHERE j.status = 'pending' AND j.next_run_at <= NOW()
       ORDER BY j.created_at ASC
       LIMIT $1
       FOR UPDATE OF j SKIP LOCKED`,
      [BATCH_SIZE]
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    console.log(`[Queue Worker] Processing ${result.rows.length} pending campaign dispatches...`);

    for (const job of result.rows) {
      // Set to processing
      await client.query(
        `UPDATE campaign_jobs SET status = 'processing', updated_at = NOW() WHERE id = $1`,
        [job.id]
      );

      // Fetch campaign owner user_id to sign JWT token
      const ownerResult = await client.query(
        `SELECT user_id FROM campaigns WHERE id = $1`,
        [job.campaign_id]
      );
      const userId = ownerResult.rows[0]?.user_id;
      const workerToken = generateToken(userId);

      // Create communication record
      const commResult = await client.query(
        `INSERT INTO communications (campaign_id, customer_id, channel, message, status, sent_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())
         RETURNING id`,
        [job.campaign_id, job.customer_id, job.channel, job.message]
      );
      const communicationId = commResult.rows[0].id;

      try {
        const response = await axios.post(
          `${CHANNEL_SERVICE_URL}/api/send`,
          {
            campaign_id: job.campaign_id,
            customer_id: job.customer_id,
            customer_name: job.customer_name,
            channel: job.channel,
            message: job.message,
            token: workerToken
          },
          { timeout: 5000 }
        );

        const externalId = response.data.message_id;

        // Mark completed and link external id
        await client.query(
          `UPDATE campaign_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`,
          [job.id]
        );

        await client.query(
          `UPDATE communications SET external_id = $1, status = 'sent', updated_at = NOW() WHERE id = $2`,
          [externalId, communicationId]
        );

      } catch (error) {
        const errMessage = error.response?.data?.message || error.message;
        console.error(`[Queue Worker] Dispatch failed for customer ${job.customer_name}:`, errMessage);

        const nextRetry = job.retry_count + 1;
        if (nextRetry < job.max_retries) {
          // Exponential backoff
          const backoffSeconds = 10 * nextRetry;
          await client.query(
            `UPDATE campaign_jobs
             SET status = 'pending',
                 retry_count = $1,
                 error_message = $2,
                 next_run_at = NOW() + INTERVAL '1 second' * $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [nextRetry, errMessage, backoffSeconds, job.id]
          );

          await client.query(
            `UPDATE communications SET status = 'pending', updated_at = NOW() WHERE id = $1`,
            [communicationId]
          );
        } else {
          // Failed permanently
          await client.query(
            `UPDATE campaign_jobs
             SET status = 'failed',
                 retry_count = $1,
                 error_message = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [nextRetry, errMessage, job.id]
          );

          await client.query(
            `UPDATE communications SET status = 'failed', updated_at = NOW() WHERE id = $1`,
            [communicationId]
          );
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Queue Worker] Transaction failed:', error);
  } finally {
    client.release();
  }
}

let isRunning = false;
export function startWorker() {
  console.log('[Queue Worker] Starting database background worker interval...');
  setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await processJobs();
    } catch (err) {
      console.error('[Queue Worker] Tick error:', err);
    } finally {
      isRunning = false;
    }
  }, POLL_INTERVAL_MS);
}

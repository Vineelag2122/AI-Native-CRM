// backend/seed.js
// Realistic seeding: users, 500 customers with realistic names/emails, orders, templates, segments,
// segment_members, campaigns, communications, campaign_analytics, campaign_insights.
// Usage: node seed.js  (ensure backend/.env has DATABASE_URL)

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function createAdmin() {
  const username = 'admin', email = 'admin@example.com', password = 'Password123!';
  const existing = await pool.query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, email]);
  if (existing.rowCount) {
    console.log('Admin exists id=', existing.rows[0].id);
    return existing.rows[0].id;
  }
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    `INSERT INTO users (username,email,password_hash,created_at,updated_at) VALUES ($1,$2,$3,NOW(),NOW()) RETURNING id`,
    [username, email, hash]
  );
  console.log('Created admin id=', res.rows[0].id, 'password=', password);
  return res.rows[0].id;
}

async function createCustomers(userId, count = 500) {
  const batchSize = 100;
  let inserted = 0;
  for (let b = 0; b < Math.ceil(count / batchSize); b++) {
    const values = [];
    const params = [];
    let paramIdx = 1;
    const start = b * batchSize;
    const end = Math.min(count, start + batchSize);
    for (let i = start; i < end; i++) {
      const name = faker.person.fullName().slice(0,255);
      const email = faker.internet.email(name).toLowerCase().replace(/[^a-z0-9@._-]/g,'').slice(0,255);
      const rawPhone = faker.phone.number();
      const phone = rawPhone.replace(/\D/g,'').slice(0,20);
      const city = faker.location.city().slice(0,100);
      const gender = faker.helpers.arrayElement(['Male','Female','Other']).slice(0,50);
      const signup = faker.date.between({from: '2022-01-01', to: new Date()});
      params.push(userId, name, email, phone, city, gender, signup);
      values.push(`($${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},NOW(),NOW())`);
    }
    const q = `INSERT INTO customers (user_id,name,email,phone,city,gender,signup_date,created_at,updated_at) VALUES ${values.join(',')}`;
    await pool.query(q, params);
    inserted += (end - start);
    process.stdout.write(`Inserted customers: ${inserted}\r`);
  }
  console.log('\nCustomers insertion complete.');
}

async function createOrders(userId) {
  const res = await pool.query('SELECT id FROM customers');
  const customers = res.rows.map(r => r.id);
  let totalOrders = 0;
  for (const cid of customers) {
    const n = randInt(0,5);
    for (let i=0;i<n;i++) {
      const externalId = 'ORD-' + faker.string.alphanumeric(8).toUpperCase();
      const amount = Number((Math.random() * 15000 + 100).toFixed(2));
      const orderDate = faker.date.between({from: '2022-01-01', to: new Date()});
      const category = faker.commerce.department();
      await pool.query(
        `INSERT INTO orders (user_id,customer_id,order_id_external,amount,order_date,product_category,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [userId, cid, externalId, amount, orderDate, category]
      );
      totalOrders++;
    }
  }
  console.log(`Inserted ${totalOrders} orders.`);
}

async function createTemplates(userId) {
  const templates = [
    {name:'Welcome', category:'Onboarding', text:'Hi {{name}}, welcome! Use code WELCOME10 for 10% off.', channels: ['SMS','Email']},
    {name:'AbandonedCart', category:'Recovery', text:'Hi {{name}}, you left items in your cart. Get 15% off now.', channels: ['Email','SMS']},
    {name:'FestivalSale', category:'Offer', text:'Festival sale: up to 30% off on select items. Shop now!', channels: ['Email']}
  ];
  const ids = [];
  for (const t of templates) {
    const r = await pool.query(
      `INSERT INTO message_templates (user_id,name,category,template_text,channels,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id`,
      [userId,t.name,t.category,t.text,t.channels]
    );
    ids.push(r.rows[0].id);
  }
  console.log(`Inserted ${ids.length} templates.`);
  return ids;
}

async function createSegments(userId) {
  const segments = [
    {name:'BigSpenders', description:'Customers with total spend > 8000', filters:{and:[{field:'total_spend',op:'>',value:8000}]}, type:'manual'},
    {name:'RecentBuyers', description:'Orders in last 60 days', filters:{and:[{field:'last_purchase_days',op:'<=',value:60}]}, type:'manual'},
    {name:'ChurnRisk', description:'No purchase in 180+ days', filters:{and:[{field:'last_purchase_days',op:'>',value:180}]}, type:'ai_generated'}
  ];
  const ids = [];
  for (const s of segments) {
    const r = await pool.query(
      `INSERT INTO segments (user_id,name,description,filters,segment_type,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id`,
      [userId,s.name,s.description,s.filters,s.type]
    );
    ids.push(r.rows[0].id);
  }
  console.log(`Inserted ${ids.length} segments.`);
  return ids;
}

async function populateSegmentMembers(segmentIds) {
  for (let idx=0; idx<segmentIds.length; idx++) {
    const segId = segmentIds[idx];
    if (idx===0) {
      const q = `
        INSERT INTO segment_members (segment_id, customer_id, created_at)
        SELECT $1, c.id, NOW()
        FROM customers c
        JOIN (
          SELECT customer_id, COALESCE(SUM(amount),0) as total_spend FROM orders GROUP BY customer_id
        ) o ON c.id = o.customer_id
        WHERE o.total_spend > 8000
        RETURNING customer_id`;
      const r = await pool.query(q, [segId]);
      console.log(`Segment ${segId} members: ${r.rowCount}`);
    } else if (idx===1) {
      const q = `
        INSERT INTO segment_members (segment_id, customer_id, created_at)
        SELECT $1, DISTINCT o.customer_id, NOW()
        FROM orders o
        WHERE o.order_date >= NOW() - INTERVAL '60 days'
        RETURNING customer_id`;
      // Use safer approach: insert unique customers from orders in last 60 days
      const customers = await pool.query(`SELECT DISTINCT customer_id FROM orders WHERE order_date >= NOW() - INTERVAL '60 days'`);
      let added = 0;
      for (const row of customers.rows) {
        try {
          await pool.query(`INSERT INTO segment_members (segment_id, customer_id, created_at) VALUES ($1,$2,NOW())`, [segId, row.customer_id]);
          added++;
        } catch (e) { /* ignore dupes */ }
      }
      console.log(`Segment ${segId} members: ${added}`);
    } else {
      const q = `
        INSERT INTO segment_members (segment_id, customer_id, created_at)
        SELECT $1, c.id, NOW()
        FROM customers c
        LEFT JOIN (
          SELECT customer_id, MAX(order_date) as last_order, COALESCE(SUM(amount),0) as total_spend FROM orders GROUP BY customer_id
        ) o ON c.id = o.customer_id
        WHERE COALESCE(o.total_spend,0) > 3000 AND (o.last_order IS NULL OR o.last_order < NOW() - INTERVAL '180 days')
        RETURNING customer_id`;
      const r = await pool.query(q, [segId]);
      console.log(`Segment ${segId} members: ${r.rowCount}`);
    }
  }
}

async function createCampaigns(userId, segmentIds, templateIds) {
  const campIds = [];
  for (let i=0;i<segmentIds.length;i++) {
    const seg = segmentIds[i];
    const tmpl = templateIds[i % templateIds.length];
    const name = `Seed Campaign - ${i+1}`;
    const message = faker.lorem.sentences(randInt(1,2));
    const r = await pool.query(
      `INSERT INTO campaigns (user_id, segment_id, campaign_name, message_template_id, channel, message_content, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'sent',NOW(),NOW()) RETURNING id`,
      [userId, seg, name, tmpl, 'SMS', message]
    );
    campIds.push(r.rows[0].id);
  }
  console.log(`Created ${campIds.length} campaigns.`);
  return campIds;
}

async function createCommunicationsAndAnalytics(campaignIds) {
  for (const campId of campaignIds) {
    const membersRes = await pool.query(
      `SELECT customer_id FROM segment_members WHERE segment_id = (SELECT segment_id FROM campaigns WHERE id=$1)`,
      [campId]
    );
    const members = membersRes.rows.map(r => r.customer_id);
    let sent = 0, delivered = 0, opened = 0, clicked = 0, failed = 0, converted = 0;
    for (const custId of members) {
      const statusChoices = ['delivered','failed','delivered','delivered'];
      const status = statusChoices[Math.floor(Math.random()*statusChoices.length)];
      if (status === 'delivered') delivered++; else failed++;
      let openedFlag = false;
      if (status === 'delivered' && Math.random() > 0.2) { openedFlag = true; opened++; }
      let clickedFlag = false;
      if (openedFlag && Math.random() > 0.4) { clickedFlag = true; clicked++; }
      let convertedFlag = false;
      if (clickedFlag && Math.random() > 0.2) { convertedFlag = true; converted++; }
      const message = `Seed message for customer ${custId}`;
      const externalId = uuidv4();
      const sentAt = faker.date.recent({days:30});
      const deliveredAt = status === 'delivered' ? sentAt : null;
      const openedAt = openedFlag ? new Date(Date.now() + 10000) : null;
      const clickedAt = clickedFlag ? new Date(Date.now() + 30000) : null;
      await pool.query(
        `INSERT INTO communications (campaign_id, customer_id, channel, message, status, external_id, sent_at, delivered_at, opened_at, clicked_at, converted, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
        [campId, custId, 'SMS', message, status, externalId, sentAt, deliveredAt, openedAt, clickedAt, convertedFlag]
      );
      sent++;
    }
    const delivery_rate = sent ? (delivered/sent*100).toFixed(2) : 0;
    const open_rate = sent ? (opened/sent*100).toFixed(2) : 0;
    const click_rate = sent ? (clicked/sent*100).toFixed(2) : 0;
    const conversion_rate = sent ? (converted/sent*100).toFixed(2) : 0;
    await pool.query(
      `INSERT INTO campaign_analytics (campaign_id,total_sent,total_delivered,total_opened,total_clicked,total_converted,total_failed,delivery_rate,open_rate,click_rate,conversion_rate,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [campId,sent,delivered,opened,clicked,converted,failed,delivery_rate,open_rate,click_rate,conversion_rate]
    );
    await pool.query(
      `INSERT INTO campaign_insights (user_id, insight_text, insight_type, related_campaign_id, created_at)
       VALUES ((SELECT user_id FROM campaigns WHERE id=$1), $2, 'performance', $1, NOW())`,
      [campId, `Campaign ${campId} seed insight: delivery ${delivery_rate}%, open ${open_rate}%`]
    );
    console.log(`Campaign ${campId}: communications ${sent}, delivered ${delivered}, opened ${opened}, clicked ${clicked}, converted ${converted}`);
  }
}

async function main() {
  try {
    console.log('Seeding started...');
    const userId = await createAdmin();
    await createCustomers(userId, 500);
    await createOrders(userId);
    const tmplIds = await createTemplates(userId);
    const segIds = await createSegments(userId);
    await populateSegmentMembers(segIds);
    const campIds = await createCampaigns(userId, segIds, tmplIds);
    await createCommunicationsAndAnalytics(campIds);
    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'))
    ? { rejectUnauthorized: false }
    : false,
});

async function main() {
  try {
    console.log('Connecting to PostgreSQL database...');
    
    // Check if users table already exists to prevent duplicate execution errors
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename  = 'users'
      );
    `);
    
    if (checkResult.rows[0].exists) {
      console.log('✅ Database schema already exists. Skipping initialization and seeding.');
      return;
    }

    const schemaPath = path.join(__dirname, 'database_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Initializing database schema...');
    await pool.query(sql);
    console.log('✅ Database schema initialized successfully!');

    console.log('Seeding database with mock data...');
    try {
      execSync('node seed.js', { stdio: 'inherit', env: { ...process.env } });
      console.log('✅ Seeding completed successfully!');
    } catch (seedError) {
      console.error('❌ Database seeding failed:', seedError.message);
    }
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();

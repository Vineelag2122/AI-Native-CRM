-- Create schema for AI-Native CRM

-- Users Table (for app users/marketers)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  city VARCHAR(100),
  gender VARCHAR(50),
  signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, email)
);

-- Orders Table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id_external VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  order_date TIMESTAMP NOT NULL,
  product_category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, order_id_external)
);

-- Create index for faster analytics queries
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_customers_user_id ON customers(user_id);

-- Segments Table (Manual & AI-generated)
CREATE TABLE segments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL, -- Store AND/OR logic as JSON
  segment_type VARCHAR(50), -- 'manual' or 'ai_generated'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Segment Members (Many-to-Many)
CREATE TABLE segment_members (
  id SERIAL PRIMARY KEY,
  segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(segment_id, customer_id)
);

-- Message Templates
CREATE TABLE message_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'Birthday Offer', 'Festival Offer', etc.
  template_text TEXT NOT NULL,
  channels TEXT[], -- ['WhatsApp', 'SMS', 'Email', 'RCS']
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns Table
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  message_template_id INTEGER REFERENCES message_templates(id),
  channel VARCHAR(50) NOT NULL, -- 'WhatsApp', 'SMS', 'Email', 'RCS'
  message_content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communications Table (tracks individual messages sent)
CREATE TABLE communications (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked'
  external_id VARCHAR(255), -- ID from channel service
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  read_at TIMESTAMP,
  clicked_at TIMESTAMP,
  converted BOOLEAN DEFAULT FALSE,
  conversion_order_id INTEGER REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Analytics (Aggregated stats)
CREATE TABLE campaign_analytics (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER UNIQUE NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5, 2) DEFAULT 0,
  read_rate DECIMAL(5, 2) DEFAULT 0,
  open_rate DECIMAL(5, 2) DEFAULT 0,
  click_rate DECIMAL(5, 2) DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Insights (AI-generated insights)
CREATE TABLE campaign_insights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  insight_type VARCHAR(100), -- 'performance', 'recommendation', 'trend'
  related_campaign_id INTEGER REFERENCES campaigns(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Queue Table (for resilient background dispatching)
CREATE TABLE campaign_jobs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  next_run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_segments_user_id ON segments(user_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_segment_id ON campaigns(segment_id);
CREATE INDEX idx_communications_campaign_id ON communications(campaign_id);
CREATE INDEX idx_communications_customer_id ON communications(customer_id);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_jobs_status_run ON campaign_jobs(status, next_run_at);

# AI-Native Mini CRM - Xeno Take-Home Assignment

## Project Overview

Build an **AI-native Mini CRM** for reaching shoppers intelligently. A Direct-to-Consumer brand can use this platform to:
- **Ingest** customer data and purchase history
- **Segment** audiences using AI or manual rules
- **Send** personalized messages via WhatsApp, SMS, Email, RCS
- **Track** campaign performance and engagement metrics
- **Analyze** insights with AI

This is a two-service architecture: **CRM backend** + **Stub Channel Service** with callback-driven delivery simulation.

---

## Core Modules (13 Must-Have)

### 1. **Authentication Module**
- Signup, Login, Logout
- User sessions & authorization

### 2. **Customer Management Module**
- Add, Edit, Delete, View customers
- Store: Name, Email, Phone, City, Gender, Signup Date

### 3. **Order Management Module**
- Add, View orders and order history
- Store: Order ID, Customer ID, Amount, Date, Product Category

### 4. **Customer Analytics Module**
- Calculate per-customer metrics:
  - Total Spend, Average Order Value
  - Last Purchase Date, Order Count

### 5. **Manual Audience Segmentation**
- Build segments with AND/OR logic
- Example: `Spend > ₹5000 AND Last Purchase > 90 days`

### 6. **AI Segment Builder** ⭐
- User types: *"Show customers who spend a lot but haven't ordered recently"*
- AI converts to segment filters automatically

### 7. **Campaign Management Module**
- Create campaigns with: Name, Segment, Channel, Message
- Example: Weekend Sale targeting high-spenders

### 8. **AI Campaign Generator** ⭐
- User enters: *"Increase coffee sales this weekend"*
- AI generates: Segment (coffee buyers) + Message + Channel

### 9. **Message Template Library**
- Pre-built templates: Birthday Offer, Festival Offer, Win Back, New Launch

### 10. **Stub Channel Service** (Separate Microservice)
- Receives: `{customer, channel, message}`
- Returns simulated outcomes: Delivered, Opened, Clicked, Failed

### 11. **Receipt Callback Module**
- Receives async updates from Channel Service
- Updates campaign stats (delivery, open, click, conversion)

### 12. **Campaign Analytics Dashboard** 📊
- Metrics: Sent, Delivered, Opened, Clicked, Converted, Failed
- Charts: Bar, Pie, Funnel

### 13. **AI Insights Module** ⭐
- AI analyzes results: *"SMS campaigns perform 30% better for inactive customers"*

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React.js + JavaScript + TailwindCSS |
| **Charting** | Recharts |
| **Backend** | Node.js + Express + JavaScript |
| **Database** | PostgreSQL |
| **AI/LLM** | Claude API (Anthropic) |
| **Channel Service** | Node.js + Express (Separate) |
| **Deployment** | Vercel (Frontend) + Railway (Backend) |

### Why This Stack?
- ✅ Unified JavaScript across stack (faster development)
- ✅ React for dynamic dashboards and AI interactions
- ✅ PostgreSQL for complex customer & campaign queries
- ✅ Claude API for AI-native segment & campaign generation
- ✅ Two-service architecture for callback simulation

---

## System Architecture

```
┌─────────────────────────┐
│   React.js Frontend     │
│  (Dashboard, Campaigns) │
└────────────┬────────────┘
             │ HTTP/REST
┌────────────▼────────────────────────┐
│   Node.js + Express Backend         │
│  (Auth, Customers, Orders, etc.)    │
│  Integrates Claude API for AI       │
└────────────┬──────────┬─────────────┘
             │          │
             │ HTTP     │ HTTP
             │          │
    ┌────────▼──┐  ┌───▼──────────┐
    │ PostgreSQL │  │ Channel Svc  │
    │ Database   │  │ (Simulator)  │
    └────────────┘  └───┬──────────┘
                        │
                  Async Callbacks
                  (delivery, open,
                   click, failed)
                        │
                    ┌───▼──────────┐
                    │ CRM Receipts  │
                    │ API Endpoint  │
                    └───────────────┘
```

---

## Build Order

1. **Database Schema Design** — Foundation for all modules
2. **Auth Module** — Users & sessions
3. **Customer Management** — Add/Edit/Delete/View
4. **Order Management** — Purchase history
5. **Customer Analytics** — Metrics per customer
6. **Message Templates** — Small, decoupled
7. **Manual Segmentation** — Rule builder UI
8. **Campaign Management** — Create campaigns
9. **Stub Channel Service** — Separate microservice (simulates delivery)
10. **Receipt Callback** — Receives & updates metrics
11. **Campaign Analytics Dashboard** — Visualize performance
12. **AI Segment Builder** — Claude API integration
13. **AI Campaign Generator** — Full AI loop
14. **AI Insights Module** — Analyze results

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Claude API key (from Anthropic)

### Quick Start (Coming Soon)
```bash
# Clone repo
git clone <repo-url>
cd AI-Native-CRM

# Setup backend
cd backend
npm install
# .env: DATABASE_URL, CLAUDE_API_KEY
npm run dev

# Setup frontend (new terminal)
cd ../frontend
npm install
npm run dev

# Setup channel service (new terminal)
cd ../channel-service
npm install
npm run dev
```


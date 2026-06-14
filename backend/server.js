import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';
import { startWorker } from './worker.js';
import * as authController from './routes/auth.js';
import * as customerController from './routes/customers.js';
import * as orderController from './routes/orders.js';
import * as communicationController from './routes/communications.js';
import * as analyticsController from './routes/analytics.js';
import * as segmentController from './routes/segments.js';
import * as aiController from './routes/ai.js';
import * as templateController from './routes/templates.js';
import * as campaignController from './routes/campaigns.js';
import * as aiCampaignController from './routes/aiCampaigns.js';
import * as campaignAnalyticsController from './routes/campaignAnalytics.js';
import * as insightsController from './routes/insights.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend API is running' });
});

// Auth Routes
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', authMiddleware, authController.logout);
app.get('/api/auth/profile', authMiddleware, authController.getProfile);

// Customer Routes
app.get('/api/customers', authMiddleware, customerController.getCustomers);
app.get('/api/customers/:id', authMiddleware, customerController.getCustomer);
app.post('/api/customers', authMiddleware, customerController.addCustomer);
app.put('/api/customers/:id', authMiddleware, customerController.editCustomer);
app.delete('/api/customers/:id', authMiddleware, customerController.deleteCustomer);

// Order Routes
app.get('/api/orders', authMiddleware, orderController.getOrders);
app.get('/api/orders/:id', authMiddleware, orderController.getOrder);
app.get('/api/customers/:customerId/orders', authMiddleware, orderController.getCustomerOrders);
app.post('/api/orders', authMiddleware, orderController.addOrder);
app.put('/api/orders/:id', authMiddleware, orderController.editOrder);
app.delete('/api/orders/:id', authMiddleware, orderController.deleteOrder);

// Communication/Callback Routes
app.post('/api/communications/callback', authMiddleware, communicationController.receiveCallback);
app.get('/api/communications/:id', authMiddleware, communicationController.getCommunication);
app.get('/api/campaigns/:campaignId/communications', authMiddleware, communicationController.getCampaignCommunications);
app.get('/api/communications/:id/timeline', authMiddleware, communicationController.getCommunicationTimeline);

// Analytics Routes
app.get('/api/analytics/customers', authMiddleware, analyticsController.getCustomerAnalytics);
app.get('/api/analytics/customers/:customerId', authMiddleware, analyticsController.getCustomerAnalyticsDetail);
app.get('/api/analytics/top-customers', authMiddleware, analyticsController.getTopCustomers);
app.get('/api/analytics/inactive-customers', authMiddleware, analyticsController.getInactiveCustomers);
app.get('/api/analytics/spend-range', authMiddleware, analyticsController.getCustomersBySpend);
app.get('/api/analytics/summary', authMiddleware, analyticsController.getAnalyticsSummary);

// Segment Routes (Manual Segmentation)
app.get('/api/segments', authMiddleware, segmentController.getSegments);
app.get('/api/segments/:id', authMiddleware, segmentController.getSegment);
app.post('/api/segments', authMiddleware, segmentController.createSegment);
app.put('/api/segments/:id', authMiddleware, segmentController.updateSegment);
app.delete('/api/segments/:id', authMiddleware, segmentController.deleteSegment);
app.post('/api/segments/preview', authMiddleware, segmentController.previewSegment);

// AI Routes
app.post('/api/ai/generate-segment', authMiddleware, aiController.generateSegmentFromDescription);
app.post('/api/ai/generate-campaign', authMiddleware, aiController.generateCampaignFromIntent);

// Template Routes
app.get('/api/templates', authMiddleware, templateController.getTemplates);
app.get('/api/templates/:id', authMiddleware, templateController.getTemplate);
app.post('/api/templates', authMiddleware, templateController.createTemplate);
app.put('/api/templates/:id', authMiddleware, templateController.updateTemplate);
app.delete('/api/templates/:id', authMiddleware, templateController.deleteTemplate);
app.get('/api/templates/category/:category', authMiddleware, templateController.getTemplatesByCategory);
app.get('/api/templates/categories/list', authMiddleware, templateController.getTemplateCategories);

// Campaign Routes
app.get('/api/campaigns', authMiddleware, campaignController.getCampaigns);
app.get('/api/campaigns/:id', authMiddleware, campaignController.getCampaign);
app.post('/api/campaigns', authMiddleware, campaignController.createCampaign);
app.put('/api/campaigns/:id', authMiddleware, campaignController.updateCampaign);
app.post('/api/campaigns/:id/send', authMiddleware, campaignController.sendCampaign);
app.delete('/api/campaigns/:id', authMiddleware, campaignController.deleteCampaign);
app.get('/api/campaigns/:id/preview', authMiddleware, campaignController.previewCampaign);

// AI Campaign Routes
app.post('/api/ai-campaigns/suggest', authMiddleware, aiCampaignController.generateCampaignFromIntent);
app.post('/api/ai-campaigns/create', authMiddleware, aiCampaignController.generateCampaignAndCreate);
app.post('/api/ai-campaigns/improve-message', authMiddleware, aiCampaignController.improveMessage);

// Campaign Analytics Routes
app.get('/api/campaign-analytics/:id/metrics', authMiddleware, campaignAnalyticsController.getCampaignMetrics);
app.get('/api/campaign-analytics/summary', authMiddleware, campaignAnalyticsController.getCampaignsSummary);
app.get('/api/campaign-analytics/business-metrics', authMiddleware, campaignAnalyticsController.getBusinessMetrics);
app.get('/api/campaign-analytics/:id/funnel', authMiddleware, campaignAnalyticsController.getEngagementFunnel);

// Insights Routes
app.get('/api/insights/:campaignId/generate', authMiddleware, insightsController.generateCampaignInsights);
app.get('/api/insights', authMiddleware, insightsController.getInsights);
app.delete('/api/insights/:id', authMiddleware, insightsController.deleteInsight);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
  startWorker();
});

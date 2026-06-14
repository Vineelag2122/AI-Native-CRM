import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import OrdersPage from './pages/OrdersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SegmentsPage from './pages/SegmentsPage';
import AISegmentBuilderPage from './pages/AISegmentBuilderPage';
import TemplatesPage from './pages/TemplatesPage';
import CampaignsPage from './pages/CampaignsPage';
import AICampaignGeneratorPage from './pages/AICampaignGeneratorPage';
import CampaignAnalyticsDetailPage from './pages/CampaignAnalyticsDetailPage';
import InsightsPage from './pages/InsightsPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/segments"
            element={
              <ProtectedRoute>
                <SegmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-segments"
            element={
              <ProtectedRoute>
                <AISegmentBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <CampaignsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-campaigns"
            element={
              <ProtectedRoute>
                <AICampaignGeneratorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaign-analytics/:id"
            element={
              <ProtectedRoute>
                <CampaignAnalyticsDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <InsightsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

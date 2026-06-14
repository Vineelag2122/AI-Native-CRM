import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { analyticsAPI } from '../services/analyticsAPI';
import { campaignAnalyticsAPI } from '../services/campaignAnalyticsAPI';
import { customerAPI } from '../services/customerAPI';
import { orderAPI } from '../services/orderAPI';

const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    total_customers: 0,
    total_orders: 0,
    total_revenue: 0,
  });
  const [campaignMetrics, setCampaignMetrics] = useState({
    total_campaigns: 0,
    total_messages_sent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Primary sources: analytics summary and campaign metrics
        const [sumRes, campRes] = await Promise.all([
          analyticsAPI.getSummary(token).catch((e) => ({ error: e })),
          campaignAnalyticsAPI.getBusinessMetrics(token).catch((e) => ({ error: e })),
        ]);

        // Secondary fallback: fetch raw customers and orders if summary reports 0
        const [customers, orders] = await Promise.all([
          customerAPI.getAll(token).catch(() => []),
          orderAPI.getAll(token).catch(() => []),
        ]);

        const totalCustomersFromAPI = Array.isArray(customers) ? customers.length : 0;
        const totalOrdersFromAPI = Array.isArray(orders) ? orders.length : 0;
        const totalRevenueFromAPI = Array.isArray(orders)
          ? orders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0)
          : 0;

        const total_customers = (sumRes && !sumRes.error && sumRes.total_customers) || totalCustomersFromAPI || 0;
        const total_orders = (sumRes && !sumRes.error && sumRes.total_orders) || totalOrdersFromAPI || 0;
        const total_revenue = (sumRes && !sumRes.error && sumRes.total_revenue) || totalRevenueFromAPI || 0;

        const total_campaigns = (campRes && !campRes.error && campRes.total_campaigns) || 0;
        const total_messages_sent = (campRes && !campRes.error && campRes.total_messages_sent) || 0;

        setSummary({ total_customers, total_orders, total_revenue });
        setCampaignMetrics({ total_campaigns, total_messages_sent });

        // If analytics endpoints failed but raw APIs succeeded, surface a gentle warning
        if ((sumRes && sumRes.error) || (campRes && campRes.error)) {
          setError('Some analytics endpoints failed; showing fallback counts from raw APIs.');
          console.warn('Analytics summary or campaign metrics failed:', sumRes.error || campRes.error);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data. See console for details.');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
    else setLoading(false);
  }, [token]);

  return (
    <div className="min-h-screen flex">
      <Sidebar active="/dashboard" />

      <div className="flex-1 app-container">
        <h1 className="text-3xl font-bold mb-6">Welcome, {user?.username || 'admin'}</h1>

        {error && (
          <div className="mb-4 p-3 rounded bg-yellow-900 text-yellow-100">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <h3 className="text-muted text-sm">Total Customers</h3>
            <p className="text-3xl font-bold mt-2">{loading ? '...' : summary.total_customers}</p>
          </div>

          <div className="card">
            <h3 className="text-muted text-sm">Active Campaigns</h3>
            <p className="text-3xl font-bold mt-2">{loading ? '...' : campaignMetrics.total_campaigns}</p>
          </div>

          <div className="card">
            <h3 className="text-muted text-sm">Messages Sent</h3>
            <p className="text-3xl font-bold mt-2">{loading ? '...' : campaignMetrics.total_messages_sent}</p>
          </div>

          <div className="card">
            <h3 className="text-muted text-sm">Revenue</h3>
            <p className="text-3xl font-bold mt-2">{loading ? '...' : `₹${summary.total_revenue}`}</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/customers')}
              className="btn-primary w-full"
            >
              Add Customer
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="btn-primary w-full"
            >
              View Orders
            </button>
            <button className="btn-primary w-full">Build Segment</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

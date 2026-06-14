import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/analyticsAPI';
import Sidebar from '../components/Sidebar';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AnalyticsPage = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, top, inactive
  const [inactiveDays, setInactiveDays] = useState(60);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (filter === 'top') {
        data = await analyticsAPI.getTopCustomers(10, token);
      } else if (filter === 'inactive') {
        data = await analyticsAPI.getInactiveCustomers(inactiveDays, token);
      } else {
        data = await analyticsAPI.getAll(token);
      }
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, inactiveDays, token]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await analyticsAPI.getSummary(token);
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  // Prepare data for charts
  const topSpenders = analytics.slice(0, 5).map((c) => ({
    name: c.name,
    spend: parseFloat(c.total_spend),
  }));

  const orderDistribution = analytics.reduce((acc, customer) => {
    const bucketIndex = Math.min(
      Math.floor(customer.order_count / 10),
      5
    );
    const bucket = bucketIndex * 10;
    const existing = acc.find((b) => b.range === `${bucket}-${bucket + 10}`);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ range: `${bucket}-${bucket + 10}`, count: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/analytics" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Customer Analytics</h1>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-gray-400 text-sm">Total Customers</h3>
                <p className="text-3xl font-bold mt-2">{summary.total_customers}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-gray-400 text-sm">Total Orders</h3>
                <p className="text-3xl font-bold mt-2">{summary.total_orders}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-gray-400 text-sm">Total Revenue</h3>
                <p className="text-3xl font-bold mt-2">₹{parseFloat(summary.total_revenue).toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-gray-400 text-sm">Avg Customer LTV</h3>
                <p className="text-3xl font-bold mt-2">₹{parseFloat(summary.avg_customer_ltv).toLocaleString()}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
              {error}
            </div>
          )}

          {/* Filter Buttons */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Filters</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-4 py-2 rounded transition ${
                  filter === 'all'
                    ? 'bg-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                All Customers
              </button>
              <button
                onClick={() => handleFilterChange('top')}
                className={`px-4 py-2 rounded transition ${
                  filter === 'top'
                    ? 'bg-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Top Spenders
              </button>
              <button
                onClick={() => handleFilterChange('inactive')}
                className={`px-4 py-2 rounded transition ${
                  filter === 'inactive'
                    ? 'bg-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Inactive
              </button>
              {filter === 'inactive' && (
                <select
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(Number(e.target.value))}
                  className="bg-gray-700 px-4 py-2 rounded"
                >
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 180 days</option>
                </select>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {topSpenders.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4">Top 5 Spenders</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topSpenders}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Bar dataKey="spend" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {orderDistribution.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4">Order Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, count }) => `${range}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {orderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Analytics Table */}
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : analytics.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No analytics data</div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Orders</th>
                    <th className="px-4 py-3 text-left">Total Spend</th>
                    <th className="px-4 py-3 text-left">Avg Order Value</th>
                    <th className="px-4 py-3 text-left">Last Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((customer) => (
                    <tr key={customer.id} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">{customer.name}</td>
                      <td className="px-4 py-3">{customer.order_count}</td>
                      <td className="px-4 py-3 font-semibold">₹{parseFloat(customer.total_spend).toLocaleString()}</td>
                      <td className="px-4 py-3">₹{parseFloat(customer.average_order_value).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {customer.last_purchase_date
                          ? new Date(customer.last_purchase_date).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

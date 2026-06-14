import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAnalyticsAPI } from '../services/campaignAnalyticsAPI';
import { insightsAPI } from '../services/insightsAPI';
import Sidebar from '../components/Sidebar';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CampaignAnalyticsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [id]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, funnelData] = await Promise.all([
        campaignAnalyticsAPI.getMetrics(id, token),
        campaignAnalyticsAPI.getFunnel(id, token),
      ]);
      setMetrics(metricsData);
      setFunnel(funnelData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-red-400">Error: {error}</div>
      </div>
    );
  }

  const analytics = metrics?.analytics || {};
  const statusBreakdown = metrics?.status_breakdown || [];
  const timeline = metrics?.timeline || [];
  const channelPerf = metrics?.channel_performance || [];
  const campaign = metrics?.campaign || {};

  // Prepare data for charts
  const statusData = statusBreakdown.map((item) => ({
    name: item.status.toUpperCase(),
    value: item.count,
  }));

  const timelineData = timeline.map((item) => ({
    time: new Date(item.hour).toLocaleTimeString(),
    total: item.total,
    delivered: item.delivered,
    failed: item.failed,
  }));

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/campaigns" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with Action */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold">{campaign.campaign_name}</h1>
              <p className="text-gray-400 mt-2">
                📧 {campaign.channel} • Segment: {campaign.segment_name} • Status:{' '}
                <span
                  className={`font-semibold ${
                    campaign.status === 'draft' ? 'text-yellow-400' : 'text-green-400'
                  }`}
                >
                  {campaign.status.toUpperCase()}
                </span>
              </p>
            </div>
            <button
              onClick={async () => {
                setGeneratingInsights(true);
                try {
                  await insightsAPI.generate(id, token);
                  alert('✅ Insights generated! Check the Insights page.');
                  navigate('/insights');
                } catch (err) {
                  alert('Error: ' + err.message);
                } finally {
                  setGeneratingInsights(false);
                }
              }}
              disabled={generatingInsights}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-3 rounded transition font-semibold"
            >
              {generatingInsights ? '⏳ Generating...' : '🧠 Generate AI Insights'}
            </button>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Sent</p>
              <p className="text-3xl font-bold mt-2">{analytics.total_sent || 0}</p>
              <p className="text-xs text-gray-500 mt-2">messages</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Delivered</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{analytics.total_delivered || 0}</p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.delivery_rate || 0}% delivery rate
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Opened</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{analytics.total_opened || 0}</p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.open_rate || 0}% open rate
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Read</p>
              <p className="text-3xl font-bold text-cyan-400 mt-2">{analytics.total_read || 0}</p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.read_rate || 0}% read rate
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Clicked</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">{analytics.total_clicked || 0}</p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.click_rate || 0}% click rate
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Converted</p>
              <p className="text-3xl font-bold text-yellow-400 mt-2">
                {analytics.total_converted || 0}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.conversion_rate || 0}% conversion
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Engagement Funnel */}
            {funnel?.funnel && funnel.funnel.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-bold mb-4">🔗 Engagement Funnel</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel
                      data={funnel.funnel}
                      dataKey="value"
                      stroke="#2563eb"
                      fill="#2563eb"
                    >
                      {funnel.funnel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Status Breakdown */}
            {statusData.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-bold mb-4">📊 Status Breakdown</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Timeline Chart */}
          {timelineData.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
              <h2 className="text-lg font-bold mb-4">📈 Delivery Timeline (Last 24h)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="time" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="delivered"
                    stroke="#10b981"
                    name="Delivered"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    name="Total"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="#ef4444"
                    name="Failed"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Channel Performance Table */}
          {channelPerf.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4">📱 Channel Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Channel</th>
                      <th className="px-4 py-3 text-center">Sent</th>
                      <th className="px-4 py-3 text-center">Delivered</th>
                      <th className="px-4 py-3 text-center">Opened</th>
                      <th className="px-4 py-3 text-center">Read</th>
                      <th className="px-4 py-3 text-center">Clicked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelPerf.map((channel) => (
                      <tr key={channel.channel} className="border-t border-gray-700 hover:bg-gray-750">
                        <td className="px-4 py-3 font-semibold">{channel.channel}</td>
                        <td className="px-4 py-3 text-center">{channel.sent}</td>
                        <td className="px-4 py-3 text-center text-green-400">{channel.delivered}</td>
                        <td className="px-4 py-3 text-center text-blue-400">{channel.opened}</td>
                        <td className="px-4 py-3 text-center text-cyan-400">{channel.read || 0}</td>
                        <td className="px-4 py-3 text-center text-purple-400">{channel.clicked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalyticsDetailPage;

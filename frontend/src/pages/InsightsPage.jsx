import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { insightsAPI } from '../services/insightsAPI';
import Sidebar from '../components/Sidebar';

const InsightsPage = () => {
  const { token } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await insightsAPI.getAll(token);
      setInsights(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async (campaignId) => {
    setGenerating(true);
    setGeneratingId(campaignId);
    setError(null);

    try {
      await insightsAPI.generate(campaignId, token);
      alert('✅ Insights generated successfully!');
      fetchInsights();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
      setGeneratingId(null);
    }
  };

  const handleDeleteInsight = async (id) => {
    if (!window.confirm('Delete this insight?')) return;

    try {
      await insightsAPI.delete(id, token);
      setInsights(insights.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/insights" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">🧠 AI Campaign Insights</h1>
          <p className="text-gray-400 mb-8">
            Claude analyzes your campaign performance and provides actionable recommendations
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">Loading insights...</div>
          ) : insights.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No insights yet</p>
              <p className="text-sm mt-2">
                Go to a sent campaign and generate insights for AI analysis
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => {
                const insightData = insight.insight_text;
                return (
                  <div
                    key={insight.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          🎯 Campaign Analysis
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                          Generated: {new Date(insight.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteInsight(insight.id)}
                        className="text-red-400 hover:text-red-300 text-2xl"
                      >
                        ×
                      </button>
                    </div>

                    {/* Performance Summary */}
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <p className="text-gray-300 text-sm mb-2">
                        <strong>📊 Performance Summary:</strong>
                      </p>
                      <p className="text-green-200 text-sm">{insightData.performance_summary}</p>
                    </div>

                    {/* Benchmark Comparison */}
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <p className="text-gray-300 text-sm mb-2">
                        <strong>📈 Benchmark Comparison:</strong>
                      </p>
                      <p className="text-blue-200 text-sm">{insightData.benchmark_comparison}</p>
                    </div>

                    {/* Strengths */}
                    {insightData.strengths && insightData.strengths.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-300 text-sm font-semibold mb-2">✅ Strengths</p>
                        <ul className="space-y-1">
                          {insightData.strengths.map((strength, idx) => (
                            <li key={idx} className="text-green-300 text-sm">
                              • {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {insightData.improvements && insightData.improvements.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-300 text-sm font-semibold mb-2">⚠️ Areas for Improvement</p>
                        <ul className="space-y-1">
                          {insightData.improvements.map((improvement, idx) => (
                            <li key={idx} className="text-yellow-300 text-sm">
                              • {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {insightData.recommendations && insightData.recommendations.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-300 text-sm font-semibold mb-2">💡 Recommendations</p>
                        <ul className="space-y-2">
                          {insightData.recommendations.map((rec, idx) => (
                            <li key={idx} className="bg-blue-900 bg-opacity-30 rounded p-2 text-blue-200 text-sm">
                              {idx + 1}. {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Confidence Score */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">AI Confidence Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{
                              width: `${insightData.confidence_score || 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-purple-300 font-semibold">
                          {insightData.confidence_score || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;

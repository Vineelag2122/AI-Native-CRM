import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiCampaignAPI } from '../services/aiCampaignAPI';
import { segmentAPI } from '../services/segmentAPI';
import { campaignAPI } from '../services/campaignAPI';
import Sidebar from '../components/Sidebar';

const AICampaignGeneratorPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [intent, setIntent] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [messageToImprove, setMessageToImprove] = useState('');
  const [messageObjective, setMessageObjective] = useState('');
  const [improvements, setImprovements] = useState(null);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      const data = await segmentAPI.getAll(token);
      setSegments(data);
    } catch (err) {
      console.error('Error fetching segments:', err);
    }
  };

  const handleGenerateSuggestion = async () => {
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await aiCampaignAPI.generateSuggestion(intent, token);
      setSuggestion(result.campaign);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!selectedSegment) {
      setError('Please select a segment');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await aiCampaignAPI.generateAndCreate(intent, selectedSegment, token);
      alert(`✅ Campaign "${result.campaign.campaign_name}" created successfully!`);
      setIntent('');
      setSuggestion(null);
      setSelectedSegment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImproveMessage = async () => {
    if (!messageToImprove.trim()) {
      setError('Enter a message to improve');
      return;
    }

    setLoading(true);
    setError(null);
    setImprovements(null);

    try {
      const result = await aiCampaignAPI.improveMessage(messageToImprove, messageObjective, token);
      setImprovements(result.improvements);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/ai-campaigns" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">🤖 AI Campaign Generator</h1>
          <p className="text-gray-400 mb-8">Let AI design your next campaign</p>

          {error && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Campaign Suggestion Section */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6">💡 Generate Campaign</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    What's your marketing goal?
                  </label>
                  <textarea
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    placeholder="Examples:
• Increase coffee sales this weekend
• Re-engage inactive customers
• Promote new product launch
• Birthday special offers"
                    className="w-full bg-gray-700 px-4 py-3 rounded text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows="5"
                  />
                </div>

                <button
                  onClick={handleGenerateSuggestion}
                  disabled={loading || !intent.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-3 rounded transition font-semibold"
                >
                  {loading ? '⏳ Generating...' : '✨ Generate Suggestion'}
                </button>
              </div>

              {suggestion && (
                <div className="mt-6 pt-6 border-t border-gray-700 space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2">📧 {suggestion.campaign_name}</h3>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-400">Audience:</p>
                        <p className="text-blue-200">{suggestion.segment_recommendation}</p>
                      </div>

                      <div>
                        <p className="text-gray-400">Message:</p>
                        <p className="text-blue-200 italic">"{suggestion.message}"</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-gray-400 text-xs">Channel</p>
                          <p className="text-yellow-400 font-semibold">{suggestion.channel}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Best Time</p>
                          <p className="text-yellow-400 font-semibold">{suggestion.best_send_time}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-400 text-xs">Why This Works</p>
                        <p className="text-green-200 text-xs">{suggestion.reasoning}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-xs">Success Metrics</p>
                        <p className="text-green-200 text-xs">{suggestion.success_metrics}</p>
                      </div>
                    </div>
                  </div>

                  {segments.length > 0 && (
                    <div className="space-y-3">
                      <label className="block text-gray-300 font-semibold">
                        Choose Target Segment to Create Campaign
                      </label>
                      <select
                        value={selectedSegment}
                        onChange={(e) => setSelectedSegment(e.target.value)}
                        className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select a segment</option>
                        {segments.map((seg) => (
                          <option key={seg.id} value={seg.id}>
                            {seg.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleCreateCampaign}
                        disabled={loading || !selectedSegment}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded transition font-semibold"
                      >
                        {loading ? '⏳ Creating...' : '🚀 Create Campaign'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message Improvement Section */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6">✍️ Improve Message</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Your Message
                  </label>
                  <textarea
                    value={messageToImprove}
                    onChange={(e) => setMessageToImprove(e.target.value)}
                    placeholder="Paste your message here..."
                    className="w-full bg-gray-700 px-4 py-3 rounded text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows="4"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Campaign Objective
                  </label>
                  <select
                    value={messageObjective}
                    onChange={(e) => setMessageObjective(e.target.value)}
                    className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select objective</option>
                    <option value="engagement">Engagement</option>
                    <option value="conversion">Conversion</option>
                    <option value="retention">Retention</option>
                    <option value="reactivation">Reactivation</option>
                  </select>
                </div>

                <button
                  onClick={handleImproveMessage}
                  disabled={loading || !messageToImprove.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded transition font-semibold"
                >
                  {loading ? '⏳ Improving...' : '✨ Get Alternatives'}
                </button>
              </div>

              {improvements && (
                <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
                  <h3 className="font-bold">Alternative Versions:</h3>
                  {improvements.alternatives.map((alt) => (
                    <div
                      key={alt.version}
                      className="bg-gray-900 rounded-lg p-3 border border-purple-500"
                    >
                      <p className="text-sm font-semibold text-purple-300 mb-2">
                        Version {alt.version}
                      </p>
                      <p className="text-sm text-gray-200">{alt.text}</p>
                    </div>
                  ))}
                  <div className="bg-green-900 rounded-lg p-3 mt-3">
                    <p className="text-sm text-green-200">
                      <strong>💡 Tip:</strong> {improvements.recommendations}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Examples Section */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-4">📚 Example Intents to Try</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                'Weekend flash sale targeting high spenders',
                'Reactivate customers who spent over ₹20,000 but are inactive',
                'Birthday offer for customers from Mumbai',
                'New product launch to recent buyers',
                'Festival offer with 30% discount',
                'Win-back campaign for 90-day inactive customers',
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setIntent(example)}
                  className="text-left bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded transition text-sm"
                >
                  → {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICampaignGeneratorPage;

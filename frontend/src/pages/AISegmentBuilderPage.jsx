import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/aiAPI';
import { segmentAPI } from '../services/segmentAPI';
import Sidebar from '../components/Sidebar';

const AISegmentBuilderPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [description, setDescription] = useState('');
  const [generatedFilters, setGeneratedFilters] = useState(null);
  const [preview, setPreview] = useState(null);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleGenerateSegment = async () => {
    setLoading(true);
    setError(null);
    setGeneratedFilters(null);
    setPreview(null);

    try {
      const result = await aiAPI.generateSegment(description, token);
      setGeneratedFilters(result);

      // Auto-preview
      const previewResult = await segmentAPI.preview(
        {
          condition: result.condition,
          filters: result.filters,
        },
        token
      );
      setPreview(previewResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSegment = async () => {
    if (!segmentName.trim()) {
      setError('Segment name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await segmentAPI.create(
        {
          name: segmentName,
          description: segmentDescription,
          filters: {
            condition: generatedFilters.condition,
            filters: generatedFilters.filters,
          },
        },
        token
      );

      // Reset form
      setDescription('');
      setGeneratedFilters(null);
      setPreview(null);
      setSegmentName('');
      setSegmentDescription('');
      setShowSaveForm(false);

      alert('Segment created successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/ai-segments" />
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">AI Segment Builder</h1>
          <p className="text-gray-400 mb-8">
            Describe your audience in natural language. AI will create a segment for you.
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
              {error}
            </div>
          )}

          {/* Input Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Describe Your Audience</h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Examples:
• Show me high spenders who haven't ordered in 3 months
• Target coffee buyers in Hyderabad
• Find customers with more than 5 orders
• Reach out to inactive customers who spent over ₹10,000"
              className="w-full bg-gray-700 px-4 py-3 rounded text-white placeholder-gray-500 mb-4"
              rows="5"
            />

            <button
              onClick={handleGenerateSegment}
              disabled={loading || !description.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-3 rounded transition font-semibold"
            >
              {loading ? 'Generating...' : '✨ Generate Segment'}
            </button>
          </div>

          {/* Results Section */}
          {generatedFilters && (
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">📊 AI Analysis</h2>

              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <p className="text-gray-300 mb-2">
                  <strong>Reasoning:</strong> {generatedFilters.reasoning}
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>Logic:</strong> Match{' '}
                  <span className="text-yellow-400">
                    {generatedFilters.condition === 'AND' ? 'ALL' : 'ANY'}
                  </span>{' '}
                  conditions
                </p>
                <p className="text-gray-300">
                  <strong>Filters:</strong>
                </p>
                <ul className="list-disc list-inside text-gray-400 mt-2">
                  {generatedFilters.filters.map((filter, idx) => (
                    <li key={idx}>
                      {filter.field} {filter.operator} {filter.value}
                    </li>
                  ))}
                </ul>
              </div>

              {preview && (
                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <h3 className="font-bold mb-2">
                    👥 Match Preview: {preview.total_count} customers
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {preview.preview.length === 0 ? (
                      <p className="text-gray-400 text-sm">No customers match this segment</p>
                    ) : (
                      preview.preview.map((customer) => (
                        <div
                          key={customer.id}
                          className="text-sm bg-gray-800 p-2 rounded border border-gray-700"
                        >
                          <p className="font-semibold">{customer.name}</p>
                          <p className="text-gray-400">
                            {customer.order_count} orders • ₹{customer.total_spend}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="w-full bg-green-600 hover:bg-green-700 px-6 py-2 rounded transition"
                >
                  💾 Save as Segment
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    placeholder="Segment name"
                    className="w-full bg-gray-700 px-4 py-2 rounded text-white"
                    required
                  />
                  <textarea
                    value={segmentDescription}
                    onChange={(e) => setSegmentDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full bg-gray-700 px-4 py-2 rounded text-white"
                    rows="2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSegment}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded transition"
                    >
                      Save Segment
                    </button>
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Examples */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">💡 Try These Prompts</h3>
            <div className="space-y-2">
              {[
                'High spenders in Bangalore who made a purchase in the last month',
                'Customers who spent between ₹5,000 and ₹20,000 but are now inactive',
                'Very active customers with 10+ orders',
                'New customers from the last 30 days',
                'People from Mumbai with at least 3 orders',
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(example)}
                  className="w-full text-left bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition text-sm text-gray-300"
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

export default AISegmentBuilderPage;

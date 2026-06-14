import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../services/campaignAPI';
import { segmentAPI } from '../services/segmentAPI';
import { templateAPI } from '../services/templateAPI';
import Sidebar from '../components/Sidebar';

const CHANNELS = ['WhatsApp', 'SMS', 'Email', 'RCS'];

const CampaignsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    campaign_name: '',
    segment_id: '',
    channel: 'WhatsApp',
    message_content: '',
    message_template_id: '',
  });

  useEffect(() => {
    fetchCampaigns();
    fetchSegments();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await campaignAPI.getAll(token);
      setCampaigns(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSegments = async () => {
    try {
      const data = await segmentAPI.getAll(token);
      setSegments(data);
    } catch (err) {
      console.error('Error fetching segments:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await templateAPI.getAll(token);
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTemplateChange = (templateId) => {
    const selected = templates.find((t) => t.id === parseInt(templateId));
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        message_template_id: templateId,
        message_content: selected.template_text,
      }));
    }
  };

  const handlePreview = async () => {
    if (!formData.segment_id) {
      setError('Select a segment first');
      return;
    }
    try {
      const data = await campaignAPI.preview(formData.segment_id, token);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.campaign_name.trim() || !formData.segment_id || !formData.message_content.trim()) {
      setError('Fill all required fields');
      return;
    }

    try {
      if (editingId) {
        await campaignAPI.update(editingId, formData, token);
      } else {
        await campaignAPI.create(formData, token);
      }

      setFormData({
        campaign_name: '',
        segment_id: '',
        channel: 'WhatsApp',
        message_content: '',
        message_template_id: '',
      });
      setPreview(null);
      setEditingId(null);
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Send this campaign to all segment members?')) return;

    setSending(true);
    setError(null);
    try {
      const result = await campaignAPI.send(campaignId, token);
      alert(`✅ ${result.message}`);
      fetchCampaigns();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this campaign?')) {
      try {
        await campaignAPI.delete(id, token);
        fetchCampaigns();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      campaign_name: '',
      segment_id: '',
      channel: 'WhatsApp',
      message_content: '',
      message_template_id: '',
    });
    setPreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/campaigns" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">📧 Campaigns</h1>
            <button
              onClick={() => {
                if (showForm) handleCancel();
                setShowForm(!showForm);
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition"
            >
              {showForm ? 'Cancel' : '➕ New Campaign'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
              {error}
            </div>
          )}

          {/* Campaign Form */}
          {showForm && (
            <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
              <h2 className="text-xl font-bold mb-6">✏️ Create Campaign</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">Campaign Name *</label>
                    <input
                      type="text"
                      name="campaign_name"
                      value={formData.campaign_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Weekend Sale"
                      className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">Select Segment *</label>
                    <select
                      name="segment_id"
                      value={formData.segment_id}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Choose Segment</option>
                      {segments.map((seg) => (
                        <option key={seg.id} value={seg.id}>
                          {seg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">Channel *</label>
                    <select
                      name="channel"
                      value={formData.channel}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                      required
                    >
                      {CHANNELS.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">Use Template</label>
                    <select
                      value={formData.message_template_id}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Write custom message</option>
                      {templates.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-2">Message Content *</label>
                  <textarea
                    name="message_content"
                    value={formData.message_content}
                    onChange={handleInputChange}
                    placeholder="Write your message..."
                    className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows="6"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded transition"
                  >
                    👁️ Preview Recipients
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-2 rounded transition"
                  >
                    💾 Save Campaign
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded transition"
                  >
                    Cancel
                  </button>
                </div>

                {preview && (
                  <div className="bg-gray-900 rounded-lg p-4 mt-4">
                    <h3 className="font-bold mb-3">
                      👥 Recipients Preview: {preview.preview_count} customers
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {preview.preview.map((customer) => (
                        <div
                          key={customer.id}
                          className="bg-gray-800 p-2 rounded text-sm border border-gray-700"
                        >
                          <p className="font-semibold">{customer.name}</p>
                          <p className="text-gray-400">{customer.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Campaigns List */}
          {loading ? (
            <div className="text-center py-12">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No campaigns yet</p>
              <p className="text-sm mt-2">Create your first campaign to reach out to your audience</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <h3 className="font-bold text-lg">{campaign.campaign_name}</h3>
                      <p className="text-sm text-gray-400">Segment: {campaign.segment_name}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Channel</p>
                      <p className="font-semibold">{campaign.channel}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Status</p>
                      <span
                        className={`px-3 py-1 rounded text-sm font-semibold ${
                          campaign.status === 'draft'
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-green-900 text-green-200'
                        }`}
                      >
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Sent/Total</p>
                      <p className="font-semibold">
                        {campaign.total_sent || 0}/{campaign.total_sent || 0}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {campaign.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleSendCampaign(campaign.id)}
                            disabled={sending}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm transition"
                          >
                            📤 Send
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm transition"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {campaign.status === 'sent' && (
                        <button
                          onClick={() => navigate(`/campaign-analytics/${campaign.id}`)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition"
                        >
                          📊 View Stats
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                      {campaign.sent_at && ` • Sent: ${new Date(campaign.sent_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignsPage;

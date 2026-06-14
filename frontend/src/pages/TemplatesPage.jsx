import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { templateAPI } from '../services/templateAPI';
import Sidebar from '../components/Sidebar';

const TEMPLATE_CATEGORIES = [
  'Birthday Offer',
  'Festival Offer',
  'Win Back',
  'New Launch',
  'Flash Sale',
  'Newsletter',
  'Welcome',
  'Re-engagement',
  'Promotional',
  'Custom',
];

const CHANNELS = ['WhatsApp', 'SMS', 'Email', 'RCS'];

const TemplatesPage = () => {
  const { token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedChannels, setSelectedChannels] = useState(['WhatsApp']);
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    template_text: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templateAPI.getAll(token);
      setTemplates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleChannel = (channel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.template_text.trim()) {
      setError('Name and template text are required');
      return;
    }

    if (selectedChannels.length === 0) {
      setError('Select at least one channel');
      return;
    }

    try {
      if (editingId) {
        await templateAPI.update(
          editingId,
          {
            ...formData,
            channels: selectedChannels,
          },
          token
        );
      } else {
        await templateAPI.create(
          {
            ...formData,
            channels: selectedChannels,
          },
          token
        );
      }

      setFormData({ name: '', category: '', template_text: '' });
      setSelectedChannels(['WhatsApp']);
      setEditingId(null);
      setShowForm(false);
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      category: template.category || '',
      template_text: template.template_text,
    });
    setSelectedChannels(template.channels || ['WhatsApp']);
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this template?')) {
      try {
        await templateAPI.delete(id, token);
        fetchTemplates();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', category: '', template_text: '' });
    setSelectedChannels(['WhatsApp']);
    setEditingId(null);
    setShowForm(false);
  };

  const filteredTemplates =
    filterCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === filterCategory);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/templates" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Message Templates</h1>
            <button
              onClick={() => {
                if (showForm) handleCancel();
                setShowForm(!showForm);
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition"
            >
              {showForm ? 'Cancel' : '➕ New Template'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
              {error}
            </div>
          )}

          {/* Form Section */}
          {showForm && (
            <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
              <h2 className="text-xl font-bold mb-6">
                {editingId ? '✏️ Edit Template' : '➕ Create New Template'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Birthday Special Offer"
                      className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Channels *
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {CHANNELS.map((channel) => (
                      <label
                        key={channel}
                        className="flex items-center gap-2 cursor-pointer bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedChannels.includes(channel)}
                          onChange={() => toggleChannel(channel)}
                          className="w-4 h-4"
                        />
                        <span>{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Message Template *
                  </label>
                  <textarea
                    name="template_text"
                    value={formData.template_text}
                    onChange={handleInputChange}
                    placeholder="Write your message template. Tip: Use {name}, {product}, {discount} for dynamic fields"
                    className="w-full bg-gray-700 px-4 py-2 rounded text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows="6"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Use {'{customer_name}'}, {'{discount}'}, {'{product}'} for placeholders
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded transition font-semibold"
                  >
                    {editingId ? '💾 Update Template' : '➕ Create Template'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded transition font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter Section */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-4 py-2 rounded transition ${
                  filterCategory === 'all'
                    ? 'bg-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                All ({templates.length})
              </button>
              {TEMPLATE_CATEGORIES.map((cat) => {
                const count = templates.filter((t) => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-2 rounded transition ${
                      filterCategory === cat
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="text-center py-12">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No templates found</p>
              <p className="text-sm mt-2">Create your first template to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-blue-500 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{template.name}</h3>
                      {template.category && (
                        <p className="text-xs text-blue-400 mt-1">📁 {template.category}</p>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                    {template.template_text}
                  </p>

                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">Channels:</p>
                    <div className="flex gap-2 flex-wrap">
                      {template.channels.map((channel) => (
                        <span
                          key={channel}
                          className="bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm transition"
                    >
                      🗑️
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { segmentAPI } from '../services/segmentAPI';
import Sidebar from '../components/Sidebar';

const SegmentsPage = () => {
  const { token } = useAuth();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [filters, setFilters] = useState({
    condition: 'AND',
    filters: [{ field: '', operator: '', value: '' }],
  });
  const [preview, setPreview] = useState(null);
  const [viewingSegment, setViewingSegment] = useState(null);
  const [viewingSegmentLoading, setViewingSegmentLoading] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleViewSegment = async (id) => {
    setViewingSegmentLoading(true);
    setError(null);
    try {
      const data = await segmentAPI.getById(id, token);
      setViewingSegment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setViewingSegmentLoading(false);
    }
  };

  const fetchSegments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await segmentAPI.getAll(token);
      setSegments(data);
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

  const handleFilterChange = (index, field, value) => {
    const newFilters = JSON.parse(JSON.stringify(filters));
    newFilters.filters[index][field] = value;
    setFilters(newFilters);
  };

  const addFilter = () => {
    const newFilters = JSON.parse(JSON.stringify(filters));
    newFilters.filters.push({ field: '', operator: '', value: '' });
    setFilters(newFilters);
  };

  const removeFilter = (index) => {
    const newFilters = JSON.parse(JSON.stringify(filters));
    newFilters.filters.splice(index, 1);
    setFilters(newFilters);
  };

  const handlePreview = async () => {
    try {
      const data = await segmentAPI.preview(filters, token);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await segmentAPI.create(
        {
          ...formData,
          filters,
        },
        token
      );
      setFormData({ name: '', description: '' });
      setFilters({ condition: 'AND', filters: [{ field: '', operator: '', value: '' }] });
      setPreview(null);
      setShowForm(false);
      setShowBuilder(false);
      fetchSegments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this segment?')) {
      try {
        await segmentAPI.delete(id, token);
        fetchSegments();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/segments" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Audience Segments</h1>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setShowBuilder(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition"
            >
              {showForm ? 'Cancel' : 'Create Segment'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
              {error}
            </div>
          )}

          {showForm && (
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Create New Segment</h2>

              <div className="mb-4">
                <label className="block text-gray-300 font-semibold mb-2">Segment Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., High Spenders"
                  className="w-full bg-gray-700 px-4 py-2 rounded text-white"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional description"
                  className="w-full bg-gray-700 px-4 py-2 rounded text-white"
                  rows="3"
                />
              </div>

              <button
                onClick={() => setShowBuilder(!showBuilder)}
                className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition mb-4"
              >
                {showBuilder ? 'Hide Filter Builder' : 'Build Filters'}
              </button>

              {showBuilder && (
                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <h3 className="font-bold mb-4">Filter Logic</h3>

                  <select
                    value={filters.condition}
                    onChange={(e) =>
                      setFilters({ ...filters, condition: e.target.value })
                    }
                    className="bg-gray-700 px-4 py-2 rounded text-white mb-4"
                  >
                    <option value="AND">Match ALL conditions</option>
                    <option value="OR">Match ANY condition</option>
                  </select>

                  {filters.filters.map((filter, idx) => (
                    <div key={idx} className="flex gap-2 mb-3">
                      <select
                        value={filter.field}
                        onChange={(e) =>
                          handleFilterChange(idx, 'field', e.target.value)
                        }
                        className="bg-gray-700 px-4 py-2 rounded text-white"
                      >
                        <option value="">Select Field</option>
                        <option value="total_spend">Total Spend</option>
                        <option value="order_count">Order Count</option>
                        <option value="last_purchase_days">Days Since Last Purchase</option>
                        <option value="city">City</option>
                        <option value="gender">Gender</option>
                      </select>

                      <select
                        value={filter.operator}
                        onChange={(e) =>
                          handleFilterChange(idx, 'operator', e.target.value)
                        }
                        className="bg-gray-700 px-4 py-2 rounded text-white"
                      >
                        <option value="">Operator</option>
                        <option value=">">Greater than</option>
                        <option value="<">Less than</option>
                        <option value="=">=Equal</option>
                      </select>

                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) =>
                          handleFilterChange(idx, 'value', e.target.value)
                        }
                        placeholder="Value"
                        className="bg-gray-700 px-4 py-2 rounded text-white flex-1"
                      />

                      {filters.filters.length > 1 && (
                        <button
                          onClick={() => removeFilter(idx)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <button
                      onClick={addFilter}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                    >
                      + Add Filter
                    </button>
                    <button
                      onClick={handlePreview}
                      className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                    >
                      Preview
                    </button>
                  </div>

                  {preview && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h4 className="font-bold mb-2">
                        Preview: {preview.total_count} customers match
                      </h4>
                      <div className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
                        {preview.preview.map((customer) => (
                          <div
                            key={customer.id}
                            className="text-sm text-gray-300 py-1 border-b border-gray-700"
                          >
                            {customer.name} - ₹{customer.total_spend}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                >
                  Create Segment
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setShowBuilder(false);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : segments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No segments yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <h3 className="text-lg font-bold">{segment.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {segment.description || 'No description'}
                  </p>
                  <div className="mt-4 space-y-1 text-sm">
                    <p className="text-gray-400">
                      Type: <span className="text-blue-400">{segment.segment_type}</span>
                    </p>
                    <p className="text-gray-400">
                      Created: {new Date(segment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleViewSegment(segment.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(segment.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Segment Details Modal */}
          {viewingSegment && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-4xl p-6 max-h-[85vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {viewingSegment.name}
                      <span className="text-xs bg-blue-600 text-blue-100 px-2 py-0.5 rounded-full font-normal">
                        {viewingSegment.segment_type}
                      </span>
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">{viewingSegment.description || 'No description'}</p>
                  </div>
                  <button
                    onClick={() => setViewingSegment(null)}
                    className="text-gray-400 hover:text-white text-xl p-1 transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Filters Configuration</h4>
                  <pre className="text-xs text-blue-400 whitespace-pre-wrap font-mono">
                    {JSON.stringify(viewingSegment.filters, null, 2)}
                  </pre>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-white">
                      Matching Customers ({viewingSegment.member_count})
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-gray-700 rounded-lg">
                    {viewingSegment.members && viewingSegment.members.length > 0 ? (
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-900 text-gray-400 sticky top-0">
                          <tr>
                            <th className="p-3 font-semibold">Name</th>
                            <th className="p-3 font-semibold">Email</th>
                            <th className="p-3 font-semibold">Phone</th>
                            <th className="p-3 font-semibold">City</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-750">
                          {viewingSegment.members.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-750/50 text-gray-300">
                              <td className="p-3 font-medium text-white">{member.name}</td>
                              <td className="p-3">{member.email || '-'}</td>
                              <td className="p-3 font-mono text-xs">{member.phone || '-'}</td>
                              <td className="p-3">{member.city || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        No customers matched or populated in this segment yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end">
                  <button
                    onClick={() => setViewingSegment(null)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewingSegmentLoading && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-6 py-4 flex items-center gap-3 shadow-xl">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                <span className="text-white font-medium">Fetching segment details...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SegmentsPage;

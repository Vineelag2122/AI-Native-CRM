import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const insightsAPI = {
  generate: async (campaignId, token) => {
    const response = await axios.get(
      `${API_URL}/api/insights/${campaignId}/generate`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  getAll: async (token) => {
    const response = await axios.get(`${API_URL}/api/insights`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  delete: async (id, token) => {
    const response = await axios.delete(`${API_URL}/api/insights/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const campaignAPI = {
  getAll: async (token) => {
    const response = await axios.get(`${API_URL}/api/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getById: async (id, token) => {
    const response = await axios.get(`${API_URL}/api/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  create: async (campaignData, token) => {
    const response = await axios.post(`${API_URL}/api/campaigns`, campaignData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  update: async (id, campaignData, token) => {
    const response = await axios.put(`${API_URL}/api/campaigns/${id}`, campaignData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  send: async (id, token) => {
    const response = await axios.post(
      `${API_URL}/api/campaigns/${id}/send`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  delete: async (id, token) => {
    const response = await axios.delete(`${API_URL}/api/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  preview: async (id, token) => {
    const response = await axios.get(`${API_URL}/api/campaigns/${id}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

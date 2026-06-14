import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const segmentAPI = {
  getAll: async (token) => {
    const response = await axios.get(`${API_URL}/api/segments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getById: async (id, token) => {
    const response = await axios.get(`${API_URL}/api/segments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  create: async (segmentData, token) => {
    const response = await axios.post(`${API_URL}/api/segments`, segmentData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  update: async (id, segmentData, token) => {
    const response = await axios.put(`${API_URL}/api/segments/${id}`, segmentData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  delete: async (id, token) => {
    const response = await axios.delete(`${API_URL}/api/segments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  preview: async (filters, token) => {
    const response = await axios.post(
      `${API_URL}/api/segments/preview`,
      { filters },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const customerAPI = {
  getAll: async (token) => {
    const response = await axios.get(`${API_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getById: async (id, token) => {
    const response = await axios.get(`${API_URL}/api/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  create: async (customerData, token) => {
    const response = await axios.post(`${API_URL}/api/customers`, customerData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  update: async (id, customerData, token) => {
    const response = await axios.put(`${API_URL}/api/customers/${id}`, customerData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  delete: async (id, token) => {
    const response = await axios.delete(`${API_URL}/api/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

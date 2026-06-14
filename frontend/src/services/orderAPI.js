import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const orderAPI = {
  getAll: async (token) => {
    const response = await axios.get(`${API_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getByCustomerId: async (customerId, token) => {
    const response = await axios.get(`${API_URL}/api/customers/${customerId}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getById: async (id, token) => {
    const response = await axios.get(`${API_URL}/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  create: async (orderData, token) => {
    const response = await axios.post(`${API_URL}/api/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  update: async (id, orderData, token) => {
    const response = await axios.put(`${API_URL}/api/orders/${id}`, orderData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  delete: async (id, token) => {
    const response = await axios.delete(`${API_URL}/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

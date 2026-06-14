import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const analyticsAPI = {
  getAll: async (token) => {
    const response = await axios.get(`${API_URL}/api/analytics/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getDetail: async (customerId, token) => {
    const response = await axios.get(`${API_URL}/api/analytics/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getTopCustomers: async (limit, token) => {
    const response = await axios.get(`${API_URL}/api/analytics/top-customers?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getInactiveCustomers: async (days, token) => {
    const response = await axios.get(`${API_URL}/api/analytics/inactive-customers?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getBySpendRange: async (minSpend, maxSpend, token) => {
    const response = await axios.get(
      `${API_URL}/api/analytics/spend-range?minSpend=${minSpend}&maxSpend=${maxSpend}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  getSummary: async (token) => {
    const response = await axios.get(`${API_URL}/api/analytics/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

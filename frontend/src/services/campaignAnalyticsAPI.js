import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const campaignAnalyticsAPI = {
  getMetrics: async (campaignId, token) => {
    const response = await axios.get(
      `${API_URL}/api/campaign-analytics/${campaignId}/metrics`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  getSummary: async (token) => {
    const response = await axios.get(`${API_URL}/api/campaign-analytics/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getBusinessMetrics: async (token) => {
    const response = await axios.get(`${API_URL}/api/campaign-analytics/business-metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getFunnel: async (campaignId, token) => {
    const response = await axios.get(
      `${API_URL}/api/campaign-analytics/${campaignId}/funnel`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};

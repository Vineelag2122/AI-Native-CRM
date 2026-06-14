import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const aiCampaignAPI = {
  generateSuggestion: async (intent, token) => {
    const response = await axios.post(
      `${API_URL}/api/ai-campaigns/suggest`,
      { intent },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  generateAndCreate: async (intent, segmentId, token) => {
    const response = await axios.post(
      `${API_URL}/api/ai-campaigns/create`,
      { intent, segment_id: segmentId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  improveMessage: async (message, objective, token) => {
    const response = await axios.post(
      `${API_URL}/api/ai-campaigns/improve-message`,
      { message, objective },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};

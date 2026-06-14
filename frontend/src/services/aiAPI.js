import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const aiAPI = {
  generateSegment: async (description, token) => {
    const response = await axios.post(
      `${API_URL}/api/ai/generate-segment`,
      { description },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  generateCampaign: async (intent, token) => {
    const response = await axios.post(
      `${API_URL}/api/ai/generate-campaign`,
      { intent },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const templateAPI = {
  getAll: async (token) => {
    const response = await axios.get(`${API_URL}/api/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getById: async (id, token) => {
    const response = await axios.get(`${API_URL}/api/templates/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  create: async (templateData, token) => {
    const response = await axios.post(`${API_URL}/api/templates`, templateData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  update: async (id, templateData, token) => {
    const response = await axios.put(`${API_URL}/api/templates/${id}`, templateData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  delete: async (id, token) => {
    const response = await axios.delete(`${API_URL}/api/templates/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getByCategory: async (category, token) => {
    const response = await axios.get(`${API_URL}/api/templates/category/${category}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getCategories: async (token) => {
    const response = await axios.get(`${API_URL}/api/templates/categories/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

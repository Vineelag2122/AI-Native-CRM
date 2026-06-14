import React, { useState, useContext, createContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const signup = async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        username,
        email,
        password,
      });
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const getAuthHeader = () => {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        signup,
        login,
        logout,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

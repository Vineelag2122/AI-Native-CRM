import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">AI-CRM Login</h1>

        <div className="mb-6 bg-blue-950/40 border border-blue-800/60 rounded-lg p-4 text-sm shadow-inner">
          <p className="text-blue-200 font-semibold mb-2 flex items-center gap-1.5">
            🔑 Demo Credentials:
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-300 font-mono">
            <span className="text-gray-500 font-sans">Email:</span>
            <span className="text-blue-300">admin@example.com</span>
            <span className="text-gray-500 font-sans">Password:</span>
            <span className="text-blue-300">Password123!</span>
          </div>
        </div>

        {(error || localError) && (
          <div className="mb-4 p-3 bg-red-900 text-red-100 rounded">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 font-semibold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 font-semibold mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-4">
          Don't have an account?{' '}
          <a href="/signup" className="text-blue-400 hover:text-blue-300">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

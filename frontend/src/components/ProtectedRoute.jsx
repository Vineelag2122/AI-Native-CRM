import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Stop checking once token status is known; if token exists, user is authenticated
    if (token) {
      setIsChecking(false);
    } else {
      // No token — allow redirect to login instead of staying stuck on loading
      setIsChecking(false);
    }
  }, [token]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#071023'}}>
        <div className="text-white text-xl flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;

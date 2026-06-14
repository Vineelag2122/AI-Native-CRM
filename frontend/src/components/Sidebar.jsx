import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ active }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Customers', path: '/customers', icon: '👥' },
    { label: 'Orders', path: '/orders', icon: '📦' },
    { label: 'Analytics', path: '/analytics', icon: '📈' },
    { label: 'Segments', path: '/segments', icon: '🎯' },
    { label: 'Templates', path: '/templates', icon: '📝' },
    { label: 'Campaigns', path: '/campaigns', icon: '📧' },
    { label: 'AI Campaigns', path: '/ai-campaigns', icon: '🤖' },
    { label: 'Insights', path: '/insights', icon: '🧠' },
    { label: 'AI Builder', path: '/ai-segments', icon: '✨' },
  ];

  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg" style={{background:'linear-gradient(135deg,#7c5cff,#00d4ff)'}} />
        <div>
          <div className="text-xl font-bold">AI-CRM</div>
          <div className="text-xs text-muted">Smart customer engagement</div>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`nav-item ${active === item.path ? 'active' : ''}`}
          >
            <span className="inline-block w-8 text-center mr-2">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <button
          onClick={handleLogout}
          className="btn-primary w-full justify-center"
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

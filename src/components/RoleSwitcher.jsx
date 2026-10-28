import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, ArrowRight, RefreshCw, X, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './RoleSwitcher.css';

export default function RoleSwitcher() {
  const { role, quickDemoLogin, user, isAuthenticated } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();

  const handleRoleToggle = async (targetRole) => {
    setSwitching(true);
    try {
      await quickDemoLogin(targetRole);
      if (targetRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  if (minimized) {
    return (
      <button 
        className="role-switcher-floating-min" 
        onClick={() => setMinimized(false)}
        title="Open Role & Demo Control Panel"
      >
        <span className="min-label">AUTH: {role.toUpperCase()}</span>
      </button>
    );
  }

  return (
    <div className="role-switcher-panel animate-fade-in">
      <div className="switcher-header">
        <div className="switcher-title-wrap">
          <span className="switcher-pulse-dot"></span>
          <span className="switcher-title">AUTH CONSOLE // INDIA REGION</span>
        </div>
        <button 
          className="switcher-close-btn"
          onClick={() => setMinimized(true)}
          title="Minimize panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="switcher-body">
        <p className="switcher-desc">
          Logged in as: <strong className={role === 'admin' ? 'text-admin' : 'text-shopper'}>{user?.name?.split(' ')[0] || role.toUpperCase()}</strong> ({role.toUpperCase()})
        </p>

        <div className="switcher-buttons-row">
          <button 
            className={`switcher-tab-btn ${role === 'customer' ? 'active' : ''}`}
            onClick={() => handleRoleToggle('customer')}
            disabled={switching}
          >
            <User size={14} />
            <span>Shopper Mode</span>
          </button>

          <button 
            className={`switcher-tab-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleToggle('admin')}
            disabled={switching}
          >
            <ShieldAlert size={14} />
            <span>Admin Portal</span>
          </button>
        </div>

        <div className="switcher-quick-links">
          {role === 'admin' ? (
            <button className="quick-nav-btn" onClick={() => navigate('/admin')}>
              Go to Admin Overview <ArrowRight size={12} />
            </button>
          ) : (
            <button className="quick-nav-btn" onClick={() => navigate('/account')}>
              Go to User Dashboard <ArrowRight size={12} />
            </button>
          )}

          <button 
            className="quick-nav-btn" 
            style={{ color: '#4CC9F0' }}
            onClick={() => navigate('/login')}
          >
            <LogIn size={12} />
            <span>Switch / Login Page</span>
          </button>
        </div>
      </div>
    </div>
  );
}

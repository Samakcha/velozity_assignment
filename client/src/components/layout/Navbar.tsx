import React from 'react';
import { FiZap } from 'react-icons/fi';
import { useAuth } from '../../auth/AuthContext';
import { NotificationBell } from '../NotificationBell';

export const Navbar: React.FC = () => {
  const { user, accessToken, logout } = useAuth();

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { backgroundColor: '#ef4444', color: '#ffffff' };
      case 'PROJECT_MANAGER':
        return { backgroundColor: '#3b82f6', color: '#ffffff' };
      case 'DEVELOPER':
        return { backgroundColor: '#10b981', color: '#ffffff' };
      default:
        return { backgroundColor: '#6b7280', color: '#ffffff' };
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="brand-logo"><FiZap style={{ color: '#6366f1' }} /></span>
        <span className="brand-title">Velozity Project Hub</span>
      </div>

      <div className="navbar-actions">
        {user && accessToken && <NotificationBell accessToken={accessToken} />}

        {user && (
          <div className="user-profile">
            <span className="user-name">{user.name}</span>
            <span className="role-tag" style={getRoleBadgeStyle(user.role)}>
              {user.role}
            </span>
            <button className="btn-logout" onClick={logout} title="Sign Out">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

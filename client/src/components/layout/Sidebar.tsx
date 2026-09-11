import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiFolder, FiCheckSquare } from 'react-icons/fi';
import { useAuth } from '../../auth/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'ADMIN':
        return '/admin';
      case 'PROJECT_MANAGER':
        return '/pm';
      case 'DEVELOPER':
        return '/developer';
      default:
        return '/';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Navigation</div>

        <NavLink
          to={getDashboardPath()}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="icon"><FiGrid /></span>
          <span>Dashboard</span>
        </NavLink>

        {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
          <NavLink
            to="/projects"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="icon"><FiFolder /></span>
            <span>Projects</span>
          </NavLink>
        )}

        <NavLink
          to="/tasks"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="icon"><FiCheckSquare /></span>
          <span>Tasks</span>
        </NavLink>
      </div>

      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-dot online"></span>
          <span>Socket Live</span>
        </div>
      </div>
    </aside>
  );
};

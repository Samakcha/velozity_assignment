import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface ProtectedRouteProps {
  allowedRoles?: Array<'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER'>;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to respective role dashboard if role is unauthorized for this route
    const defaultRoute =
      user.role === 'ADMIN'
        ? '/admin'
        : user.role === 'PROJECT_MANAGER'
        ? '/pm'
        : '/developer';
    return <Navigate to={defaultRoute} replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

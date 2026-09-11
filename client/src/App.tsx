import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { PMDashboard } from './pages/PMDashboard';
import { DeveloperDashboard } from './pages/DeveloperDashboard';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { Tasks } from './pages/Tasks';

const RoleBasedRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Checking authentication session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'PROJECT_MANAGER':
      return <Navigate to="/pm" replace />;
    case 'DEVELOPER':
      return <Navigate to="/developer" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Root Role Redirect */}
          <Route path="/" element={<RoleBasedRedirect />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Admin Dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* PM Dashboard */}
            <Route
              path="/pm"
              element={
                <ProtectedRoute allowedRoles={['PROJECT_MANAGER']}>
                  <PMDashboard />
                </ProtectedRoute>
              }
            />

            {/* Developer Dashboard */}
            <Route
              path="/developer"
              element={
                <ProtectedRoute allowedRoles={['DEVELOPER']}>
                  <DeveloperDashboard />
                </ProtectedRoute>
              }
            />

            {/* Projects Directory (Admin & PM) */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER']}>
                  <Projects />
                </ProtectedRoute>
              }
            />

            {/* Project Details */}
            <Route path="/projects/:id" element={<ProjectDetails />} />

            {/* Tasks Directory */}
            <Route path="/tasks" element={<Tasks />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

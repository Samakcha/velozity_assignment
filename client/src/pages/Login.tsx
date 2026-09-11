import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in email and password');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const user = await login(email, password);

      // Redirect based on role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'PROJECT_MANAGER') {
        navigate('/pm');
      } else {
        navigate('/developer');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Login failed. Please check credentials.');
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">⚡</span>
          <h1>Velozity Hub Sign In</h1>
          <p className="login-subtext">Access your role-based project & task dashboard</p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@test.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="quick-demo-section">
          <div className="demo-divider">
            <span>Quick Fill Credentials</span>
          </div>

          <div className="demo-buttons">
            <button
              type="button"
              className="btn-demo admin"
              onClick={() => handleQuickLogin('admin@velozity.com')}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="btn-demo pm"
              onClick={() => handleQuickLogin('pma@test.com')}
            >
              💼 PM (PM A)
            </button>
            <button
              type="button"
              className="btn-demo dev"
              onClick={() => handleQuickLogin('deva@test.com')}
            >
              👨‍💻 Developer (Dev A)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

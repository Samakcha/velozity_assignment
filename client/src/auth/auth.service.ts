import { User, setAccessToken } from '../services/api';

export interface AuthState {
  user: User;
  accessToken: string;
}

let refreshPromise: Promise<AuthState> | null = null;

export const authService = {
  async login(email: string, password: string): Promise<AuthState> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error?.message || 'Login failed');
    }

    const authState = {
      user: body.data.user,
      accessToken: body.data.accessToken,
    };
    setAccessToken(authState.accessToken);
    return authState;
  },

  async register(name: string, email: string, password: string): Promise<User> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error?.message || 'Registration failed');
    }

    return body.data;
  },

  async refresh(): Promise<AuthState> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        const body = await res.json();
        if (!res.ok) {
          setAccessToken(null);
          throw new Error(body?.error?.message || 'Session expired');
        }

        const authState = {
          user: body.data.user,
          accessToken: body.data.accessToken,
        };
        setAccessToken(authState.accessToken);
        return authState;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  async logout(): Promise<void> {
    setAccessToken(null);
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  },

  async getMe(accessToken: string): Promise<User> {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.error?.message || 'Failed to fetch user');
    }

    return body.data;
  },
};

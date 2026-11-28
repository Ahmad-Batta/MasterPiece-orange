import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);
const TOKEN_KEY = 'careerhub_token';
const ROLE_KEY = 'careerhub_role';
const USER_KEY = 'careerhub_user';

function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function storeSession(session) {
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(ROLE_KEY, session.role);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  return session;
}

export function dashboardPath(role) {
  return role ? `/${role}/dashboard` : '/login';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const acceptSession = useCallback((data, tokenOverride) => {
    const next = storeSession({
      token: tokenOverride || data.token,
      role: data.role,
      user: data.user,
    });
    setSession(next);
    return next;
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const updateCurrentUser = useCallback((user) => {
    if (!session) return;
    acceptSession({ role: session.role, user }, session.token);
  }, [acceptSession, session]);

  useEffect(() => {
    const handleExpired = () => {
      clearStoredSession();
      setSession(null);
    };
    window.addEventListener('careerhub:auth-expired', handleExpired);

    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return () => window.removeEventListener('careerhub:auth-expired', handleExpired);
    }

    api.get('/me')
      .then(({ data }) => acceptSession(data.data, token))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));

    return () => window.removeEventListener('careerhub:auth-expired', handleExpired);
  }, [acceptSession, clearSession]);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/login', credentials);
    return acceptSession(data.data);
  }, [acceptSession]);

  const register = useCallback(async (values) => {
    const { data } = await api.post('/register', values);
    return acceptSession(data.data);
  }, [acceptSession]);

  const completeOAuth = useCallback(async (token) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    const { data } = await api.get('/me');
    return acceptSession(data.data, token);
  }, [acceptSession]);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({
    session,
    role: session?.role || null,
    user: session?.user || null,
    isLoading,
    login,
    register,
    logout,
    completeOAuth,
    updateCurrentUser,
  }), [session, isLoading, login, register, logout, completeOAuth, updateCurrentUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

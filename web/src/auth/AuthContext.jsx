import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onUnauthorized, request } from '../lib/api.js';
import { startLiveUpdates } from '../lib/liveUpdates.js';
import { clearToken, getToken, saveToken } from '../lib/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
  }, [logout]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    return startLiveUpdates();
  }, [userId]);

  useEffect(() => {
    if (!getToken()) return;
    request('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await request('/auth/login', { method: 'POST', body: { email, password } });
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

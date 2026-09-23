import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { resolveUserContext, signIn, signOut, subscribeToAuth } from '../services/firebase/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    return subscribeToAuth(async (user) => {
      setLoading(true);
      setActionError('');
      try {
        setContext(await resolveUserContext(user));
      } catch (error) {
        setContext(null);
        setActionError(error?.message || 'Unable to load your session.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(async (email, password) => {
    setActionError('');
    setLoading(true);
    try {
      const nextContext = await signIn(email, password);
      setContext(nextContext);
      return nextContext;
    } catch (error) {
      setActionError(error?.message || 'Sign-in failed.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setActionError('');
    await signOut();
    setContext(null);
  }, []);

  const value = useMemo(() => ({
    ...context,
    user: context?.user ?? null,
    loading,
    actionError,
    login,
    logout
  }), [context, loading, actionError, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

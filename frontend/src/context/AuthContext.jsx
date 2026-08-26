import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { showSuccess, showError } from '../utils/toast';

export const AuthContext = createContext();

const getValidInitialToken = () => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('cks_auth_token');
    if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string') {
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

export const AUTH_STATES = {
  INITIALIZING: 'INITIALIZING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getValidInitialToken());
  const [authStatus, setAuthStatus] = useState(AUTH_STATES.INITIALIZING);
  const [isLoading, setIsLoading] = useState(true);

  // Global Session Expiration Event Listener
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
      setAuthStatus(AUTH_STATES.SESSION_EXPIRED);
      setIsLoading(false);
      showError('Session expired. Please log in again.');
    };

    window.addEventListener('cks_auth_session_expired', handleSessionExpired);
    return () => window.removeEventListener('cks_auth_session_expired', handleSessionExpired);
  }, []);

  // Initialize Auth state on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const storedToken = getValidInitialToken();
        if (storedToken) {
          const res = await authService.getMe();
          const userData = res?.data?.user || res?.user || res?.data;
          if (userData && isMounted) {
            setUser(userData);
            setAuthStatus(AUTH_STATES.AUTHENTICATED);
          } else {
            try {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('cks_auth_token');
            } catch {}
            if (isMounted) {
              setToken(null);
              setUser(null);
              setAuthStatus(AUTH_STATES.UNAUTHENTICATED);
            }
          }
        } else {
          try {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('cks_auth_token');
          } catch {}
          if (isMounted) {
            setToken(null);
            setUser(null);
            setAuthStatus(AUTH_STATES.UNAUTHENTICATED);
          }
        }
      } catch (err) {
        console.warn('[AUTH_INIT_WARNING]', err?.message || 'Failed to authenticate stored session.');
        try {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('cks_auth_token');
        } catch {}
        if (isMounted) {
          setToken(null);
          setUser(null);
          setAuthStatus(AUTH_STATES.UNAUTHENTICATED);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier, password) => {
    setIsLoading(true);
    try {
      const res = await authService.login(identifier, password);
      const userData = res?.data?.user || res?.user || res?.data;
      const accessToken = res?.data?.accessToken || res?.accessToken;
      const refreshToken = res?.data?.refreshToken || res?.refreshToken;

      if (!userData || !accessToken) {
        throw new Error('Invalid authentication response structure from server');
      }

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('cks_auth_token', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      setToken(accessToken);
      setUser(userData);
      setAuthStatus(AUTH_STATES.AUTHENTICATED);
      showSuccess(`Welcome back, ${userData.fullName || 'User'}! 👋`);
      return userData;
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName, phone, email, password) => {
    setIsLoading(true);
    try {
      const res = await authService.register(fullName, phone, email, password);
      const userData = res?.data?.user || res?.user || res?.data;
      const accessToken = res?.data?.accessToken || res?.accessToken;
      const refreshToken = res?.data?.refreshToken || res?.refreshToken;

      if (!userData || !accessToken) {
        throw new Error('Invalid registration response structure from server');
      }

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('cks_auth_token', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      setToken(accessToken);
      setUser(userData);
      setAuthStatus(AUTH_STATES.AUTHENTICATED);
      showSuccess('Registration successful! Welcome to Chaudhary Kirana Store 🎉');
      return userData;
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Registration failed. Please check details.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken) => {
    setIsLoading(true);
    try {
      const res = await authService.googleLogin(idToken);
      const userData = res?.data?.user || res?.user || res?.data;
      const accessToken = res?.data?.accessToken || res?.accessToken;
      const refreshToken = res?.data?.refreshToken || res?.refreshToken;

      if (!userData || !accessToken) {
        throw new Error('Invalid Google login response structure from server');
      }

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('cks_auth_token', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      setToken(accessToken);
      setUser(userData);
      setAuthStatus(AUTH_STATES.AUTHENTICATED);
      showSuccess(`Welcome, ${userData.fullName || 'User'}! 👋`);
      return userData;
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Google Authentication failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('cks_auth_token');
    setToken(null);
    setUser(null);
    setAuthStatus(AUTH_STATES.UNAUTHENTICATED);
    showSuccess('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authStatus,
        isAuthenticated: !!user && authStatus === AUTH_STATES.AUTHENTICATED,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

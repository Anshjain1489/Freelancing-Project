import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { showSuccess, showError } from '../utils/toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          setUser(res.data.user);
        } catch (err) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
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
    setToken(null);
    setUser(null);
    showSuccess('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
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

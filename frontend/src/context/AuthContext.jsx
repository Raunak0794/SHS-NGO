import React, { useState, useEffect, useCallback } from 'react';
import {
  getAuthToken,
  getMe,
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  setAuthToken,
} from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContextType';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await getMe();
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch user', error);
      }
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    fetchUser().catch(() => {});
  }, [fetchUser]);

  const login = async (identifier, password) => {
    setLoading(true);
    setUser(null);
    try {
      const response = await loginApi({ identifier, password });
      const userData = response.data?.user || null;
      const authToken = response.data?.token || null;
      setAuthToken(authToken);
      if (userData) {
        setUser(userData);
      }
      const freshUser = await fetchUser().catch(() => userData);
      toast.success('Login successful!');
      return { success: true, user: freshUser || userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password, firstName, lastName) => {
    setLoading(true);
    setUser(null);
    try {
      const response = await registerApi({
        username,
        email,
        password,
        fullName: { firstName, lastName }
      });
      const userData = response.data?.user || null;
      const authToken = response.data?.token || null;
      setAuthToken(authToken);
      if (userData) {
        setUser(userData);
      }
      const freshUser = await fetchUser().catch(() => userData);
      toast.success('Registration successful!');
      return { success: true, user: freshUser || userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
      setAuthToken(null);
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
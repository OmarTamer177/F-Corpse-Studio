import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (err) {
        console.error('Failed to refresh user', err);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--paper-bg)', color: 'var(--ink-solid)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
        LOADING STUDIO...
      </div>
    );
  }

  const canonicalRole = user?.role || (user?.is_admin ? 'admin' : (user ? 'customer' : null));
  const isAdmin = canonicalRole === 'admin' || !!user?.is_admin;
  const isEmployee = canonicalRole === 'employee';
  const isStaff = isAdmin || isEmployee;

  const hasPermission = (permission) => {
    if (isAdmin) return true;
    return (user?.permissions || []).includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      refreshUser,
      loading,
      role: canonicalRole,
      isAdmin,
      isEmployee,
      isStaff,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

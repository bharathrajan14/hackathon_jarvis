import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (_) {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('sessionId') || null);

  const loginUser = (userData, authToken, activeSessionId = null) => {
    setUser(userData);
    setToken(authToken);
    if (activeSessionId) {
      setSessionId(activeSessionId);
      localStorage.setItem('sessionId', activeSessionId);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const updateSessionId = (newSessionId) => {
    setSessionId(newSessionId);
    if (newSessionId) {
      localStorage.setItem('sessionId', newSessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  };

  const logoutUser = () => {
    setUser(null);
    setToken(null);
    setSessionId(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('sessionId');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        sessionId,
        loginUser,
        updateSessionId,
        logoutUser,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

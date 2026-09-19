import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ag_user');
    return saved ? JSON.parse(saved) : {
      id: 'alice-demo-id',
      name: 'Alice',
      email: 'alice@adaptiveguard.internal',
      role: 'EMPLOYEE',
      department: 'Engineering & Finance',
    };
  });

  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('ag_session');
    return saved ? JSON.parse(saved) : {
      id: 'session-alice-live',
      currentRisk: 18,
      riskLevel: 'LOW',
      status: 'ACTIVE',
      network: 'corporate',
      location: 'office',
      deviceTrust: 'trusted',
      deviceName: 'Alice MacBook Pro',
    };
  });

  const [token, setToken] = useState(() => localStorage.getItem('ag_token') || '');
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // 'PASSKEY' | 'APPROVAL' | null
  const [pendingControlData, setPendingControlData] = useState(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('[Socket.IO] Connected to AdaptiveGuard platform:', s.id);
    });

    s.on('risk.updated', (data) => {
      console.log('[Socket.IO] risk.updated:', data);
      setSession((prev) => ({
        ...prev,
        currentRisk: data.riskScore ?? prev.currentRisk,
        riskLevel: data.riskLevel ?? prev.riskLevel,
      }));
    });

    s.on('session.revoked', (data) => {
      console.log('[Socket.IO] session.revoked:', data);
      setSession((prev) => ({
        ...prev,
        status: 'REVOKED',
        currentRisk: data.riskScore || 95,
        riskLevel: 'CRITICAL',
      }));
      addNotification({
        id: Date.now(),
        title: 'SESSION REVOKED',
        message: data.reason || 'Critical security breach triggered automated revocation',
        severity: 'CRITICAL',
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    s.on('security.event', (data) => {
      console.log('[Socket.IO] security.event:', data);
      addNotification({
        id: Date.now(),
        title: data.type || 'Security Telemetry',
        message: data.message || `${data.user} (${data.role}): Risk ${data.riskScore}`,
        severity: data.severity || (data.riskScore >= 61 ? 'HIGH' : 'LOW'),
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    s.on('approval.created', (data) => {
      addNotification({
        id: Date.now(),
        title: 'New Access Request',
        message: `${data.user} requested ${data.action} for ${data.resource}`,
        severity: 'HIGH',
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    s.on('approval.updated', (data) => {
      addNotification({
        id: Date.now(),
        title: `Request ${data.status}`,
        message: `${data.resource} (${data.action}) was ${data.status.toLowerCase()}`,
        severity: data.status === 'APPROVED' ? 'LOW' : 'HIGH',
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Save user & session to localStorage
  useEffect(() => {
    if (user) localStorage.setItem('ag_user', JSON.stringify(user));
    if (session) localStorage.setItem('ag_session', JSON.stringify(session));
    if (token) localStorage.setItem('ag_token', token);
  }, [user, session, token]);

  const addNotification = (notif) => {
    setNotifications((prev) => [notif, ...prev.slice(0, 19)]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Passkey Login implementation
  const passkeyLogin = async (email, simulated = true) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/webauthn/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          simulated,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Passkey verification failed');

      setUser(data.user);
      setSession((prev) => ({
        ...prev,
        id: data.sessionId,
        currentRisk: data.riskScore ?? 18,
        riskLevel: data.riskLevel ?? 'LOW',
        status: 'ACTIVE',
      }));
      setToken(data.token);
      return data;
    } catch (err) {
      console.error('Passkey login error:', err);
      throw err;
    }
  };

  // Switch demo persona (Alice, Bob, David)
  const switchDemoUser = async (personaName) => {
    const personas = {
      Alice: { email: 'alice@adaptiveguard.internal', role: 'EMPLOYEE', dept: 'Engineering & Finance' },
      Bob: { email: 'bob@adaptiveguard.internal', role: 'MANAGER', dept: 'Risk & Compliance' },
      David: { email: 'david@adaptiveguard.internal', role: 'IT_ADMINISTRATOR', dept: 'Security Operations' },
    };

    const target = personas[personaName] || personas.Alice;
    try {
      await passkeyLogin(target.email, true);
    } catch (_) {
      // Offline fallback state
      setUser({
        id: `user-${personaName.toLowerCase()}`,
        name: personaName,
        email: target.email,
        role: target.role,
        department: target.dept,
      });
      setSession((prev) => ({
        ...prev,
        currentRisk: 18,
        riskLevel: 'LOW',
        status: 'ACTIVE',
      }));
    }
  };

  const logout = () => {
    localStorage.removeItem('ag_token');
    setToken('');
    setSession((prev) => ({
      ...prev,
      status: 'EXPIRED',
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        session,
        setSession,
        token,
        socket,
        notifications,
        addNotification,
        removeNotification,
        passkeyLogin,
        switchDemoUser,
        logout,
        activeModal,
        setActiveModal,
        pendingControlData,
        setPendingControlData,
        BACKEND_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;

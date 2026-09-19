import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

export default function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Inline MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionId, setMfaSessionId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e, contextOverride = null) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginContext = contextOverride || {
        network: 'office',
        location: 'office',
        deviceTrust: 'trusted',
        timeOfDay: 'normal',
      };

      if (isRegisterMode) {
        await api.register(name, email, password, role);
        const res = await api.login(email, password, loginContext);
        if (res.status === 'MFA_REQUIRED') {
          setMfaRequired(true);
          setMfaSessionId(res.sessionId);
          return;
        }
        loginUser(res.user, res.token, res.sessionId);
        navigate('/dashboard');
      } else {
        const res = await api.login(email, password, loginContext);
        if (res.status === 'MFA_REQUIRED') {
          setMfaRequired(true);
          setMfaSessionId(res.sessionId);
          return;
        }
        loginUser(res.user, res.token, res.sessionId);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setMfaError('Please enter a valid 6-digit OTP code');
      return;
    }

    setMfaError('');
    setMfaLoading(true);

    try {
      const res = await api.verifyMfa(mfaSessionId, otpCode.trim());
      if (res.status === 'ACTIVE' && res.token) {
        loginUser(res.user, res.token, res.sessionId || mfaSessionId);
        navigate('/dashboard');
      } else {
        setMfaError('Verification failed: invalid response state');
      }
    } catch (err) {
      setMfaError(err.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleQuickLogin = async (targetRole, simulateMfa = false) => {
    setError('');
    setLoading(true);
    const demoEmail = `${targetRole.toLowerCase()}@example.com`;
    const demoPassword = 'Password123!';
    const demoName = targetRole.charAt(0).toUpperCase() + targetRole.slice(1) + ' User';

    // If simulateMfa, pass medium-risk context so login requires MFA
    const loginContext = simulateMfa
      ? { network: 'public', location: 'near', deviceTrust: 'trusted', timeOfDay: 'normal' }
      : { network: 'office', location: 'office', deviceTrust: 'trusted', timeOfDay: 'normal' };

    try {
      try {
        const res = await api.login(demoEmail, demoPassword, loginContext);
        if (res.status === 'MFA_REQUIRED') {
          setMfaRequired(true);
          setMfaSessionId(res.sessionId);
          return;
        }
        loginUser(res.user, res.token, res.sessionId);
        navigate('/dashboard');
        return;
      } catch (firstErr) {
        if (firstErr.status === 403) {
          throw firstErr;
        }
        // Auto-register then login
        await api.register(demoName, demoEmail, demoPassword, targetRole);
        const res = await api.login(demoEmail, demoPassword, loginContext);
        if (res.status === 'MFA_REQUIRED') {
          setMfaRequired(true);
          setMfaSessionId(res.sessionId);
          return;
        }
        loginUser(res.user, res.token, res.sessionId);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        padding: '2.5rem',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.6rem',
            marginBottom: '0.75rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
          }}>
            J
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Proto Jarvis
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Zero-Trust Adaptive Access & Policy Engine
          </p>
        </div>

        {/* ----------------- INLINE MFA VIEW ----------------- */}
        {mfaRequired ? (
          <div>
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🛡️</div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.35rem' }}>
                MFA Step-Up Challenge Required
              </h2>
              <p style={{ fontSize: '0.83rem', color: '#3b82f6', lineHeight: 1.45, marginBottom: '0.5rem' }}>
                Stage A evaluation detected medium contextual risk. Complete one-time verification to activate session.
              </p>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                Session: {mfaSessionId}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fefce8',
              border: '1px dashed #fde047',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.8rem',
              color: '#854d0e',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>💡</span>
              <span><strong>Prototype Note:</strong> The 6-digit OTP code has been generated and logged directly to the server console.</span>
            </div>

            {mfaError && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}>
                {mfaError}
              </div>
            )}

            <form onSubmit={handleMfaVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem', textAlign: 'center' }}>
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={{
                    textAlign: 'center',
                    fontSize: '1.75rem',
                    letterSpacing: '0.35em',
                    fontWeight: 700,
                    padding: '12px',
                    borderRadius: '10px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={mfaLoading || otpCode.length !== 6}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  backgroundColor: '#2563eb',
                  opacity: mfaLoading || otpCode.length !== 6 ? 0.6 : 1,
                }}
              >
                {mfaLoading ? 'Verifying Code...' : 'Verify & Continue →'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaSessionId('');
                  setOtpCode('');
                  setMfaError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  marginTop: '0.25rem',
                }}
              >
                ← Cancel & Return to Login
              </button>
            </form>
          </div>
        ) : (
          /* ----------------- STANDARD LOGIN/REGISTER VIEW ----------------- */
          <div>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={(e) => handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {isRegisterMode && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. manager@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Role
                  </label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR Director</option>
                    <option value="soc">SOC Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Processing...' : (isRegisterMode ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
            </div>

            {/* Quick Demo Accounts */}
            <div style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px dashed #e2e8f0',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '0.75rem' }}>
                1-Click Prototype Demo Accounts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('manager')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 2px', textAlign: 'center', fontWeight: 600 }}
                  title="Login as Manager"
                >
                  Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('hr')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 2px', textAlign: 'center', fontWeight: 600 }}
                  title="Login as HR"
                >
                  HR
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('soc')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 2px', textAlign: 'center', fontWeight: 600, color: '#2563eb', borderColor: '#bfdbfe' }}
                  title="Login as SOC Analyst"
                >
                  SOC
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 2px', textAlign: 'center', fontWeight: 600 }}
                  title="Login as Admin"
                >
                  Admin
                </button>
              </div>

              {/* Explicit MFA Trigger Demo Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin('manager', true)}
                className="btn-outline-blue"
                style={{
                  width: '100%',
                  fontSize: '0.78rem',
                  padding: '7px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#f8fafc',
                }}
                title="Login with simulated public Wi-Fi trigger to test MFA Step-up flow"
              >
                <span>🛡️</span> Test Step-Up MFA Trigger (Simulate Medium Risk)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

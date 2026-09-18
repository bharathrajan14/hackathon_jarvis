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

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Register then login
        await api.register(name, email, password, role);
        const res = await api.login(email, password);
        loginUser(res.user, res.token);
        navigate('/dashboard');
      } else {
        const res = await api.login(email, password);
        loginUser(res.user, res.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for testing/demo
  const handleQuickLogin = async (targetRole) => {
    setError('');
    setLoading(true);
    const demoEmail = `${targetRole.toLowerCase()}@example.com`;
    const demoPassword = 'Password123!';
    const demoName = targetRole.charAt(0).toUpperCase() + targetRole.slice(1) + ' User';

    try {
      try {
        const res = await api.login(demoEmail, demoPassword);
        loginUser(res.user, res.token);
        navigate('/dashboard');
        return;
      } catch (_) {
        // If demo user does not exist yet, auto-register then login
        await api.register(demoName, demoEmail, demoPassword, targetRole);
        const res = await api.login(demoEmail, demoPassword);
        loginUser(res.user, res.token);
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
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        padding: '2.5rem',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)',
          }}>
            J
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
            Proto Jarvis
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Zero-Trust Adaptive Access & Policy Engine
          </p>
        </div>

        {/* Error notice */}
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

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>

        {/* Quick Demo Accounts */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '0.75rem' }}>
            Quick Demo Login (1-Click)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('employee')}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '8px 4px', textAlign: 'center' }}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager')}
              className="btn-outline-blue"
              style={{ fontSize: '0.8rem', padding: '8px 4px', textAlign: 'center', fontWeight: 600 }}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '8px 4px', textAlign: 'center' }}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

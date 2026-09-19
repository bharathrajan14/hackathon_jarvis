import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Fingerprint, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { passkeyLogin } = useAuth();
  const navigate = useNavigate();

  const [selectedPersona, setSelectedPersona] = useState('Alice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const personas = {
    Alice: {
      name: 'Alice',
      email: 'alice@adaptiveguard.internal',
      role: 'EMPLOYEE',
      dept: 'Engineering & Finance',
      desc: 'Standard enterprise employee accessing daily departmental resources.',
      badgeClass: 'badge-green',
    },
    Bob: {
      name: 'Bob',
      email: 'bob@adaptiveguard.internal',
      role: 'MANAGER',
      dept: 'Risk & Compliance',
      desc: 'Department manager authorized for dual-control approvals and team oversight.',
      badgeClass: 'badge-blue',
    },
    David: {
      name: 'David',
      email: 'david@adaptiveguard.internal',
      role: 'IT_ADMINISTRATOR',
      dept: 'Security Operations (SOC)',
      desc: 'Security operations administrator managing policies, fleet, and continuous telemetry.',
      badgeClass: 'badge-purple',
    },
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const target = personas[selectedPersona];

    try {
      await passkeyLogin(target.email, true);
      if (target.role === 'IT_ADMINISTRATOR') {
        navigate('/admin/dashboard');
      } else if (target.role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Passkey verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Ambience */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(7, 11, 20, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 10 }}>
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--color-blue)',
            }}
          >
            <Shield size={30} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            AdaptiveGuard
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            AI-Powered Adaptive Authorization & Continuous Security Platform
          </p>
        </div>

        {/* Centered Login Card */}
        <div
          className="ag-card-elevated"
          style={{
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-orange)', fontSize: '0.85rem', fontWeight: '600' }}>
              <Lock size={16} /> Secure Authentication
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#FFFFFF', marginTop: '6px' }}>
              Sign in with Registered Passkey
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              FIDO2 / WebAuthn cryptographic hardware signature. Your private key never leaves your device.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid var(--color-red)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--color-red)',
                fontSize: '0.8rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Development Demo Selector */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                marginBottom: '10px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              SELECT DEMO ACCOUNT:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.keys(personas).map((key) => {
                const p = personas[key];
                const isSelected = selectedPersona === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedPersona(key)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-primary)',
                      border: isSelected ? '1px solid var(--color-blue)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isSelected ? '5px solid var(--color-blue)' : '2px solid var(--border-color)',
                          backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#FFFFFF' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.dept}</div>
                      </div>
                    </div>
                    <span className={`badge ${p.badgeClass}`}>{p.role}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Action Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="ag-btn ag-btn-orange"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.95rem',
              borderRadius: '8px',
              fontWeight: '700',
            }}
          >
            <Fingerprint size={20} />
            {loading ? 'Authenticating with Passkey...' : 'Sign in with Passkey'}
            {!loading && <ArrowRight size={16} />}
          </button>

          {/* Security Note Footer */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <CheckCircle2 size={14} color="var(--color-green)" />
            <span>Protected by WebAuthn / Passkey & Continuous AI Anomaly Monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Clock, ShieldAlert, Fingerprint, LogOut, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export const EmployeeSession = () => {
  const { user, session, setSession, setActiveModal, setPendingControlData, logout } = useAuth();
  const navigate = useNavigate();

  const [extending, setExtending] = useState(false);

  const status = session?.status || 'ACTIVE';
  const riskScore = session?.currentRisk ?? 18;

  const handleExtendWithPasskey = () => {
    setPendingControlData({
      resourceName: 'Active Session Token',
      action: 'SESSION_EXTENSION',
      riskScore: 20,
      reason: ['Routine hardware session lease extension'],
      onSuccess: () => {
        setSession((prev) => ({
          ...prev,
          status: 'ACTIVE',
        }));
      },
    });
    setActiveModal('PASSKEY');
  };

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          My Active Security Session
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          AdaptiveGuard continuous session management lifecycle and cryptographic lease control.
        </p>
      </div>

      <div style={{ maxWidth: '680px' }}>
        {/* Session Status Display Box */}
        <div
          className="ag-card-elevated"
          style={{
            borderLeft: `5px solid ${status === 'ACTIVE' ? 'var(--color-green)' : status === 'REVOKED' ? 'var(--color-red)' : 'var(--color-orange)'}`,
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color={status === 'ACTIVE' ? 'var(--color-green)' : 'var(--color-red)'} />
              <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#FFFFFF' }}>
                {status === 'ACTIVE'
                  ? '🟢 ACTIVE SESSION'
                  : status === 'REVOKED'
                  ? '🔴 SESSION REVOKED'
                  : '🟠 SESSION EXPIRING'}
              </span>
            </div>
            <span className={`badge ${status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{status}</span>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
            {status === 'ACTIVE' &&
              'Your session token is healthy and cryptographically bound to your FIDO2 Passkey hardware.'}
            {status === 'REVOKED' &&
              'Critical security event detected. Your session has been instantly terminated by automated risk policy to prevent unauthorized exfiltration.'}
          </div>

          {/* Session Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              backgroundColor: 'var(--bg-primary)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
              fontSize: '0.8rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Session ID</span>
              <div style={{ fontWeight: '600', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                {session?.id?.slice(0, 8) || 'sess_live'}...
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>User</span>
              <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{user?.name}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Network</span>
              <div style={{ fontWeight: '600', color: 'var(--color-green)' }}>{session?.network || 'Corporate'} 🟢</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Current Risk</span>
              <div style={{ fontWeight: '700', color: riskScore >= 61 ? 'var(--color-purple)' : 'var(--color-green)' }}>
                {riskScore} / 100
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {status === 'ACTIVE' && (
              <>
                <button onClick={logout} className="ag-btn ag-btn-outline">
                  <LogOut size={16} /> Logout
                </button>
                <button onClick={handleExtendWithPasskey} className="ag-btn ag-btn-orange">
                  <Fingerprint size={16} /> Verify Passkey
                </button>
              </>
            )}

            {status === 'REVOKED' && (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="ag-btn ag-btn-red"
              >
                <RefreshCw size={16} /> Login Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSession;

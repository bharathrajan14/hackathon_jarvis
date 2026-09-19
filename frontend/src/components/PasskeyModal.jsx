import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Fingerprint, CheckCircle, AlertTriangle, X, ShieldAlert } from 'lucide-react';

export const PasskeyModal = ({ isOpen, onClose, resourceName, action, riskScore = 47, reason = ['High-sensitivity resource'], onSuccess }) => {
  const { session, BACKEND_URL } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'SUCCESS' | 'ERROR'
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleVerify = async () => {
    setVerifying(true);
    setErrorMsg('');

    try {
      // Simulate/trigger WebAuthn step-up verification endpoint
      const res = await fetch(`${BACKEND_URL}/api/auth/webauthn/step-up/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id,
          resourceName,
          action,
          simulated: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Passkey verification failed');

      setStatus('SUCCESS');
      setTimeout(() => {
        if (onSuccess) onSuccess(data);
        onClose();
        setStatus('IDLE');
      }, 1200);
    } catch (err) {
      console.error('Passkey verification error:', err);
      setStatus('ERROR');
      setErrorMsg(err.message || 'Biometric verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="ag-modal-overlay">
      <div className="ag-modal-content">
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Fingerprint size={18} color="var(--color-orange)" />
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFFFFF' }}>
              Additional Verification Required
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 20px' }}>
          {status === 'SUCCESS' ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid var(--color-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--color-green)',
                }}
              >
                <CheckCircle size={36} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-green)', marginBottom: '6px' }}>
                Verification Successful
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                FIDO2 hardware biometric signature confirmed. Access granted.
              </p>
            </div>
          ) : (
            <>
              {/* Resource Target */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Resource</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#FFFFFF', marginTop: '2px' }}>
                  {resourceName}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-blue)', fontFamily: 'var(--font-mono)' }}>
                  Action: {action}
                </div>
              </div>

              {/* Risk Context Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evaluated Risk</span>
                  <span className="badge badge-orange" style={{ fontSize: '0.75rem' }}>
                    {riskScore} / 100 🟠
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Policy Trigger:</div>
                <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {(Array.isArray(reason) ? reason : [reason]).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {status === 'ERROR' && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid var(--color-red)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--color-red)',
                    fontSize: '0.8rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{errorMsg || 'Biometric verification failed. Please retry.'}</span>
                </div>
              )}

              {/* Prompt message */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  marginBottom: '20px',
                }}
              >
                <Fingerprint size={28} color="var(--color-orange)" />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  Touch ID / Security Key prompt ready. Your cryptographic private key never leaves this hardware device.
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={onClose} className="ag-btn ag-btn-outline" disabled={verifying}>
                  Cancel
                </button>
                <button onClick={handleVerify} className="ag-btn ag-btn-orange" disabled={verifying} style={{ minWidth: '160px' }}>
                  <Fingerprint size={16} />
                  {verifying ? 'Verifying...' : 'Verify with Passkey'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasskeyModal;

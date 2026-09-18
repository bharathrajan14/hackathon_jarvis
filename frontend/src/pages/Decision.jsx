import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

export default function Decision() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerified, setMfaVerified] = useState(false);

  // Retrieve decision and context from router state or fallback
  const decision = location.state?.decision;
  const resource = location.state?.resource;
  const context = location.state?.context;

  if (!decision) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ color: '#0f172a', marginBottom: '0.75rem' }}>No Active Decision Found</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Please initiate an access request from the authorized resources dashboard.
        </p>
        <Link to="/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { riskScore, riskBand, factors, action } = decision;

  // Determine risk band badge style
  const getBandBadgeClass = (band) => {
    switch (band) {
      case 'Low': return 'badge-low';
      case 'Medium': return 'badge-medium';
      case 'High': return 'badge-high';
      case 'Critical': return 'badge-critical';
      default: return '';
    }
  };

  // Determine action badge style
  const getActionBadgeClass = (act) => {
    switch (act) {
      case 'ALLOW': return 'badge-allow';
      case 'READ_ONLY': return 'badge-readonly';
      case 'MFA':
      case 'MFA_PLUS_APPROVAL': return 'badge-mfa';
      case 'DENY': return 'badge-deny';
      default: return '';
    }
  };

  const handleMfaVerify = (e) => {
    e.preventDefault();
    if (mfaCode.length === 6) {
      setMfaVerified(true);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/dashboard" style={{ color: '#2563eb', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          ← Back to Resources
        </Link>
      </div>

      {/* Top Banner: Prominent Risk Score & Band */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        alignItems: 'center',
      }}>
        {/* Left: Score Gauge / Metric */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: riskScore >= 75 ? '#fee2e2' : riskScore >= 55 ? '#ffedd5' : riskScore >= 30 ? '#fef3c7' : '#dcfce7',
            border: `4px solid ${riskScore >= 75 ? '#ef4444' : riskScore >= 55 ? '#f97316' : riskScore >= 30 ? '#f59e0b' : '#22c55e'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {riskScore}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              / 100
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className={`badge ${getBandBadgeClass(riskBand)}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                {riskBand} Risk
              </span>
              <span className={`badge ${getActionBadgeClass(action)}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                {action}
              </span>
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
              Access Policy Evaluation
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Target Resource: <strong>{resource?.name || 'Resource'}</strong>
            </p>
          </div>
        </div>

        {/* Right: Summary Meta */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Decision Timestamp:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{new Date().toLocaleTimeString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Decision Action:</span>
            <span style={{ fontWeight: 700, color: action === 'DENY' ? '#dc2626' : '#2563eb' }}>{action}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Audit Log:</span>
            <Link to="/audit" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>
              View in Audit Logs →
            </Link>
          </div>
        </div>
      </div>

      {/* Explanation Factors Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.9rem' }}>
          Risk Factor Breakdown ({factors?.length || 0} Factors Evaluated)
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          {factors?.map((f) => (
            <div
              key={f.name}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {f.name}
                </span>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: f.points > 0 ? (f.points >= 20 ? '#dc2626' : '#d97706') : '#059669',
                  backgroundColor: f.points > 0 ? (f.points >= 20 ? '#fef2f2' : '#fffbeb') : '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${f.points > 0 ? (f.points >= 20 ? '#fca5a5' : '#fde68a') : '#a7f3d0'}`,
                }}>
                  +{f.points} pts
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distinct Visual State Per Action */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
          Enforced Policy State: <span style={{ color: '#2563eb' }}>{action}</span>
        </h2>

        {/* 1. ALLOW State */}
        {action === 'ALLOW' && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔓</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#15803d', marginBottom: '0.5rem' }}>
              Access Granted (Full Unlocked Content)
            </h3>
            <p style={{ color: '#166534', maxWidth: '600px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
              Your current environment risk is within normal thresholds. Full access to <strong>{resource?.name}</strong> has been provisioned.
            </p>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '650px',
              margin: '0 auto 1.5rem auto',
              textAlign: 'left',
            }}>
              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
                📄 {resource?.name} — Active Document Content
              </div>
              <p style={{ color: '#475569', fontSize: '0.88rem' }}>
                [CONFIDENTIAL] Decrypted secure payload loaded successfully. Full editing and exporting permissions unlocked.
              </p>
            </div>

            <button className="btn-primary" style={{ backgroundColor: '#16a34a' }}>
              📥 Download Document ({resource?.name})
            </button>
          </div>
        )}

        {/* 2. READ_ONLY State */}
        {action === 'READ_ONLY' && (
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👁️</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#b45309', marginBottom: '0.5rem' }}>
              Read-Only View Enforced (Download Disabled)
            </h3>
            <p style={{ color: '#92400e', maxWidth: '600px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
              Elevated risk detected ({riskBand} Risk). In accordance with policy, <strong>{resource?.name}</strong> is presented in a watermarked, non-exportable view.
            </p>

            <div style={{
              backgroundColor: '#ffffff',
              border: '2px dashed #f59e0b',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '650px',
              margin: '0 auto 1.5rem auto',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Watermark */}
              <div style={{
                position: 'absolute',
                top: '40%',
                left: '20%',
                fontSize: '2.5rem',
                fontWeight: 900,
                color: 'rgba(217, 119, 6, 0.12)',
                transform: 'rotate(-25deg)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                RESTRICTED READ-ONLY
              </div>

              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
                📄 {resource?.name} — Restricted Preview
              </div>
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
                This resource is rendered under DLP restrictions. Local printing, caching, copy-pasting, and raw file downloads are disabled by the policy engine.
              </p>
            </div>

            <button
              disabled
              style={{
                backgroundColor: '#e2e8f0',
                color: '#94a3b8',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                cursor: 'not-allowed',
                fontWeight: 600,
              }}
              title="Downloads disabled under READ_ONLY policy"
            >
              🚫 Download Disabled (Restricted)
            </button>
          </div>
        )}

        {/* 3. MFA / MFA_PLUS_APPROVAL State */}
        {(action === 'MFA' || action === 'MFA_PLUS_APPROVAL') && (
          <div style={{
            backgroundColor: '#eef2ff',
            border: '1px solid #c7d2fe',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3730a3', marginBottom: '0.5rem' }}>
              Multi-Factor Authentication Required {action === 'MFA_PLUS_APPROVAL' && '& Dual Approval'}
            </h3>
            <p style={{ color: '#4338ca', maxWidth: '600px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
              {action === 'MFA_PLUS_APPROVAL'
                ? 'High environmental risk requires dual verification: Enter your hardware token code and submit for manager approval.'
                : 'Medium risk requires step-up authentication. Please enter the 6-digit TOTP from your authenticator app.'}
            </p>

            {mfaVerified ? (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '1.5rem',
                maxWidth: '450px',
                margin: '0 auto',
                color: '#15803d',
                fontWeight: 600,
              }}>
                ✓ MFA Verification Successful! Unlocking provisional session...
              </div>
            ) : (
              <form onSubmit={handleMfaVerify} style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    letterSpacing: '0.3em',
                    fontWeight: 700,
                    padding: '12px',
                  }}
                />
                <button type="submit" className="btn-primary" style={{ width: '100%', backgroundColor: '#4f46e5' }}>
                  Verify Step-up Token
                </button>
              </form>
            )}
          </div>
        )}

        {/* 4. DENY State */}
        {action === 'DENY' && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛑</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
              Access Blocked — Security Violation Policy (DENY)
            </h3>
            <p style={{ color: '#b91c1c', maxWidth: '650px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Request scored <strong>{riskScore}/100 ({riskBand} Band)</strong>. Due to critical context risk (e.g. untrusted/unknown device operating over public network from an external geographic zone with high-sensitivity payload), access to <strong>{resource?.name}</strong> is strictly denied.
            </p>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '1.25rem',
              maxWidth: '550px',
              margin: '0 auto 1.5rem auto',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: '#7f1d1d',
            }}>
              <strong>Security Protocol Notice:</strong>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem' }}>
                <li>This event has been logged to the immutable audit ledger.</li>
                <li>To access sensitive resources, reconnect through a corporate VPN or authorized office workstation.</li>
              </ul>
            </div>

            <Link to="/audit" className="btn-secondary" style={{ color: '#991b1b', borderColor: '#fca5a5' }}>
              View Audit Event Record →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

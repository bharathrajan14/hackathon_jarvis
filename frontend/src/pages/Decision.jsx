import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Decision() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initial state from navigation
  const initialDecision = location.state?.decision;
  const resource = location.state?.resource;
  const context = location.state?.context;

  const [currentDecision, setCurrentDecision] = useState(initialDecision);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerified, setMfaVerified] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState('');
  const [simError, setSimError] = useState('');

  if (!currentDecision) {
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

  const { riskScore, riskBand, factors, action } = currentDecision;
  const sessionStatus = currentDecision.sessionStatus || currentDecision.session?.status || 'ACTIVE';
  const sessionRisk = currentDecision.currentRisk ?? currentDecision.session?.current_risk ?? riskScore;
  const sessionId = currentDecision.session?.id || context?.sessionId;

  const isRestricted = sessionStatus === 'RESTRICTED' || sessionStatus === 'SUSPENDED' || action === 'RESTRICT' || action === 'READ_ONLY';

  const getBandBadgeClass = (band) => {
    switch (band) {
      case 'Low': return 'badge-low';
      case 'Medium': return 'badge-medium';
      case 'High': return 'badge-high';
      case 'Critical': return 'badge-critical';
      default: return '';
    }
  };

  const getActionBadgeClass = (act) => {
    switch (act) {
      case 'ALLOW': return 'badge-allow';
      case 'READ_ONLY': return 'badge-readonly';
      case 'MFA':
      case 'MFA_PLUS_APPROVAL': return 'badge-mfa';
      case 'RESTRICT': return 'badge-medium';
      case 'SESSION_SUSPEND':
      case 'DENY': return 'badge-deny';
      default: return '';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' };
      case 'RESTRICTED':
        return { backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' };
      case 'SUSPENDED':
        return { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case 'MFA_REQUIRED':
        return { backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
    }
  };

  const handleMfaVerify = (e) => {
    e.preventDefault();
    if (mfaCode.length === 6) {
      setMfaVerified(true);
    }
  };

  // Simulate Sensitive Capture Attempt (High-Risk context trigger)
  const handleSimulateCaptureAttempt = async () => {
    setSimulating(true);
    setSimMessage('');
    setSimError('');

    try {
      // 1. Register an untrusted capture device probe
      const probeFingerprint = `untrusted_exfil_probe_${Date.now()}`;
      const devRes = await api.registerDevice(probeFingerprint);
      const deviceId = devRes.device.id;

      // 2. Submit high-risk access request with unknown network, far location, untrusted device
      const resId = resource?.id || '6943416b-a91a-465a-856b-0c5c0d3b9e6d';
      const escalatedData = await api.requestAccess(
        resId,
        'unknown', // network
        'far',     // location
        deviceId,
        sessionId
      );

      // 3. Update active decision state in-place
      setCurrentDecision(escalatedData);
      setSimMessage(
        `Simulation Executed: Risk climbed to ${escalatedData.riskScore}/100 (${escalatedData.riskBand}). Policy enforced: ${escalatedData.action}. Session Status updated to ${escalatedData.sessionStatus || escalatedData.session?.status}.`
      );
    } catch (err) {
      setSimError(err.message || 'Simulation request failed');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard" style={{ color: '#2563eb', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
          ← Back to Resources Dashboard
        </Link>
        <Link to="/soc" style={{ color: '#64748b', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
          🛡️ View in SOC Dashboard →
        </Link>
      </div>

      {/* Simulation Feedback Alert */}
      {simMessage && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.3rem' }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>High-Risk Capture Simulation Triggered</div>
            <div style={{ color: '#2563eb', fontSize: '0.85rem' }}>{simMessage}</div>
          </div>
        </div>
      )}

      {simError && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#991b1b',
          fontSize: '0.85rem',
        }}>
          {simError}
        </div>
      )}

      {/* Top Banner: Prominent Risk Score, Risk Band, and Live Session State */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        alignItems: 'center',
      }}>
        {/* Left: Score Gauge / Metric */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '105px',
            height: '105px',
            borderRadius: '50%',
            backgroundColor: riskScore >= 75 ? '#fee2e2' : riskScore >= 55 ? '#ffedd5' : riskScore >= 30 ? '#fef3c7' : '#dcfce7',
            border: `4px solid ${riskScore >= 75 ? '#ef4444' : riskScore >= 55 ? '#f97316' : riskScore >= 30 ? '#f59e0b' : '#22c55e'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {riskScore}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              / 100
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className={`badge ${getBandBadgeClass(riskBand)}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                {riskBand} Risk
              </span>
              <span className={`badge ${getActionBadgeClass(action)}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                Policy: {action}
              </span>
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Access Policy Evaluation
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Resource: <strong>{resource?.name || 'Protected Resource'}</strong>
            </p>
          </div>
        </div>

        {/* Right: Live Session Telemetry Card */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Live Session Status:</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '999px',
              ...getStatusBadgeStyle(sessionStatus),
            }}>
              ● {sessionStatus}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Session Current Risk:</span>
            <span style={{ fontWeight: 700, color: sessionRisk >= 55 ? '#dc2626' : '#2563eb' }}>
              {sessionRisk} / 100
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Enforced Policy Action:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{action}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Session ID:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
              {sessionId ? `${sessionId.slice(0, 8)}...` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Prototype Action: Simulate Sensitive Capture Attempt */}
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px dashed #f59e0b',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#92400e' }}>
              Simulate Sensitive Capture Attempt (Prototype Simulation)
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#b45309', margin: 0, lineHeight: 1.45 }}>
            Simulates an immediate high-risk anomalous exfiltration attempt (untrusted probe device, unknown network, far location).
            Evaluates the full Stage B policy climb, triggering <strong>RESTRICT</strong> or <strong>SESSION_SUSPEND</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSimulateCaptureAttempt}
          disabled={simulating}
          className="btn-primary"
          style={{
            backgroundColor: '#d97706',
            padding: '10px 18px',
            fontSize: '0.85rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)',
            opacity: simulating ? 0.6 : 1,
          }}
        >
          {simulating ? 'Simulating High-Risk Probe...' : '⚠️ Simulate Sensitive Capture Attempt'}
        </button>
      </div>

      {/* Factor Breakdown Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.9rem' }}>
          Evaluated Risk Factors ({factors?.length || 0} Factors Contributing)
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {f.name}
                </span>
                <span style={{
                  fontSize: '0.82rem',
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
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                {f.value || `${f.points} points`}
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
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* 1. ALLOW State */}
        {action === 'ALLOW' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: '#15803d' }}>
              <span style={{ fontSize: '1.8rem' }}>✓</span>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#15803d', margin: 0 }}>
                  Full Access Granted (ALLOW Policy)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#16a34a', margin: 0 }}>
                  Low evaluated risk ({riskScore}/100). All resource capabilities and downloads are fully enabled.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                {resource?.name || 'Confidential Data Asset'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Classification: {resource?.sensitivity?.toUpperCase() || 'STANDARD'} | Authorized for live viewing and full offline export.
              </p>
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1rem',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#334155',
                maxHeight: '150px',
                overflowY: 'auto',
              }}>
                [PAYLOAD VIEW] Secure content unlocked. Zero trust policy verification confirmed session integrity.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                disabled={isRestricted}
                className="btn-primary"
                style={{ opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer' }}
                onClick={() => alert('Download initiated for authorized asset.')}
              >
                {isRestricted ? '🚫 Download Disabled (Restricted)' : '⬇️ Download Asset'}
              </button>
              <button
                type="button"
                disabled={isRestricted}
                className="btn-secondary"
                style={{ opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer' }}
                onClick={() => alert('Exporting report data.')}
              >
                Export Summary
              </button>
            </div>
          </div>
        )}

        {/* 2. READ_ONLY or RESTRICT State */}
        {(action === 'READ_ONLY' || action === 'RESTRICT') && (
          <div>
            <div style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #ffedd5',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#c2410c', margin: 0 }}>
                  {action === 'RESTRICT' ? 'Session Restricted (RESTRICT Policy Enforced)' : 'Read-Only Access Granted (READ_ONLY Policy)'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#ea580c', margin: 0 }}>
                  Elevated risk score ({riskScore}/100). Content is restricted to inline browser viewing only. All export and file download options are disabled.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  {resource?.name || 'Protected Resource'} (Sanitized Inline View)
                </h4>
                <span className="badge badge-medium" style={{ fontSize: '0.75rem' }}>
                  🚫 Export Restricted
                </span>
              </div>
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1rem',
                fontSize: '0.85rem',
                color: '#475569',
                userSelect: 'none',
              }}>
                [PROTECTED PREVIEW ONLY] Clipboard copy, file download, and data exfiltration APIs are blocked for this session.
              </div>
            </div>

            {/* Explicitly disabled download/export buttons per requirement (2) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={true}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#94a3b8',
                  border: '1px solid #cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'not-allowed',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
                title="Downloads disabled under RESTRICT/READ_ONLY policy"
              >
                🚫 Download Disabled (Restricted Session)
              </button>
              <button
                type="button"
                disabled={true}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#94a3b8',
                  border: '1px solid #cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'not-allowed',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
                title="Export disabled under RESTRICT/READ_ONLY policy"
              >
                🚫 Export Blocked
              </button>
            </div>
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
              Step-Up Authentication Required {action === 'MFA_PLUS_APPROVAL' && '& Dual Approval'}
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
                ✓ MFA Verification Confirmed! Unlocking provisional session...
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

        {/* 4. SESSION_SUSPEND or DENY State */}
        {(action === 'SESSION_SUSPEND' || action === 'DENY') && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛑</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
              {action === 'SESSION_SUSPEND' ? 'Session Suspended (SESSION_SUSPEND Policy)' : 'Access Blocked — Security Violation (DENY Policy)'}
            </h3>
            <p style={{ color: '#b91c1c', maxWidth: '650px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Request scored <strong>{riskScore}/100 ({riskBand} Band)</strong>. Due to critical anomaly accumulation and context risk, access is terminated and session status has been set to <strong>{sessionStatus}</strong>.
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
              <strong>SOC Containment Active:</strong>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem' }}>
                <li>This anomaly event has been logged to the immutable SOC audit feed.</li>
                <li>Session ID: <code>{sessionId}</code> has been flagged for investigation.</li>
                <li>Contact the SOC Security Operations Desk to re-verify credentials.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <Link to="/audit" className="btn-secondary" style={{ color: '#991b1b', borderColor: '#fca5a5' }}>
                View Audit Event Feed →
              </Link>
              <Link to="/soc" className="btn-primary" style={{ backgroundColor: '#dc2626' }}>
                Open SOC Incident Drill-Down →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Globe, ShieldAlert, AlertTriangle, ShieldCheck, XCircle, ArrowLeft, Fingerprint, Lock, ExternalLink } from 'lucide-react';

export const WebAccess = () => {
  const { session, setActiveModal, setPendingControlData, BACKEND_URL } = useAuth();
  const navigate = useNavigate();

  const [activeUrl, setActiveUrl] = useState('company-portal.local');
  const [browserState, setBrowserState] = useState('ALLOWED'); // 'ALLOWED' | 'RESTRICTED' | 'BLOCKED'
  const [visitedDomain, setVisitedDomain] = useState('company-portal.local');
  const [passkeyVerifiedSites, setPasskeyVerifiedSites] = useState({});

  const domains = [
    {
      domain: 'company-portal.local',
      category: 'Corporate Intranet',
      risk: 'LOW',
      policy: 'ALLOW',
      desc: 'Approved corporate intranet portal and internal documentation repository.',
      badgeClass: 'badge-green',
    },
    {
      domain: 'restricted-demo.local',
      category: 'Unclassified External',
      risk: 'MEDIUM',
      policy: 'PASSKEY',
      desc: 'External development forum outside sanctioned browsing perimeter. Requires Passkey step-up.',
      badgeClass: 'badge-orange',
    },
    {
      domain: 'suspicious-download.local',
      category: 'Untrusted Binary Repository',
      risk: 'HIGH',
      policy: 'PASSKEY',
      desc: 'Untrusted external file hosting service detected. Strict elevated controls mandated.',
      badgeClass: 'badge-purple',
    },
    {
      domain: 'blocked-demo.local',
      category: 'Prohibited / Malware Vector',
      risk: 'CRITICAL',
      policy: 'DENY',
      desc: 'Known malicious domain flagged by threat intelligence. Strictly prohibited without exception.',
      badgeClass: 'badge-red',
    },
  ];

  const handleNavigate = async (domain) => {
    setActiveUrl(domain);
    setVisitedDomain(domain);

    if (domain === 'company-portal.local') {
      setBrowserState('ALLOWED');
    } else if (domain === 'restricted-demo.local') {
      if (passkeyVerifiedSites['restricted-demo.local']) {
        setBrowserState('ALLOWED');
      } else {
        setBrowserState('RESTRICTED');
        // Trigger simulation event on backend
        try {
          await fetch(`${BACKEND_URL}/api/simulation/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ triggerType: 'RESTRICTED_WEBSITE' }),
          });
        } catch (_) {}
      }
    } else if (domain === 'suspicious-download.local') {
      if (passkeyVerifiedSites['suspicious-download.local']) {
        setBrowserState('ALLOWED');
      } else {
        setBrowserState('RESTRICTED');
      }
    } else if (domain === 'blocked-demo.local') {
      setBrowserState('BLOCKED');
      // Trigger failed authorization telemetry
      try {
        await fetch(`${BACKEND_URL}/api/simulation/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerType: 'FAILED_AUTHORIZATION' }),
        });
      } catch (_) {}
    }
  };

  const handleVerifyPasskey = () => {
    setPendingControlData({
      resourceName: visitedDomain,
      action: 'WEB_BROWSING',
      riskScore: 54,
      reason: ['Outside approved browsing policy', 'Elevated network risk'],
      onSuccess: () => {
        setPasskeyVerifiedSites((prev) => ({ ...prev, [visitedDomain]: true }));
        setBrowserState('ALLOWED');
      },
    });
    setActiveModal('PASSKEY');
  };

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Secure Enterprise Web Access Gateway
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Real-time network inspection and zero trust web filtering. Every outbound domain request is evaluated.
        </p>
      </div>

      {/* Browser Shell Mockup */}
      <div
        className="ag-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          marginBottom: '28px',
        }}
      >
        {/* Browser Top Navigation Bar */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Mock Window Dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
          </div>

          {/* URL Input Box */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-primary)',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
            }}
          >
            <Lock size={14} color="var(--color-green)" />
            <span style={{ color: 'var(--text-muted)' }}>https://</span>
            <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{activeUrl}</span>
          </div>

          <span className="badge badge-dark" style={{ fontSize: '0.7rem' }}>
            ZT-GATEWAY ENFORCED
          </span>
        </div>

        {/* Browser Content Area */}
        <div style={{ minHeight: '340px', backgroundColor: 'var(--bg-card)', padding: '24px' }}>
          {browserState === 'ALLOWED' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid var(--color-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-green)',
                  margin: '0 auto 16px auto',
                }}
              >
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#FFFFFF', marginBottom: '8px' }}>
                Secure Destination Connected: {visitedDomain}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px auto' }}>
                Access granted by corporate web filtering policy. Encrypted TLS 1.3 tunnel established with zero trust continuous evaluation.
              </p>
              <div className="badge badge-green" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                ALLOW 🟢 | Low Risk Telemetry Verified
              </div>
            </div>
          )}

          {browserState === 'RESTRICTED' && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid var(--color-orange)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-orange)',
                  margin: '0 auto 16px auto',
                }}
              >
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-orange)', marginBottom: '6px' }}>
                ⚠ Website Restricted
              </h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#FFFFFF', marginBottom: '14px' }}>
                {visitedDomain}
              </div>
              <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '16px' }}>
                <span className="badge badge-orange">Risk: MEDIUM 🟠</span>
                <span className="badge badge-dark">Policy: RESTRICT</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 24px auto' }}>
                This destination is outside the approved enterprise browsing policy. Hardware Passkey verification is required to proceed.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => handleNavigate('company-portal.local')} className="ag-btn ag-btn-outline">
                  <ArrowLeft size={16} /> Go Back
                </button>
                <button onClick={handleVerifyPasskey} className="ag-btn ag-btn-orange">
                  <Fingerprint size={16} /> Verify with Passkey
                </button>
              </div>
            </div>
          )}

          {browserState === 'BLOCKED' && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--color-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-red)',
                  margin: '0 auto 16px auto',
                }}
              >
                <XCircle size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-red)', marginBottom: '6px' }}>
                🔴 Website Blocked
              </h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#FFFFFF', marginBottom: '14px' }}>
                {visitedDomain}
              </div>
              <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '16px' }}>
                <span className="badge badge-red">Decision: DENIED 🔴</span>
                <span className="badge badge-red">Risk: CRITICAL</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 24px auto' }}>
                This destination is strictly prohibited by security policy. Threat intelligence flags this host as a high-risk or malicious vector.
                No Passkey bypass is permitted.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => handleNavigate('company-portal.local')} className="ag-btn ag-btn-primary">
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Target Domain Selector Buttons */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px' }}>
          Simulated Demonstration Destinations
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {domains.map((d) => (
            <div
              key={d.domain}
              onClick={() => handleNavigate(d.domain)}
              className="ag-card"
              style={{
                cursor: 'pointer',
                borderColor: activeUrl === d.domain ? 'var(--color-blue)' : 'var(--border-color)',
                backgroundColor: activeUrl === d.domain ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFFFFF' }}>{d.domain}</span>
                <span className={`badge ${d.badgeClass}`}>{d.policy}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{d.desc}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Category: <strong>{d.category}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WebAccess;

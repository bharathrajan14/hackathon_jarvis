import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Eye, ShieldAlert, Laptop, Wifi, MapPin, Cpu, Clock, XOctagon } from 'lucide-react';

export const ManagerSessions = () => {
  const { BACKEND_URL } = useAuth();
  const [sessions, setSessions] = useState([
    {
      id: 'sess-alice-01',
      name: 'Alice',
      role: 'EMPLOYEE',
      risk: 24,
      level: 'LOW',
      device: 'Trusted MacBook Pro 🟢',
      network: 'Corporate Network 🟢',
      location: 'Known HQ 🟢',
      behavior: 'Normal 🟢',
      status: 'ACTIVE',
    },
    {
      id: 'sess-ravi-02',
      name: 'Ravi',
      role: 'EMPLOYEE',
      risk: 81,
      level: 'CRITICAL',
      device: 'Unknown Laptop 🟠',
      network: 'Public Network 🟠',
      location: 'Unusual Geo-IP 🟠',
      behavior: 'Anomalous 🟣',
      status: 'ACTIVE',
    },
  ]);

  const handleRevoke = async (sessionId, name) => {
    try {
      await fetch(`${BACKEND_URL}/api/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ag_token')}`,
        },
        body: JSON.stringify({ reason: `Manually revoked by manager for anomalous threat indicators` }),
      });

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'REVOKED', risk: 95, level: 'CRITICAL' } : s))
      );
    } catch (err) {
      console.error('Revoke session error:', err);
    }
  };

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Session Intelligence & Threat Containment
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Continuous evaluation of active concurrent sessions. Instantly terminate compromised tokens.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {sessions.map((s) => (
          <div
            key={s.id}
            className="ag-card-elevated"
            style={{
              borderLeft: `5px solid ${s.risk >= 81 ? 'var(--color-red)' : s.risk >= 61 ? 'var(--color-purple)' : s.risk >= 31 ? 'var(--color-orange)' : 'var(--color-green)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#FFFFFF' }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {s.role}</div>
              </div>
              <span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                {s.status}
              </span>
            </div>

            {/* Context Signals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Evaluated Risk:</span>
                <strong style={{ color: s.risk >= 81 ? 'var(--color-red)' : s.risk >= 61 ? 'var(--color-purple)' : 'var(--color-green)' }}>
                  {s.risk} / 100 ({s.level})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Device Telemetry:</span>
                <span>{s.device}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Network:</span>
                <span>{s.network}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                <span>{s.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Behavior Engine:</span>
                <span>{s.behavior}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {s.status === 'ACTIVE' && (
                <button
                  onClick={() => handleRevoke(s.id, s.name)}
                  className="ag-btn ag-btn-red"
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                >
                  <XOctagon size={14} /> Revoke Session
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerSessions;

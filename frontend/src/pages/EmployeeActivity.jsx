import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Activity, Clock, ShieldCheck, AlertTriangle, Fingerprint, Eye } from 'lucide-react';

export const EmployeeActivity = () => {
  const { user, BACKEND_URL } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/security/events?userId=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (_) {}
    };
    fetchActivity();
  }, [user, BACKEND_URL]);

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          My Security Activity Timeline
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Immutable log of all authentication, resource access, and adaptive policy events.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        {/* Timeline Stream */}
        <div className="ag-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.length > 0 ? (
              events.map((evt, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedEvent(evt)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: selectedEvent?.id === evt.id ? 'var(--bg-elevated)' : 'var(--bg-primary)',
                    border: selectedEvent?.id === evt.id ? '1px solid var(--color-blue)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        color: 'var(--color-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Activity size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#FFFFFF' }}>
                        {evt.resourceName || evt.eventType}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Action: {evt.action} • {new Date(evt.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${evt.riskScore >= 61 ? 'badge-purple' : evt.riskScore >= 31 ? 'badge-orange' : 'badge-green'}`}>
                      Risk {evt.riskScore}
                    </span>
                    <button className="ag-btn ag-btn-outline" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                      <Eye size={12} /> Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No events recorded yet today.
              </div>
            )}
          </div>
        </div>

        {/* Event Detail Inspector Panel */}
        <div className="ag-card-elevated">
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '14px' }}>
            Event Telemetry Inspector
          </h3>

          {selectedEvent ? (
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EVENT TYPE</span>
                <div style={{ fontWeight: '700', color: 'var(--color-blue)', fontFamily: 'var(--font-mono)' }}>
                  {selectedEvent.eventType}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RESOURCE</span>
                <div style={{ fontWeight: '600', color: '#FFFFFF' }}>
                  {selectedEvent.resourceName || 'System Gateway'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EVALUATED RISK</span>
                  <div style={{ fontWeight: '700', color: 'var(--color-orange)' }}>
                    {selectedEvent.riskScore} / 100
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DECISION</span>
                  <div style={{ fontWeight: '700', color: 'var(--color-green)' }}>
                    {selectedEvent.action}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '6px' }}>Evidence Factors</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Continuous authentication confirmed with Zero Trust contextual evaluation.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>
              Select an activity from the timeline to inspect full security telemetry factors.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeActivity;

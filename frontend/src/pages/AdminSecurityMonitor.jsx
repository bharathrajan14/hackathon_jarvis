import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Radio, ShieldAlert, AlertTriangle, Eye, X, Activity, Cpu } from 'lucide-react';

export const AdminSecurityMonitor = () => {
  const { socket, BACKEND_URL } = useAuth();
  const [monitorData, setMonitorData] = useState({
    systemRisk: 24,
    systemRiskLevel: 'LOW',
    activeAlerts: 3,
    activeSessions: 18,
    liveStream: [],
  });

  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchMonitor();

    if (socket) {
      const handleLiveEvent = (evt) => {
        setMonitorData((prev) => ({
          ...prev,
          activeAlerts: evt.severity === 'CRITICAL' ? prev.activeAlerts + 1 : prev.activeAlerts,
          liveStream: [
            {
              id: Date.now(),
              userName: evt.user || 'Alice',
              userRole: evt.role || 'EMPLOYEE',
              eventType: evt.type,
              severity: evt.severity || (evt.riskScore >= 81 ? 'CRITICAL' : evt.riskScore >= 61 ? 'HIGH' : 'LOW'),
              riskScore: evt.riskScore || 81,
              riskBand: evt.riskLevel || 'HIGH',
              policyAction: evt.decision || 'EVALUATED',
              createdAt: new Date().toISOString(),
              evidence: {
                previousRisk: evt.previousRisk || 52,
                currentRisk: evt.riskScore || 81,
                factors: [
                  { name: 'Unknown Network', points: 20 },
                  { name: 'Unusual Location', points: 15 },
                  { name: 'Request Spike', points: 20 },
                  { name: 'Sensitive Action', points: 15 },
                  { name: 'AI Anomaly Model', points: 21 },
                ],
              },
            },
            ...prev.liveStream.slice(0, 49),
          ],
        }));
      };

      socket.on('security.event', handleLiveEvent);
      return () => socket.off('security.event', handleLiveEvent);
    }
  }, [socket, BACKEND_URL]);

  const fetchMonitor = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/security/monitor`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMonitorData(data);
      }
    } catch (_) {}
  };

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} color="var(--color-red)" /> Live SOC Streaming Monitor
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Continuous adaptive authorization monitoring across all enterprise tenant identities.
          </p>
        </div>

        {/* Top Summary Badges */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="ag-card" style={{ padding: '8px 14px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>System Risk: </span>
            <strong style={{ color: 'var(--color-green)' }}>{monitorData.systemRisk} / 100 🟢</strong>
          </div>
          <div className="ag-card" style={{ padding: '8px 14px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Alerts: </span>
            <strong style={{ color: 'var(--color-red)' }}>{monitorData.activeAlerts} 🔴</strong>
          </div>
          <div className="ag-card" style={{ padding: '8px 14px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Sessions: </span>
            <strong style={{ color: '#FFFFFF' }}>{monitorData.activeSessions} 🟢</strong>
          </div>
        </div>
      </div>

      {/* Main Streaming Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? '1.2fr 0.8fr' : '1fr', gap: '20px' }}>
        <div className="ag-table-container">
          <table className="ag-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>User / Role</th>
                <th>Security Event</th>
                <th>Risk Progression</th>
                <th>Decision Policy</th>
                <th style={{ textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {monitorData.liveStream?.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </td>
                  <td>
                    <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-red' : item.severity === 'HIGH' ? 'badge-purple' : item.severity === 'MEDIUM' ? 'badge-orange' : 'badge-green'}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{item.userName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.userRole}</div>
                  </td>
                  <td style={{ fontWeight: '600', color: '#FFFFFF' }}>{item.eventType}</td>
                  <td>
                    <span style={{ fontWeight: '700', color: item.riskScore >= 81 ? 'var(--color-red)' : item.riskScore >= 61 ? 'var(--color-purple)' : 'var(--color-green)' }}>
                      Risk {item.riskScore}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${item.policyAction === 'ALLOW' ? 'badge-green' : item.policyAction === 'RESTRICT' ? 'badge-orange' : 'badge-red'}`}>
                      {item.policyAction}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedEvent(item)}
                      className="ag-btn ag-btn-outline"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 55: Event Investigation Panel */}
        {selectedEvent && (
          <div className="ag-card-elevated">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="var(--color-red)" />
                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Forensic Event Investigation</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IDENTITY</span>
                  <div style={{ fontWeight: '700', color: '#FFFFFF' }}>{selectedEvent.userName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{selectedEvent.userRole}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>OUTCOME</span>
                  <div style={{ fontWeight: '700', color: 'var(--color-red)' }}>{selectedEvent.policyAction}</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Current Evaluated Risk</span>
                  <strong style={{ color: 'var(--color-red)' }}>{selectedEvent.riskScore} / 100 🔴</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Event Severity</span>
                  <strong style={{ color: 'var(--color-purple)' }}>{selectedEvent.severity}</strong>
                </div>
              </div>

              {/* Factors Breakdown */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  CONTRIBUTING RISK FACTORS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                    <span>Unknown Network</span>
                    <strong style={{ color: 'var(--color-orange)' }}>+20</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                    <span>Unusual Location</span>
                    <strong style={{ color: 'var(--color-orange)' }}>+15</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                    <span>Request Rate Spike</span>
                    <strong style={{ color: 'var(--color-orange)' }}>+20</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                    <span>Sensitive Action</span>
                    <strong style={{ color: 'var(--color-orange)' }}>+15</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>AI Behavioral Anomaly</span>
                    <strong style={{ color: 'var(--color-purple)' }}>+21</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedEvent(null)} className="ag-btn ag-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSecurityMonitor;

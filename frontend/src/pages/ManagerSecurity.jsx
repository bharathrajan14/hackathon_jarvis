import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Radio, ShieldAlert, Activity, Wifi, Laptop, AlertTriangle } from 'lucide-react';

export const ManagerSecurity = () => {
  const { socket, BACKEND_URL } = useAuth();
  const [stream, setStream] = useState([]);

  useEffect(() => {
    // Initial fetch of recent telemetry
    const fetchInitial = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/security/events`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStream(data);
        }
      } catch (_) {}
    };
    fetchInitial();

    // Socket.IO real-time event listener (no refresh required!)
    if (socket) {
      const handleSecurityEvent = (evt) => {
        setStream((prev) => [
          {
            id: Date.now(),
            userName: evt.user || 'Unknown User',
            userRole: evt.role || 'EMPLOYEE',
            eventType: evt.type,
            resourceName: evt.resource || 'Platform Gateway',
            action: evt.action || 'EVALUATE',
            riskScore: evt.riskScore || 24,
            riskBand: evt.riskLevel || 'LOW',
            severity: evt.severity || (evt.riskScore >= 61 ? 'HIGH' : 'LOW'),
            createdAt: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ]);
      };

      socket.on('security.event', handleSecurityEvent);
      return () => {
        socket.off('security.event', handleSecurityEvent);
      };
    }
  }, [socket, BACKEND_URL]);

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} color="var(--color-red)" /> Live Security Telemetry Monitor
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Bidirectional real-time Socket.IO feed streaming contextual threat events across all active sessions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="status-dot status-dot-green" />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-green)', fontWeight: '600' }}>
            LIVE SOCKET CONNECTED
          </span>
        </div>
      </div>

      {/* Live Stream Table */}
      <div className="ag-table-container">
        <table className="ag-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Event Description</th>
              <th>Target Asset</th>
              <th>Risk Score</th>
              <th>Action Policy</th>
            </tr>
          </thead>
          <tbody>
            {stream.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(item.createdAt).toLocaleTimeString()}
                </td>
                <td>
                  <span style={{ fontWeight: '600', color: '#FFFFFF' }}>{item.userName}</span>{' '}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({item.userRole})</span>
                </td>
                <td style={{ fontWeight: '600', color: item.severity === 'CRITICAL' ? 'var(--color-red)' : item.severity === 'HIGH' ? 'var(--color-purple)' : '#FFFFFF' }}>
                  {item.eventType}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{item.resourceName || 'Platform'}</td>
                <td>
                  <span className={`badge ${item.riskScore >= 81 ? 'badge-red' : item.riskScore >= 61 ? 'badge-purple' : item.riskScore >= 31 ? 'badge-orange' : 'badge-green'}`}>
                    {item.riskScore} / 100
                  </span>
                </td>
                <td>
                  <span className={`badge ${item.action === 'ALLOW' ? 'badge-green' : item.action === 'RESTRICT' ? 'badge-orange' : item.action === 'DENY' || item.action === 'SESSION_REVOKED' ? 'badge-red' : 'badge-purple'}`}>
                    {item.action || 'EVALUATED'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerSecurity;

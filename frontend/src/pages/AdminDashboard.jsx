import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Shield, Users, Clock, AlertTriangle, AlertOctagon, Fingerprint, GitPullRequest, Cpu, CheckCircle } from 'lucide-react';

export const AdminDashboard = () => {
  const { BACKEND_URL } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 6,
    activeSessions: 4,
    highRiskSessions: 1,
    criticalAlerts: 2,
    blockedRequests: 14,
    passkeyEvents: 28,
    managerApprovals: 5,
    aiAnomalies: 7,
    systemHealth: [
      { service: 'Authentication Service (Passkey/FIDO2)', status: 'Operational 🟢', latency: '24ms' },
      { service: 'Authorization Engine (Action-Level RBAC)', status: 'Operational 🟢', latency: '12ms' },
      { service: 'Risk Engine (0-100 Normalization)', status: 'Operational 🟢', latency: '18ms' },
      { service: 'AI Behavior Engine (Isolation Forest)', status: 'Operational 🟢', latency: '35ms' },
      { service: 'Policy Engine (Dual-Control)', status: 'Operational 🟢', latency: '8ms' },
      { service: 'Audit Service (Immutable Logs)', status: 'Operational 🟢', latency: '15ms' },
      { service: 'Socket.IO Real-Time Daemon', status: 'Connected 🟢', latency: '4ms' },
    ],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (_) {}
    };
    fetchStats();
  }, [BACKEND_URL]);

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#FFFFFF' }}>
          Security Operations Center (SOC)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          System-wide adaptive authorization telemetry, identity risk postures, and AI behavioral drift.
        </p>
      </div>

      {/* 8 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-blue)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL USERS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#FFFFFF', marginTop: '2px' }}>{stats.totalUsers}</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-green)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACTIVE SESSIONS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-green)', marginTop: '2px' }}>{stats.activeSessions}</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-orange)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HIGH RISK SESSIONS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-orange)', marginTop: '2px' }}>{stats.highRiskSessions} 🟠</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-red)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CRITICAL ALERTS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-red)', marginTop: '2px' }}>{stats.criticalAlerts} 🔴</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-red)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BLOCKED REQUESTS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#FFFFFF', marginTop: '2px' }}>{stats.blockedRequests}</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-green)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PASSKEY EVENTS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-green)', marginTop: '2px' }}>{stats.passkeyEvents}</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-purple)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MANAGER APPROVALS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-purple)', marginTop: '2px' }}>{stats.managerApprovals}</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '3px solid var(--color-orange)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI ANOMALIES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-orange)', marginTop: '2px' }}>{stats.aiAnomalies}</div>
        </div>
      </div>

      {/* System Health Section */}
      <div className="ag-card">
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="var(--color-green)" /> AdaptiveGuard System Health & Runtime Microservices
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {stats.systemHealth?.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFFFFF' }}>{s.service}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Latency: {s.latency}</div>
              </div>
              <span className="badge badge-green">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

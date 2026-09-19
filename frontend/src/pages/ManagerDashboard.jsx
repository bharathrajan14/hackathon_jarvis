import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Users, GitPullRequest, AlertTriangle, Activity, ShieldCheck, ArrowRight, Eye, Radio } from 'lucide-react';

export const ManagerDashboard = () => {
  const { BACKEND_URL } = useAuth();
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState([
    { name: 'Alice', role: 'EMPLOYEE', dept: 'Engineering', risk: 24, level: 'LOW', device: 'Trusted 🟢', session: 'Active 🟢' },
    { name: 'John', role: 'EMPLOYEE', dept: 'Sales', risk: 54, level: 'MEDIUM', device: 'Trusted 🟢', session: 'Active 🟢' },
    { name: 'Ravi', role: 'EMPLOYEE', dept: 'Marketing', risk: 81, level: 'CRITICAL', device: 'Unknown 🔴', session: 'Alert 🔴' },
    { name: 'Priya', role: 'EMPLOYEE', dept: 'Product', risk: 22, level: 'LOW', device: 'Trusted 🟢', session: 'Active 🟢' },
  ]);

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(2);

  useEffect(() => {
    // Fetch live users and approvals
    const fetchData = async () => {
      try {
        const appRes = await fetch(`${BACKEND_URL}/api/manager/approvals`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
        });
        if (appRes.ok) {
          const appData = await appRes.json();
          const pending = appData.filter((a) => a.status === 'PENDING');
          setPendingApprovalsCount(pending.length || 1);
        }
      } catch (_) {}
    };
    fetchData();
  }, [BACKEND_URL]);

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Manager Operations & Risk Oversight
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Real-time dual-control approval center, team behavioral risk metrics, and active session monitoring.
        </p>
      </div>

      {/* 5 KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        <div className="ag-card" style={{ borderLeft: '4px solid var(--color-blue)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TEAM MEMBERS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#FFFFFF', marginTop: '4px' }}>24</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Across 3 departments</div>
        </div>

        <div
          onClick={() => navigate('/manager/approvals')}
          className="ag-card"
          style={{ borderLeft: '4px solid var(--color-purple)', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>PENDING APPROVALS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-purple)', marginTop: '4px' }}>
            {pendingApprovalsCount} 🟣
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-purple)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Review pending <ArrowRight size={12} />
          </div>
        </div>

        <div className="ag-card" style={{ borderLeft: '4px solid var(--color-red)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>HIGH RISK USERS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-red)', marginTop: '4px' }}>2 🔴</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-red)', marginTop: '4px' }}>Elevated threat telemetry</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '4px solid var(--color-green)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>ACTIVE SESSIONS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#FFFFFF', marginTop: '4px' }}>18 🟢</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-green)', marginTop: '4px' }}>Continuous FIDO2 bound</div>
        </div>

        <div className="ag-card" style={{ borderLeft: '4px solid var(--color-red)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>SECURITY ALERTS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-red)', marginTop: '4px' }}>3 🔴</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Requires investigation</div>
        </div>
      </div>

      {/* Team Risk Table */}
      <div className="ag-card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--color-blue)" /> Team Security Posture & Risk Distribution
          </h3>
          <button
            onClick={() => navigate('/manager/team')}
            className="ag-btn ag-btn-outline"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Manage Team
          </button>
        </div>

        <div className="ag-table-container">
          <table className="ag-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Role</th>
                <th>Current Risk</th>
                <th>Device Trust</th>
                <th>Session State</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.dept}</div>
                  </td>
                  <td>
                    <span className="badge badge-dark">{m.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${m.risk >= 81 ? 'badge-red' : m.risk >= 61 ? 'badge-purple' : m.risk >= 31 ? 'badge-orange' : 'badge-green'}`}>
                      {m.risk} / 100 ({m.level})
                    </span>
                  </td>
                  <td>{m.device}</td>
                  <td>{m.session}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => navigate('/manager/team')}
                      className="ag-btn ag-btn-outline"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;

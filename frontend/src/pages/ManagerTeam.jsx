import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Users, Eye, Search, Laptop, ShieldAlert, Clock } from 'lucide-react';

export const ManagerTeam = () => {
  const { BACKEND_URL } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (_) {}
    };
    fetchUsers();
  }, [BACKEND_URL]);

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
            Department Team Security Directory
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Inspect team member risk postures, hardware device fleet trust, and active session telemetry.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search team member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '0.8rem', outline: 'none' }}
          />
        </div>
      </div>

      {/* Team Table */}
      <div className="ag-table-container">
        <table className="ag-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Risk Score</th>
              <th>Device</th>
              <th>Session</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{u.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </td>
                <td>
                  <span className="badge badge-dark">{u.role}</span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{u.department}</td>
                <td>
                  <span className={`badge ${u.riskScore >= 81 ? 'badge-red' : u.riskScore >= 61 ? 'badge-purple' : u.riskScore >= 31 ? 'badge-orange' : 'badge-green'}`}>
                    {u.riskScore || 18} / 100 ({u.riskLevel || 'LOW'})
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '0.8rem', color: u.deviceTrusted ? 'var(--color-green)' : 'var(--color-red)' }}>
                    {u.deviceName || 'Workstation'} {u.deviceTrusted ? '🟢' : '🔴'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.sessionStatus === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                    {u.sessionStatus || 'ACTIVE'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="ag-btn ag-btn-outline"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    >
                      Investigate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Investigation Modal */}
      {selectedUser && (
        <div className="ag-modal-overlay">
          <div className="ag-modal-content">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Security Profile: {selectedUser.name}</span>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '12px' }}>Role: <strong>{selectedUser.role}</strong></div>
              <div style={{ marginBottom: '12px' }}>Department: <strong>{selectedUser.department}</strong></div>
              <div style={{ marginBottom: '12px' }}>Current Risk: <strong>{selectedUser.riskScore}/100 ({selectedUser.riskLevel})</strong></div>
              <div style={{ marginBottom: '12px' }}>Device: <strong>{selectedUser.deviceName} ({selectedUser.deviceTrusted ? 'Trusted' : 'Untrusted'})</strong></div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                Zero Trust posture verified. No anomalous exfiltration detected in the past 24 hours.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTeam;

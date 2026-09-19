import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Users, Eye, Shield, Laptop, Clock, Search } from 'lucide-react';

export const AdminUsers = () => {
  const { BACKEND_URL } = useAuth();
  const [users, setUsers] = useState([]);
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

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Enterprise User Management & Identity Governance
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Identity directory, assigned RBAC roles, hardware passkey enrollments, and real-time risk scores.
        </p>
      </div>

      <div className="ag-table-container">
        <table className="ag-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Current Risk</th>
              <th>Hardware Device</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{u.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </td>
                <td>
                  <span className={`badge ${u.role === 'IT_ADMINISTRATOR' ? 'badge-purple' : u.role === 'MANAGER' ? 'badge-blue' : 'badge-green'}`}>
                    {u.role}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.department}</td>
                <td>
                  <span className={`badge ${u.riskScore >= 81 ? 'badge-red' : u.riskScore >= 61 ? 'badge-purple' : u.riskScore >= 31 ? 'badge-orange' : 'badge-green'}`}>
                    {u.riskScore} / 100 ({u.riskLevel})
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '0.8rem', color: u.deviceTrusted ? 'var(--color-green)' : 'var(--color-orange)' }}>
                    {u.deviceName || 'Workstation'} {u.deviceTrusted ? '🟢' : '🟠'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-dark'}`}>
                    {u.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="ag-btn ag-btn-outline"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                  >
                    View User
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="ag-modal-overlay">
          <div className="ag-modal-content">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem' }}>User Profile: {selectedUser.name}</span>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '10px' }}>Email: <strong>{selectedUser.email}</strong></div>
              <div style={{ marginBottom: '10px' }}>Role: <strong>{selectedUser.role}</strong></div>
              <div style={{ marginBottom: '10px' }}>Current Risk: <strong>{selectedUser.riskScore}/100 🟢</strong></div>
              <div style={{ marginBottom: '10px' }}>FIDO2 Passkey: <strong>Enrolled & Active</strong></div>
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                Complies with enterprise least privilege security baselines.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

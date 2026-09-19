import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { FolderLock, Shield, Eye, Edit3 } from 'lucide-react';

export const AdminResources = () => {
  const { BACKEND_URL } = useAuth();
  const [resources, setResources] = useState([]);

  useEffect(() => {
    const fetchRes = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/resources`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResources(data);
        }
      } catch (_) {}
    };
    fetchRes();
  }, [BACKEND_URL]);

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Protected Enterprise Resources Catalog
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Asset classifications, assigned sensitivity tiers, and action-level gate policies.
        </p>
      </div>

      <div className="ag-table-container">
        <table className="ag-table">
          <thead>
            <tr>
              <th>Resource Name</th>
              <th>Sensitivity</th>
              <th>Allowed Roles</th>
              <th>Supported Actions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{r.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.description}</div>
                </td>
                <td>
                  <span className={`badge ${r.sensitivity === 'CRITICAL' ? 'badge-red' : r.sensitivity === 'HIGH' ? 'badge-purple' : r.sensitivity === 'MEDIUM' ? 'badge-orange' : 'badge-green'}`}>
                    {r.sensitivity}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {r.allowedRoles?.map((rl, i) => (
                      <span key={i} className="badge badge-dark" style={{ fontSize: '0.65rem' }}>{rl}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {r.actions?.map((act, i) => (
                      <span key={i} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{act}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="badge badge-green">ACTIVE 🟢</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminResources;

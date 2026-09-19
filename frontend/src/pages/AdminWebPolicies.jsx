import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Globe, Shield, Edit3 } from 'lucide-react';

export const AdminWebPolicies = () => {
  const { BACKEND_URL } = useAuth();
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/web-policies`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPolicies(data);
        }
      } catch (_) {}
    };
    fetchPolicies();
  }, [BACKEND_URL]);

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Zero Trust Web Filtering Policies
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Domain egress filtering and perimeter inspection rules.
        </p>
      </div>

      <div className="ag-table-container">
        <table className="ag-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Category</th>
              <th>Risk Tier</th>
              <th>Policy Action</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: '700', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{p.domain}</td>
                <td>{p.category}</td>
                <td>
                  <span className={`badge ${p.risk === 'CRITICAL' ? 'badge-red' : p.risk === 'HIGH' ? 'badge-purple' : p.risk === 'MEDIUM' ? 'badge-orange' : 'badge-green'}`}>
                    {p.risk}
                  </span>
                </td>
                <td>
                  <span className={`badge ${p.policy === 'ALLOW' ? 'badge-green' : p.policy === 'PASSKEY' ? 'badge-orange' : 'badge-red'}`}>
                    {p.policy}
                  </span>
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.description}</td>
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

export default AdminWebPolicies;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Laptop, Shield, Search, XOctagon } from 'lucide-react';

export const AdminDevices = () => {
  const { BACKEND_URL } = useAuth();
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/devices`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDevices(data);
        }
      } catch (_) {}
    };
    fetchDevices();
  }, [BACKEND_URL]);

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Enterprise Hardware Device Fleet Management
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Inspect endpoint hardware cryptographic enrollments, operating systems, and trust levels.
        </p>
      </div>

      <div className="ag-table-container">
        <table className="ag-table">
          <thead>
            <tr>
              <th>Device Name</th>
              <th>Enrolled User</th>
              <th>Platform / OS</th>
              <th>Browser</th>
              <th>Trust Level</th>
              <th>IP Context</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: '700', color: '#FFFFFF' }}>{d.name}</td>
                <td>
                  <div style={{ fontWeight: '600' }}>{d.userName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.userRole}</div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{d.platform}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{d.browser}</td>
                <td>
                  <span className={`badge ${d.trusted ? 'badge-green' : 'badge-red'}`}>
                    {d.trustLevel || (d.trusted ? 'Trusted 🟢' : 'Untrusted 🔴')}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{d.ip || '10.0.4.12'}</td>
                <td>
                  <span className="badge badge-green">ENROLLED</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDevices;

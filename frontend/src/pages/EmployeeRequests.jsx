import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { GitPullRequest, Clock, CheckCircle2, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';

export const EmployeeRequests = () => {
  const { user, BACKEND_URL } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/manager/approvals`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Filter requests for Alice or show all if employee
        setRequests(data);
      }
    } catch (err) {
      console.error('Fetch requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-green">APPROVED 🟢</span>;
      case 'REJECTED':
        return <span className="badge badge-red">REJECTED 🔴</span>;
      case 'EXPIRED':
        return <span className="badge badge-orange">EXPIRED 🟠</span>;
      default:
        return <span className="badge badge-purple">PENDING 🟣</span>;
    }
  };

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          My Access Requests
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Dual-control authorizations submitted for manager review. Approvals expire after 15 minutes.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="ag-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <GitPullRequest size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#FFFFFF' }}>No Access Requests Active</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            When you request high-sensitivity actions like bulk exports or downloads, manager approval requests will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {requests.map((req) => (
            <div key={req.id} className="ag-card-elevated" style={{ borderLeft: `4px solid ${req.status === 'APPROVED' ? 'var(--color-green)' : req.status === 'REJECTED' ? 'var(--color-red)' : 'var(--color-purple)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#FFFFFF' }}>
                    {req.resourceName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-blue)', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                    Action: {req.action}
                  </div>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {req.actionDescription}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.75rem', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Manager:</span>
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>Bob (Risk & Compliance)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Risk Score: <strong style={{ color: 'var(--color-purple)' }}>{req.riskScore || 72}/100 🟣</strong>
                </span>
                <span style={{ color: 'var(--color-orange)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Expiration: 14:59
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeRequests;

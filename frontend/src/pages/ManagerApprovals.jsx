import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { GitPullRequest, Check, X, ShieldAlert, Clock, User } from 'lucide-react';

export const ManagerApprovals = () => {
  const { setActiveModal, setPendingControlData, BACKEND_URL } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/manager/approvals`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (err) {
      console.error('Fetch approvals error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (req) => {
    setPendingControlData({
      request: req,
      onDecision: () => {
        fetchApprovals();
      },
    });
    setActiveModal('APPROVAL');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-green">APPROVED 🟢</span>;
      case 'REJECTED':
        return <span className="badge badge-red">REJECTED 🔴</span>;
      default:
        return <span className="badge badge-purple">PENDING 🟣</span>;
    }
  };

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Dual-Control Approval Center
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Review elevated-risk access requests from departmental employees. Every decision creates an auditable record.
        </p>
      </div>

      <div className="ag-table-container">
        <table className="ag-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Resource</th>
              <th>Action</th>
              <th>Risk Score</th>
              <th>Status</th>
              <th>Requested</th>
              <th style={{ textAlign: 'right' }}>Review</th>
            </tr>
          </thead>
          <tbody>
            {approvals.length > 0 ? (
              approvals.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{req.requestedByName || 'Alice'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{req.requestedByRole || 'EMPLOYEE'}</div>
                  </td>
                  <td style={{ fontWeight: '600', color: '#FFFFFF' }}>{req.resourceName}</td>
                  <td>
                    <span className="badge badge-blue">{req.action}</span>
                  </td>
                  <td>
                    <span className="badge badge-purple">
                      {req.riskScore || 68} / 100 🟣
                    </span>
                  </td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(req.createdAt).toLocaleTimeString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {req.status === 'PENDING' ? (
                      <button
                        onClick={() => handleReview(req)}
                        className="ag-btn ag-btn-purple"
                        style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                      >
                        Review Request
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No pending access requests at this time. All requests have been reviewed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerApprovals;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, X, Check, AlertOctagon, User, ShieldAlert } from 'lucide-react';

export const ApprovalModal = ({ isOpen, onClose, request, onDecision }) => {
  const { BACKEND_URL } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const handleDecision = async (decision) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/manager/approvals/${request.id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ag_token')}`,
        },
        body: JSON.stringify({ decision }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit decision');

      if (onDecision) onDecision(data);
      onClose();
    } catch (err) {
      console.error('Approval decision error:', err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const riskScore = request.riskScore || request.risk_score || 72;
  const riskFactors = Array.isArray(request.riskFactors)
    ? request.riskFactors
    : [
        { name: 'Sensitive Resource', value: 'High/Critical Asset Tier', points: 25 },
        { name: 'Export Operation', value: 'Bulk Data Exfiltration Vector', points: 20 },
        { name: 'Behavior Telemetry', value: 'Elevated Activity Velocity', points: 27 },
      ];

  return (
    <div className="ag-modal-overlay">
      <div className="ag-modal-content" style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--color-purple)" />
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFFFFF' }}>
              Review Security Access Request
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px' }}>
          {/* Requester Profile */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: 'var(--color-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
              }}
            >
              {request.requestedByName?.[0] || 'A'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#FFFFFF' }}>
                {request.requestedByName || 'Alice'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Role: {request.requestedByRole || 'EMPLOYEE'} | {request.requestedByEmail || 'alice@adaptiveguard.internal'}
              </div>
            </div>
            <span className="badge badge-purple">Pending Review</span>
          </div>

          {/* Target Resource & Action */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RESOURCE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#FFFFFF', marginTop: '2px' }}>
                {request.resourceName}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACTION</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-blue)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {request.action}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Justification:</strong> {request.actionDescription || 'No justification provided'}
          </div>

          {/* Risk Factors Breakdown */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              padding: '14px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Contributing Risk Factors</span>
              <span className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
                Risk {riskScore} / 100 🟣
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {riskFactors.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    padding: '4px 0',
                    borderBottom: '1px solid rgba(38, 50, 71, 0.3)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>• {f.name || f}</span>
                  <span style={{ color: 'var(--color-orange)', fontWeight: '600' }}>
                    {f.points ? `+${f.points}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleDecision('REJECTED')}
              className="ag-btn ag-btn-red"
              disabled={submitting}
              style={{ minWidth: '130px' }}
            >
              <AlertOctagon size={16} />
              Reject Request
            </button>
            <button
              onClick={() => handleDecision('APPROVED')}
              className="ag-btn ag-btn-green"
              disabled={submitting}
              style={{ minWidth: '140px' }}
            >
              <Check size={16} />
              Approve Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;

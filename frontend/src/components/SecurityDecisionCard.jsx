import React from 'react';
import { Shield, CheckCircle, AlertTriangle, Lock, XCircle, Cpu, Laptop, Wifi, MapPin } from 'lucide-react';

export const SecurityDecisionCard = ({ decisionData }) => {
  if (!decisionData) return null;

  const {
    resource = 'Protected Resource',
    action = 'VIEW',
    identity = 'Alice',
    role = 'EMPLOYEE',
    device = 'Trusted',
    network = 'Corporate',
    location = 'Office',
    behavior = 'Normal',
    aiAnomaly = 18,
    riskScore = 24,
    riskLevel = 'LOW',
    policy = 'Standard Adaptive Policy',
    decision = 'ALLOW',
    reason = ['Continuous baseline authorization confirmed'],
  } = decisionData;

  const getDecisionBadge = () => {
    switch (decision) {
      case 'ALLOW':
        return <span className="badge badge-green">ALLOW 🟢</span>;
      case 'RESTRICT':
        return <span className="badge badge-orange">RESTRICT / PASSKEY 🟠</span>;
      case 'MANAGER_APPROVAL':
        return <span className="badge badge-purple">MANAGER APPROVAL 🟣</span>;
      case 'APPROVAL_AND_PASSKEY':
        return <span className="badge badge-blue">DUAL CONTROL (APPROVAL + PASSKEY) 🔵</span>;
      case 'DENY':
        return <span className="badge badge-red">DENIED 🔴</span>;
      case 'SESSION_REVOKED':
        return <span className="badge badge-red" style={{ backgroundColor: '#000', color: '#EF4444' }}>SESSION REVOKED ⚫</span>;
      default:
        return <span className="badge badge-dark">{decision}</span>;
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="var(--color-blue)" />
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFFFFF' }}>
            Authorization Decision Analysis
          </span>
        </div>
        {getDecisionBadge()}
      </div>

      {/* Grid of Decision Vectors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          backgroundColor: 'var(--bg-primary)',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RESOURCE</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFFFFF' }}>{resource}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ACTION</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-blue)', fontFamily: 'var(--font-mono)' }}>{action}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>IDENTITY</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#FFFFFF' }}>{identity} ({role})</div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>DEVICE / NET</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{device} / {network}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>AI ANOMALY SCORE</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: aiAnomaly > 50 ? 'var(--color-purple)' : 'var(--color-green)' }}>
            {aiAnomaly} / 100
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RISK POSTURE</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: riskScore >= 61 ? 'var(--color-purple)' : riskScore >= 31 ? 'var(--color-orange)' : 'var(--color-green)' }}>
            {riskScore} / 100 ({riskLevel})
          </div>
        </div>
      </div>

      {/* Policy & Explanation */}
      <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Triggered Policy: <span style={{ color: '#FFFFFF' }}>{policy}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <strong>Decision Reason:</strong> {(Array.isArray(reason) ? reason : [reason]).join('; ')}
        </div>
      </div>
    </div>
  );
};

export default SecurityDecisionCard;

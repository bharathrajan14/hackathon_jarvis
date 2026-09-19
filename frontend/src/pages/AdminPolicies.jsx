import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Sliders, Shield, Lock, CheckCircle, Edit3 } from 'lucide-react';

export const AdminPolicies = () => {
  const { BACKEND_URL } = useAuth();
  const [policies, setPolicies] = useState({
    EMPLOYEE: [
      { rule: 'Normal View (Low/Medium)', requirement: 'ALLOW 🟢' },
      { rule: 'Sensitive View (High/Critical)', requirement: 'PASSKEY 🟠' },
      { rule: 'Document Download', requirement: 'MANAGER_APPROVAL 🟣' },
      { rule: 'Bulk Data Export', requirement: 'APPROVAL + PASSKEY 🔵' },
      { rule: 'Admin Console & Root Config', requirement: 'DENY 🔴' },
    ],
    MANAGER: [
      { rule: 'Team & Department Resources', requirement: 'ALLOW 🟢' },
      { rule: 'Sensitive Operational Reports', requirement: 'PASSKEY 🟠' },
      { rule: 'Approve Employee Download', requirement: 'MANAGER_APPROVAL 🟣' },
      { rule: 'Approve Employee Export', requirement: 'APPROVAL + PASSKEY 🔵' },
      { rule: 'Critical Infrastructure Changes', requirement: 'APPROVAL + PASSKEY 🔵' },
    ],
    IT_ADMINISTRATOR: [
      { rule: 'SOC Dashboard & Telemetry', requirement: 'ALLOW 🟢' },
      { rule: 'User Role Governance', requirement: 'PASSKEY 🟠' },
      { rule: 'Security Policy Updates', requirement: 'PASSKEY 🟠' },
      { rule: 'Session Revocation', requirement: 'PASSKEY 🟠' },
      { rule: 'Root Configuration Deletion', requirement: 'APPROVAL + PASSKEY 🔵' },
    ],
  });

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Role-Based Adaptive Authorization Policies
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Configurable policy matrices enforced dynamically by the Policy Engine at the action level.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Employee Policies */}
        <div className="ag-card-elevated" style={{ borderTop: '4px solid var(--color-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#FFFFFF' }}>EMPLOYEE Policy Rules</span>
            <span className="badge badge-green">Standard Tier</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {policies.EMPLOYEE.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{p.rule}</span>
                <span style={{ fontWeight: '700' }}>{p.requirement}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Manager Policies */}
        <div className="ag-card-elevated" style={{ borderTop: '4px solid var(--color-blue)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#FFFFFF' }}>MANAGER Policy Rules</span>
            <span className="badge badge-blue">Dual-Control Tier</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {policies.MANAGER.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{p.rule}</span>
                <span style={{ fontWeight: '700' }}>{p.requirement}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Policies */}
        <div className="ag-card-elevated" style={{ borderTop: '4px solid var(--color-purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#FFFFFF' }}>IT ADMINISTRATOR Policy</span>
            <span className="badge badge-purple">Privileged Tier</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {policies.IT_ADMINISTRATOR.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{p.rule}</span>
                <span style={{ fontWeight: '700' }}>{p.requirement}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPolicies;

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Laptop, Wifi, MapPin, Clock, Cpu } from 'lucide-react';

export const GlobalSecurityBar = () => {
  const { session } = useAuth();

  const riskScore = session?.currentRisk ?? 18;
  const riskLevel = session?.riskLevel ?? (riskScore >= 81 ? 'CRITICAL' : riskScore >= 61 ? 'HIGH' : riskScore >= 31 ? 'MEDIUM' : 'LOW');
  const network = session?.network || 'corporate';
  const location = session?.location || 'office';
  const status = session?.status || 'ACTIVE';

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'var(--color-red)';
      case 'HIGH':
        return 'var(--color-purple)';
      case 'MEDIUM':
        return 'var(--color-orange)';
      default:
        return 'var(--color-green)';
    }
  };

  const isTrustedNetwork = network === 'corporate' || network === 'office';
  const isKnownLocation = location === 'known' || location === 'office';
  const isTrustedDevice = session?.deviceTrust !== 'untrusted';
  const isBehaviorNormal = riskScore < 60;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color={getRiskColor()} />
          <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            CURRENT SECURITY STATE
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Continuous Re-Evaluation: <span style={{ color: 'var(--color-green)', fontWeight: '600' }}>Active 🟢</span>
        </div>
      </div>

      {/* Grid of Security Signals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '14px',
          marginBottom: '14px',
        }}
      >
        {/* Risk Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk</div>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: getRiskColor() }}>
            {riskScore}/100
          </div>
          <span className={`status-dot ${riskLevel === 'CRITICAL' ? 'status-dot-red' : riskLevel === 'HIGH' ? 'status-dot-purple' : riskLevel === 'MEDIUM' ? 'status-dot-orange' : 'status-dot-green'}`} />
        </div>

        {/* Device */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Laptop size={14} color="var(--text-muted)" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Device</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isTrustedDevice ? 'var(--color-green)' : 'var(--color-orange)' }}>
            {isTrustedDevice ? 'Trusted 🟢' : 'Unknown 🟠'}
          </div>
        </div>

        {/* Network */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wifi size={14} color="var(--text-muted)" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Network</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isTrustedNetwork ? 'var(--color-green)' : 'var(--color-orange)' }}>
            {isTrustedNetwork ? 'Corporate 🟢' : `${network} 🟠`}
          </div>
        </div>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={14} color="var(--text-muted)" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isKnownLocation ? 'var(--color-green)' : 'var(--color-orange)' }}>
            {isKnownLocation ? 'Known 🟢' : 'Unusual 🟠'}
          </div>
        </div>

        {/* Session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={14} color="var(--text-muted)" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Session</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: status === 'ACTIVE' ? 'var(--color-green)' : 'var(--color-red)' }}>
            {status} {status === 'ACTIVE' ? '🟢' : '🔴'}
          </div>
        </div>

        {/* Behavior */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={14} color="var(--text-muted)" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Behavior</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isBehaviorNormal ? 'var(--color-green)' : 'var(--color-purple)' }}>
            {isBehaviorNormal ? 'Normal 🟢' : 'Anomalous 🟣'}
          </div>
        </div>
      </div>

      {/* Visual Animated Risk Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(5, riskScore))}%`,
            backgroundColor: getRiskColor(),
            transition: 'width 0.5s ease-out, background-color 0.5s ease-out',
            borderRadius: '3px',
          }}
        />
      </div>
    </div>
  );
};

export default GlobalSecurityBar;

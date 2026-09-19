import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { RiskChart } from '../components/RiskChart';
import {
  Zap,
  RotateCcw,
  Play,
  Laptop,
  MapPin,
  Wifi,
  Globe,
  Lock,
  ShieldAlert,
  Cpu,
  Download,
  FileSpreadsheet,
  AlertOctagon,
  XOctagon,
  Activity,
  CheckCircle,
} from 'lucide-react';

export const AttackSimulation = () => {
  const { session, setSession, BACKEND_URL } = useAuth();

  const [loadingAction, setLoadingAction] = useState(null);
  const [runningScenario, setRunningScenario] = useState(false);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);

  useEffect(() => {
    fetchSimulationState();
    fetchRiskHistory();
  }, [session.currentRisk]);

  const fetchSimulationState = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/state`);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data.events || []);
      }
    } catch (_) {}
  };

  const fetchRiskHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/security/risk-history`);
      if (res.ok) {
        const data = await res.json();
        setRiskHistory(data);
      }
    } catch (_) {}
  };

  // Trigger individual attack simulation buttons
  const handleTrigger = async (triggerType) => {
    setLoadingAction(triggerType);
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerType }),
      });

      const data = await res.json();
      if (res.ok) {
        setSession((prev) => ({
          ...prev,
          currentRisk: data.riskAfter,
          riskLevel: data.riskLevel,
          status: data.sessionStatus,
        }));
        await fetchSimulationState();
        await fetchRiskHistory();
      }
    } catch (err) {
      console.error('Trigger simulation error:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Reset simulation to baseline (Risk 18, Low, Trusted Device)
  const handleReset = async () => {
    setLoadingAction('RESET');
    setScenarioStep(0);
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/reset`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSession((prev) => ({
          ...prev,
          currentRisk: data.currentRisk,
          riskLevel: data.riskLevel,
          status: data.status,
          network: data.network,
          location: data.location,
        }));
        await fetchSimulationState();
        await fetchRiskHistory();
      }
    } catch (err) {
      console.error('Reset simulation error:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Run the complete 12-Step Judge Story automated scenario
  const handleRunFullScenario = async () => {
    setRunningScenario(true);
    setScenarioStep(1);

    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/full-scenario`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSession((prev) => ({
          ...prev,
          currentRisk: data.finalRiskScore,
          riskLevel: 'CRITICAL',
          status: data.finalStatus,
        }));
        setScenarioStep(12);
        await fetchSimulationState();
        await fetchRiskHistory();
      }
    } catch (err) {
      console.error('Run full scenario error:', err);
    } finally {
      setRunningScenario(false);
    }
  };

  const riskScore = session?.currentRisk ?? 18;
  const riskLevel = session?.riskLevel ?? (riskScore >= 81 ? 'CRITICAL' : riskScore >= 61 ? 'HIGH' : riskScore >= 31 ? 'MEDIUM' : 'LOW');

  const attackButtons = [
    { type: 'UNKNOWN_DEVICE', label: 'Unknown Device', icon: <Laptop size={14} />, desc: 'Unregistered hardware fingerprint' },
    { type: 'UNUSUAL_LOCATION', label: 'Unusual Location', icon: <MapPin size={14} />, desc: 'Foreign Geo-IP velocity jump' },
    { type: 'SUSPICIOUS_NETWORK', label: 'Suspicious Network', icon: <Wifi size={14} />, desc: 'Insecure public Wi-Fi access' },
    { type: 'RESTRICTED_WEBSITE', label: 'Restricted Website', icon: <Globe size={14} />, desc: 'Probe on restricted-demo.local' },
    { type: 'FAILED_LOGIN', label: 'Failed Login', icon: <Lock size={14} />, desc: 'Credential stuffing retry spike' },
    { type: 'FAILED_AUTHORIZATION', label: 'Failed Authorization', icon: <ShieldAlert size={14} />, desc: 'Role boundary violation attempt' },
    { type: 'REQUEST_SPIKE', label: 'Request Spike', icon: <Cpu size={14} />, desc: 'AI anomaly: 78 req/min burst' },
    { type: 'SENSITIVE_DOWNLOAD', label: 'Sensitive Download', icon: <Download size={14} />, desc: 'High-sensitivity file extraction' },
    { type: 'BULK_EXPORT', label: 'Bulk Export', icon: <FileSpreadsheet size={14} />, desc: 'Full database exfiltration attempt' },
    { type: 'SESSION_HIJACKING', label: 'Session Hijacking', icon: <AlertOctagon size={14} />, desc: 'Concurrent token collision breach' },
    { type: 'CRITICAL_ACTION', label: 'Critical Action', icon: <XOctagon size={14} />, desc: 'Unauthorized system config modification' },
  ];

  return (
    <div>
      <GlobalSecurityBar />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={22} color="var(--color-orange)" /> AdaptiveGuard Attack Simulation Suite
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Simulate threat vectors, behavioral drift, and context changes to observe real-time dynamic authorization response.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleReset}
            disabled={loadingAction === 'RESET'}
            className="ag-btn ag-btn-outline"
            style={{ fontSize: '0.85rem' }}
          >
            <RotateCcw size={16} /> Reset Simulation
          </button>

          <button
            onClick={handleRunFullScenario}
            disabled={runningScenario}
            className="ag-btn ag-btn-purple"
            style={{ fontSize: '0.85rem', fontWeight: '700' }}
          >
            <Play size={16} /> {runningScenario ? 'Executing Scenario...' : 'Run Full Attack Scenario'}
          </button>
        </div>
      </div>

      {/* Current Simulation User Status Banner */}
      <div
        className="ag-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
          marginBottom: '24px',
          borderLeft: `5px solid ${riskScore >= 81 ? 'var(--color-red)' : riskScore >= 61 ? 'var(--color-purple)' : riskScore >= 31 ? 'var(--color-orange)' : 'var(--color-green)'}`,
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TARGET SIMULATION PERSONA</span>
          <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#FFFFFF', marginTop: '2px' }}>
            Alice <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>EMPLOYEE</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SESSION STATUS</div>
            <div style={{ fontWeight: '700', color: session.status === 'ACTIVE' ? 'var(--color-green)' : 'var(--color-red)' }}>
              {session.status} {session.status === 'ACTIVE' ? '🟢' : '⚫'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LIVE EVALUATED RISK</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: riskScore >= 81 ? 'var(--color-red)' : riskScore >= 61 ? 'var(--color-purple)' : riskScore >= 31 ? 'var(--color-orange)' : 'var(--color-green)' }}>
              {riskScore} / 100 ({riskLevel})
            </div>
          </div>
        </div>
      </div>

      {/* 11 Attack Trigger Buttons Grid */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '14px' }}>
          Granular Threat Vector Simulation Triggers (Section 66)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {attackButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => handleTrigger(btn.type)}
              disabled={loadingAction === btn.type}
              className="ag-card"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-elevated)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-orange)' }}>{btn.icon}</span>
                <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#FFFFFF' }}>{btn.label}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{btn.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Live Risk Evolution & Timeline Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Recharts Dynamic Curve */}
        <div className="ag-card">
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '14px' }}>
            Risk Score Escalation Over Time (Section 62 Recharts)
          </h3>
          <RiskChart data={riskHistory} />
        </div>

        {/* Section 67: Live Security Timeline */}
        <div className="ag-card">
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--color-green)" /> Live Security Event Progression
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {timelineEvents.length > 0 ? (
              timelineEvents.slice(0, 7).map((evt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#FFFFFF' }}>
                      {evt.event_type || evt.eventType}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(evt.created_at || evt.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${evt.risk_score >= 81 ? 'badge-red' : evt.risk_score >= 61 ? 'badge-purple' : evt.risk_score >= 31 ? 'badge-orange' : 'badge-green'}`}>
                      Risk {evt.risk_score}
                    </span>
                    <span className={`badge ${evt.policy_action === 'ALLOW' ? 'badge-green' : evt.policy_action === 'RESTRICT' ? 'badge-orange' : 'badge-red'}`}>
                      {evt.policy_action}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Run an attack vector above or click [Run Full Attack Scenario] to generate a timeline.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackSimulation;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Shield, ShieldAlert, Laptop, Clock, GitPullRequest, ArrowRight, FolderLock, Globe, Activity, CheckCircle, Lock } from 'lucide-react';

export const EmployeeDashboard = () => {
  const { user, session, BACKEND_URL } = useAuth();
  const navigate = useNavigate();

  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(1);

  const riskScore = session?.currentRisk ?? 18;
  const riskLevel = session?.riskLevel ?? (riskScore >= 81 ? 'CRITICAL' : riskScore >= 61 ? 'HIGH' : riskScore >= 31 ? 'MEDIUM' : 'LOW');

  useEffect(() => {
    // Fetch recent events for Alice
    const fetchRecent = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/security/events?userId=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setRecentEvents(data.slice(0, 6));
        }
      } catch (_) {}
    };
    fetchRecent();
  }, [user, BACKEND_URL]);

  return (
    <div>
      {/* Global Telemetry Bar */}
      <GlobalSecurityBar />

      {/* Hero Welcome Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
          Good morning, {user?.name || 'Alice'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Your access environment is being continuously evaluated by AdaptiveGuard AI Risk Engine.
        </p>
      </div>

      {/* Four Security KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Card 1: Current Risk */}
        <div className="ag-card" style={{ borderLeft: `4px solid ${riskScore >= 61 ? 'var(--color-purple)' : riskScore >= 31 ? 'var(--color-orange)' : 'var(--color-green)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>CURRENT RISK</span>
            <span className={`status-dot ${riskLevel === 'CRITICAL' ? 'status-dot-red' : riskLevel === 'HIGH' ? 'status-dot-purple' : riskLevel === 'MEDIUM' ? 'status-dot-orange' : 'status-dot-green'}`} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#FFFFFF', lineHeight: 1.1 }}>
            {riskScore} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
            <span className={`badge ${riskScore >= 61 ? 'badge-purple' : riskScore >= 31 ? 'badge-orange' : 'badge-green'}`}>
              {riskLevel}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Evaluated dynamically</span>
          </div>
        </div>

        {/* Card 2: Device Trust */}
        <div className="ag-card" style={{ borderLeft: '4px solid var(--color-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>HARDWARE DEVICE</span>
            <Laptop size={16} color="var(--color-green)" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#FFFFFF' }}>
            Trusted 🟢
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            MacBook Pro (FIDO2 Hardware Key Enrolled)
          </div>
        </div>

        {/* Card 3: Session Intelligence */}
        <div className="ag-card" style={{ borderLeft: `4px solid ${session.status === 'ACTIVE' ? 'var(--color-green)' : 'var(--color-red)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>SESSION STATUS</span>
            <Clock size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: session.status === 'ACTIVE' ? 'var(--color-green)' : 'var(--color-red)' }}>
            {session.status} {session.status === 'ACTIVE' ? '🟢' : '🔴'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Started: Today | Telemetry: Corporate LAN
          </div>
        </div>

        {/* Card 4: Access Requests */}
        <div className="ag-card" style={{ borderLeft: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>ACCESS REQUESTS</span>
            <GitPullRequest size={16} color="var(--color-orange)" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#FFFFFF' }}>
            {pendingRequestsCount} Pending 🟠
          </div>
          <div
            onClick={() => navigate('/employee/requests')}
            style={{ fontSize: '0.75rem', color: 'var(--color-blue)', marginTop: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Review pending approvals <ArrowRight size={12} />
          </div>
        </div>
      </div>

      {/* Access Posture & Timeline Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Dynamic Access State Matrix */}
        <div className="ag-card">
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderLock size={18} color="var(--color-blue)" /> Adaptive Authorization Posture
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Authorizations are actively determined right now based on role, sensitivity, context, and behavior:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#FFFFFF' }}>Normal Resources</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employee Portal, Handbook, Team Directory</div>
              </div>
              <span className="badge badge-green">ALLOWED 🟢</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#FFFFFF' }}>Sensitive Resources</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Financial Reports, Customer PII, Audit Logs</div>
              </div>
              <span className="badge badge-orange">PASSKEY REQUIRED 🟠</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#FFFFFF' }}>Document Downloads</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Financial Database Records, Exportable Tables</div>
              </div>
              <span className="badge badge-purple">MANAGER APPROVAL 🟣</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#FFFFFF' }}>Bulk Database Exports</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Customer CRM, Transactional Banking Ledger</div>
              </div>
              <span className="badge badge-blue">APPROVAL + PASSKEY 🔵</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="ag-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--color-orange)" /> Recent Activity Timeline
            </h3>
            <span
              onClick={() => navigate('/employee/activity')}
              style={{ fontSize: '0.75rem', color: 'var(--color-blue)', cursor: 'pointer' }}
            >
              View all
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentEvents.length > 0 ? (
              recentEvents.map((evt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFFFFF' }}>
                      {evt.resourceName || evt.eventType}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Action: {evt.action} | {new Date(evt.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className={`badge ${evt.riskScore >= 61 ? 'badge-purple' : evt.riskScore >= 31 ? 'badge-orange' : 'badge-green'}`}>
                    Risk {evt.riskScore}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFFFFF' }}>Login successful (Passkey)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>09:40 AM | Trusted Mac hardware</div>
                  </div>
                  <span className="badge badge-green">ALLOW 🟢</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFFFFF' }}>Viewed Employee Portal</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>09:44 AM | Internal handbook</div>
                  </div>
                  <span className="badge badge-green">ALLOW 🟢</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(38, 50, 71, 0.4)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFFFFF' }}>Financial Report requested</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>09:48 AM | High sensitivity</div>
                  </div>
                  <span className="badge badge-orange">PASSKEY 🟠</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#FFFFFF' }}>Download request submitted</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>09:50 AM | Sent to Manager Bob</div>
                  </div>
                  <span className="badge badge-purple">APPROVAL 🟣</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

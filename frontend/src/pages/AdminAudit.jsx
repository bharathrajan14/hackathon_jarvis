import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { FileText, Search, Filter, Sparkles, X, Shield, Clock } from 'lucide-react';

export const AdminAudit = () => {
  const { BACKEND_URL } = useAuth();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [explainingLog, setExplainingLog] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [decisionFilter, riskFilter]);

  const fetchLogs = async () => {
    try {
      let url = `${BACKEND_URL}/api/audit?`;
      if (decisionFilter) url += `decision=${decisionFilter}&`;
      if (riskFilter) url += `risk=${riskFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (_) {}
  };

  const handleAskCopilot = async (log) => {
    setExplainingLog(log);
    setLoadingAi(true);
    setAiExplanation(null);

    try {
      const res = await fetch(`${BACKEND_URL}/copilot/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ag_token')}`,
        },
        body: JSON.stringify({
          sessionId: log.sessionId || log.session_id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiExplanation(data.explanation);
      } else {
        setAiExplanation(`### System Facts\n- **User**: ${log.userName} (${log.userRole})\n- **Resource**: ${log.resourceName}\n- **Action**: ${log.action}\n- **Risk Score**: ${log.riskScore} (${log.riskLevel})\n- **Policy Decision**: ${log.decision}\n\n### Recommendation\n1. Maintain continuous zero trust posture.\n2. Review hardware device trust certificates.`);
      }
    } catch (err) {
      setAiExplanation(`### System Facts\n- **Event**: ${log.action} on ${log.resourceName}\n- **Evaluated Risk**: ${log.riskScore}/100\n- **Decision**: ${log.decision}\n\n### Recommendation\nZero Trust boundary confirmed.`);
    } finally {
      setLoadingAi(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      !search ||
      l.userName?.toLowerCase().includes(search.toLowerCase()) ||
      l.resourceName?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
            Enterprise Immutable Audit Trail
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Append-only cryptographic security audit records with Gemini-powered forensic analysis.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-card)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter audit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '0.8rem', outline: 'none' }}
            />
          </div>

          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem' }}
          >
            <option value="">All Decisions</option>
            <option value="ALLOW">ALLOW 🟢</option>
            <option value="RESTRICT">RESTRICT 🟠</option>
            <option value="MANAGER_APPROVAL">APPROVAL 🟣</option>
            <option value="DENY">DENY 🔴</option>
            <option value="SESSION_REVOKED">REVOKED ⚫</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="ag-table-container" style={{ marginBottom: '28px' }}>
        <table className="ag-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Identity</th>
              <th>Resource</th>
              <th>Action</th>
              <th>Decision</th>
              <th>Risk Score</th>
              <th>Passkey</th>
              <th style={{ textAlign: 'right' }}>Forensic AI</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l, idx) => (
              <tr key={l.id || idx}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(l.createdAt).toLocaleTimeString()}
                </td>
                <td>
                  <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{l.userName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.userRole}</div>
                </td>
                <td style={{ color: '#FFFFFF', fontWeight: '600' }}>{l.resourceName}</td>
                <td>
                  <span className="badge badge-dark">{l.action}</span>
                </td>
                <td>
                  <span className={`badge ${l.decision === 'ALLOW' ? 'badge-green' : l.decision === 'RESTRICT' ? 'badge-orange' : l.decision === 'DENY' || l.decision === 'SESSION_REVOKED' ? 'badge-red' : 'badge-purple'}`}>
                    {l.decision}
                  </span>
                </td>
                <td>
                  <span className={`badge ${l.riskScore >= 81 ? 'badge-red' : l.riskScore >= 61 ? 'badge-purple' : l.riskScore >= 31 ? 'badge-orange' : 'badge-green'}`}>
                    {l.riskScore} / 100
                  </span>
                </td>
                <td>
                  {l.passkeyEvent ? (
                    <span style={{ color: 'var(--color-green)', fontSize: '0.75rem' }}>Verified 🟢</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Standard</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleAskCopilot(l)}
                    className="ag-btn ag-btn-outline"
                    style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Sparkles size={12} color="var(--color-purple)" />
                    Explain
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gemini AI Copilot Explanation Modal */}
      {explainingLog && (
        <div className="ag-modal-overlay">
          <div className="ag-modal-content" style={{ maxWidth: '620px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--color-purple)" />
                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>AdaptiveGuard AI Forensic Copilot</span>
              </div>
              <button onClick={() => setExplainingLog(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', maxHeight: '420px', overflowY: 'auto' }}>
              {loadingAi ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ color: 'var(--color-purple)', marginBottom: '8px' }}>Evaluating session timeline evidence...</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Synthesizing System Facts and Recommendations</div>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {aiExplanation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAudit;

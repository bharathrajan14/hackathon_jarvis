import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

export default function SocDashboard() {
  const { user } = useAuth();
  const isSocAuthorized = user?.role === 'admin' || user?.role === 'soc' || user?.role === 'hr';

  // Live polling feed state
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedError, setFeedError] = useState('');

  // Session drill-down state
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // AI Copilot state
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotData, setCopilotData] = useState(null);
  const [copilotError, setCopilotError] = useState('');

  const pollingRef = useRef(null);

  // Fetch events on mount & set up polling
  useEffect(() => {
    if (!isSocAuthorized) return;

    fetchEvents(true);

    if (pollingActive) {
      pollingRef.current = setInterval(() => {
        fetchEvents(false);
      }, 4000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isSocAuthorized, pollingActive, eventTypeFilter]);

  const fetchEvents = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoadingEvents(true);
    setFeedError('');
    try {
      const params = {};
      if (eventTypeFilter !== 'ALL') {
        params.eventType = eventTypeFilter;
      }
      const data = await api.getSocEvents(params);
      setEvents(data || []);
    } catch (err) {
      setFeedError(err.message || 'Failed to fetch SOC events');
    } finally {
      if (showLoadingSpinner) setLoadingEvents(false);
    }
  };

  // Drill down into a session
  const handleDrillDown = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setLoadingSession(true);
    setSessionError('');
    setCopilotData(null);
    setCopilotError('');

    try {
      const data = await api.getSocSession(sessionId);
      setSessionDetail(data);
    } catch (err) {
      setSessionError(err.message || 'Failed to load session timeline');
    } finally {
      setLoadingSession(false);
    }
  };

  // Ask AI Copilot
  const handleAskCopilot = async () => {
    if (!selectedSessionId) return;
    setCopilotLoading(true);
    setCopilotError('');

    try {
      const res = await api.explainWithCopilot(selectedSessionId);
      setCopilotData(res);
    } catch (err) {
      setCopilotError(err.message || 'AI Copilot explanation failed');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Filter events by search query
  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.userName && e.userName.toLowerCase().includes(q)) ||
      (e.userEmail && e.userEmail.toLowerCase().includes(q)) ||
      (e.resourceName && e.resourceName.toLowerCase().includes(q)) ||
      (e.eventType && e.eventType.toLowerCase().includes(q)) ||
      (e.action && e.action.toLowerCase().includes(q)) ||
      (e.sessionId && e.sessionId.toLowerCase().includes(q))
    );
  });

  if (!isSocAuthorized) {
    return (
      <div style={{ maxWidth: '700px', margin: '4rem auto', padding: '2.5rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>SOC Access Restricted</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          This operations telemetry feed is restricted to SOC Analysts, HR Directors, and System Administrators.
        </p>
      </div>
    );
  }

  // Helper for rendering SVG risk-over-time line chart
  const renderRiskChart = (timelineEvents = []) => {
    if (!timelineEvents || timelineEvents.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
          No chronological timeline events recorded for this session yet.
        </div>
      );
    }

    const width = 640;
    const height = 180;
    const padX = 45;
    const padY = 25;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const points = timelineEvents.map((evt, idx) => {
      const x = timelineEvents.length === 1
        ? padX + plotW / 2
        : padX + (idx / (timelineEvents.length - 1)) * plotW;
      const score = Math.max(0, Math.min(100, evt.riskScore || 0));
      const y = padY + plotH - (score / 100) * plotH;
      return { x, y, score, evt, step: idx + 1 };
    });

    const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');

    // Threshold lines Y
    const yCrit = padY + plotH - (75 / 100) * plotH;
    const yHigh = padY + plotH - (55 / 100) * plotH;
    const yMed = padY + plotH - (30 / 100) * plotH;

    return (
      <div style={{ width: '100%', overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
            Session Risk Progression (Timeline: {timelineEvents.length} Events)
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span> Critical (75+)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#f97316', borderRadius: '50%' }}></span> High (55+)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></span> Med (30+)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></span> Low (&lt;30)</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Threshold guide lines */}
          <line x1={padX} y1={yCrit} x2={width - padX} y2={yCrit} stroke="#fca5a5" strokeDasharray="4,4" strokeWidth="1" />
          <line x1={padX} y1={yHigh} x2={width - padX} y2={yHigh} stroke="#fdba74" strokeDasharray="4,4" strokeWidth="1" />
          <line x1={padX} y1={yMed} x2={width - padX} y2={yMed} stroke="#fde68a" strokeDasharray="4,4" strokeWidth="1" />

          {/* Threshold text labels */}
          <text x={padX - 8} y={yCrit + 3} fill="#ef4444" fontSize="9" textAnchor="end" fontWeight="600">75</text>
          <text x={padX - 8} y={yHigh + 3} fill="#f97316" fontSize="9" textAnchor="end" fontWeight="600">55</text>
          <text x={padX - 8} y={yMed + 3} fill="#f59e0b" fontSize="9" textAnchor="end" fontWeight="600">30</text>
          <text x={padX - 8} y={padY + plotH + 3} fill="#10b981" fontSize="9" textAnchor="end" fontWeight="600">0</text>

          {/* Area fill under curve */}
          {points.length > 1 && (
            <polygon
              points={`${points[0].x},${padY + plotH} ${polylineStr} ${points[points.length - 1].x},${padY + plotH}`}
              fill="url(#riskGradient)"
              opacity="0.25"
            />
          )}

          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Risk Progression Line */}
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />
          )}

          {/* Point Circles */}
          {points.map((p, i) => {
            const circleColor = p.score >= 75 ? '#ef4444' : p.score >= 55 ? '#f97316' : p.score >= 30 ? '#f59e0b' : '#10b981';
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ffffff"
                  stroke={circleColor}
                  strokeWidth="3"
                />
                <text
                  x={p.x}
                  y={p.y - 9}
                  fill="#0f172a"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {p.score}
                </text>
                <text
                  x={p.x}
                  y={padY + plotH + 14}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="middle"
                >
                  E{p.step}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.75rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🛰️</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              SOC Operations Center & Live Feed
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: pollingActive ? '#ecfdf5' : '#f1f5f9',
              color: pollingActive ? '#059669' : '#64748b',
              border: `1px solid ${pollingActive ? '#a7f3d0' : '#cbd5e1'}`,
              borderRadius: '999px',
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                backgroundColor: pollingActive ? '#10b981' : '#94a3b8',
                borderRadius: '50%',
              }}></span>
              {pollingActive ? 'POLLING LIVE (4s)' : 'POLLING PAUSED'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            Real-time security events ledger, cross-session anomaly telemetry, and AI Incident Copilot investigation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setPollingActive(!pollingActive)}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
          >
            {pollingActive ? '⏸ Pause Polling' : '▶ Resume Polling'}
          </button>
          <button
            type="button"
            onClick={() => fetchEvents(true)}
            disabled={loadingEvents}
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
          >
            {loadingEvents ? 'Updating...' : '🔄 Refresh Now'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Live Events Feed, Right = Session Drill-Down & AI Copilot */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedSessionId ? '1fr 1fr' : '1fr',
        gap: '2rem',
        alignItems: 'start',
      }}>
        {/* ----------------- LEFT: LIVE EVENT FEED ----------------- */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Live Security Events ({filteredEvents.length})
            </h2>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '5px 10px', borderRadius: '6px' }}
              >
                <option value="ALL">All Event Types</option>
                <option value="ACCESS_REQUEST">ACCESS_REQUEST</option>
                <option value="APPROVAL_REQUEST">APPROVAL_REQUEST</option>
                <option value="APPROVAL_GRANTED">APPROVAL_GRANTED</option>
                <option value="APPROVAL_DENIED">APPROVAL_DENIED</option>
                <option value="MFA_FAILURE">MFA_FAILURE</option>
              </select>

              <input
                type="text"
                placeholder="Search user, resource, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '5px 10px', borderRadius: '6px', width: '180px' }}
              />
            </div>
          </div>

          {feedError && (
            <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {feedError}
            </div>
          )}

          {loadingEvents && events.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Streaming security events...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              No security events match the active filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '680px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>Resource</th>
                    <th>Risk</th>
                    <th>Action</th>
                    <th>Investigate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((evt) => {
                    const isSelected = selectedSessionId === evt.sessionId;
                    return (
                      <tr
                        key={evt.id}
                        style={{
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                          {new Date(evt.createdAt).toLocaleTimeString()}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{evt.userName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{evt.userRole}</div>
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                          }}>
                            {evt.eventType}
                          </span>
                        </td>
                        <td>{evt.resourceName}</td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: evt.riskScore >= 75 ? '#dc2626' : evt.riskScore >= 55 ? '#ea580c' : evt.riskScore >= 30 ? '#d97706' : '#059669',
                          }}>
                            {evt.riskScore}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            evt.action === 'ALLOW' ? 'badge-allow' :
                            evt.action === 'RESTRICT' || evt.action === 'READ_ONLY' ? 'badge-medium' :
                            evt.action === 'MFA' || evt.action === 'MFA_PLUS_APPROVAL' ? 'badge-mfa' : 'badge-deny'
                          }`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {evt.action}
                          </span>
                        </td>
                        <td>
                          {evt.sessionId ? (
                            <button
                              type="button"
                              onClick={() => handleDrillDown(evt.sessionId)}
                              className="btn-secondary"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                color: isSelected ? '#1d4ed8' : '#2563eb',
                                borderColor: isSelected ? '#93c5fd' : '#cbd5e1',
                                fontWeight: 600,
                              }}
                            >
                              {isSelected ? 'Viewing' : 'Drill Down →'}
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ----------------- RIGHT: SESSION DRILL-DOWN & AI COPILOT ----------------- */}
        {selectedSessionId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Session Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔍</span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Session Forensic Drill-Down
                    </h2>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                    ID: {selectedSessionId}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                  title="Close Drill-Down"
                >
                  ✕
                </button>
              </div>

              {loadingSession ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Loading session forensics...
                </div>
              ) : sessionError ? (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {sessionError}
                </div>
              ) : sessionDetail ? (
                <div>
                  {/* Session Metrics Bar */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    padding: '1rem',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.25rem',
                    textAlign: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: sessionDetail.session.status === 'ACTIVE' ? '#059669' : sessionDetail.session.status === 'SUSPENDED' ? '#dc2626' : '#ea580c',
                      }}>
                        ● {sessionDetail.session.status}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Risk</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        {sessionDetail.session.currentRisk || 0} / 100
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>User Identity</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        {sessionDetail.session.userName}
                      </div>
                    </div>
                  </div>

                  {/* SVG Risk Over Time Line Chart */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    {renderRiskChart(sessionDetail.events)}
                  </div>

                  {/* Ask Copilot Button Banner */}
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>✨</span> AI Security Incident Copilot
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#15803d' }}>
                        Generate zero-hallucination analysis of this session's risk climb and SOC containment recommendations.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAskCopilot}
                      disabled={copilotLoading}
                      className="btn-primary"
                      style={{
                        backgroundColor: '#16a34a',
                        fontSize: '0.85rem',
                        padding: '9px 16px',
                        whiteSpace: 'nowrap',
                        fontWeight: 700,
                        opacity: copilotLoading ? 0.6 : 1,
                      }}
                    >
                      {copilotLoading ? 'Analyzing Session...' : '✨ Ask Copilot'}
                    </button>
                  </div>

                  {/* Chronological Session Events Timeline List */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                      Session Events Timeline ({sessionDetail.events?.length || 0})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto' }}>
                      {sessionDetail.events?.map((evt, idx) => (
                        <div
                          key={evt.id}
                          style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              #{idx + 1} {evt.eventType}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                              {new Date(evt.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                            <span>Target: {evt.resourceName}</span>
                            <span>
                              Score: <strong>{evt.riskScore}</strong> ({evt.riskBand}) → <strong>{evt.action}</strong>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* AI Copilot Explanation Card */}
            {copilotData && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #86efac',
                padding: '1.75rem',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>🤖</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                      AI Incident Copilot Assessment
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: copilotData.source === 'gemini' ? '#eff6ff' : '#f0fdf4',
                    color: copilotData.source === 'gemini' ? '#1d4ed8' : '#15803d',
                    border: `1px solid ${copilotData.source === 'gemini' ? '#bfdbfe' : '#bbf7d0'}`,
                  }}>
                    Engine: {copilotData.source === 'gemini' ? 'Gemini 1.5 Flash' : 'Deterministic Factual Engine'}
                  </span>
                </div>

                <div style={{
                  fontSize: '0.86rem',
                  lineHeight: 1.6,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f8fafc',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  {copilotData.explanation}
                </div>
              </div>
            )}

            {copilotError && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                border: '1px solid #fecaca',
              }}>
                {copilotError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

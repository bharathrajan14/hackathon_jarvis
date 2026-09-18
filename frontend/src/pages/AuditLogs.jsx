import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterBand, setFilterBand] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getRiskBandBadge = (band) => {
    const normalized = (band || '').toLowerCase();
    switch (normalized) {
      case 'low':
        return <span className="badge badge-low">Low</span>;
      case 'medium':
        return <span className="badge badge-medium">Medium</span>;
      case 'high':
        return <span className="badge badge-high">High</span>;
      case 'critical':
        return <span className="badge badge-critical">Critical</span>;
      default:
        return <span className="badge">{band || 'Unknown'}</span>;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'ALLOW':
        return <span className="badge badge-allow">ALLOW</span>;
      case 'READ_ONLY':
        return <span className="badge badge-readonly">READ ONLY</span>;
      case 'MFA':
        return <span className="badge badge-mfa">MFA REQUIRED</span>;
      case 'MFA_PLUS_APPROVAL':
        return <span className="badge badge-mfa">MFA + APPROVAL</span>;
      case 'DENY':
        return <span className="badge badge-deny">DENY</span>;
      default:
        return <span className="badge">{action}</span>;
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
      const date = new Date(ts);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (_) {
      return ts;
    }
  };

  // Filter and sort logs
  const filteredLogs = logs
    .filter((log) => {
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;
      if (filterBand !== 'ALL' && (log.riskBand || '').toLowerCase() !== filterBand.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = (log.userName || '').toLowerCase().includes(q);
        const matchResource = (log.resourceName || '').toLowerCase().includes(q);
        if (!matchUser && !matchResource) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
              Security Audit Logs
            </h1>
            <span
              style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {logs.length} Total Records
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.95rem', marginTop: '4px' }}>
            Immutable ledger of real-time zero-trust access requests, computed risk scores, and enforced policy actions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span style={{ fontSize: '1rem', display: 'inline-block', transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}>
              🔄
            </span>
            {loading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
          <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>
            + New Request
          </Link>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by user or resource name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '36px',
              fontSize: '0.9rem',
              backgroundColor: '#f8fafc',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Action:</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{
                width: 'auto',
                fontSize: '0.85rem',
                padding: '6px 10px',
                backgroundColor: '#f8fafc',
              }}
            >
              <option value="ALL">All Actions</option>
              <option value="ALLOW">ALLOW</option>
              <option value="READ_ONLY">READ_ONLY</option>
              <option value="MFA">MFA</option>
              <option value="MFA_PLUS_APPROVAL">MFA_PLUS_APPROVAL</option>
              <option value="DENY">DENY</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Risk Band:</label>
            <select
              value={filterBand}
              onChange={(e) => setFilterBand(e.target.value)}
              style={{
                width: 'auto',
                fontSize: '0.85rem',
                padding: '6px 10px',
                backgroundColor: '#f8fafc',
              }}
            >
              <option value="ALL">All Bands</option>
              <option value="low">Low (0-29)</option>
              <option value="medium">Medium (30-54)</option>
              <option value="high">High (55-74)</option>
              <option value="critical">Critical (75-100)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Sort Time:</label>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Click to toggle order"
            >
              {sortOrder === 'desc' ? '⏱️ Newest First' : '⏱️ Oldest First'}
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#b91c1c',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {error}</span>
          <button onClick={fetchLogs} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Audit Table Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {loading && logs.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>⏳</div>
            <p style={{ fontWeight: 500 }}>Loading live audit logs from backend database...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</div>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '6px' }}>
              No audit logs found
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              {searchQuery || filterAction !== 'ALL' || filterBand !== 'ALL'
                ? 'No access requests match your selected filters. Try clearing them.'
                : 'No access requests have been logged yet. Go to the Dashboard to submit your first request.'}
            </p>
            <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Submit an Access Request
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '14px 20px' }}>User</th>
                  <th style={{ padding: '14px 20px' }}>Target Resource</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>Risk Score</th>
                  <th style={{ padding: '14px 20px' }}>Risk Band</th>
                  <th style={{ padding: '14px 20px' }}>Policy Decision</th>
                  <th
                    style={{
                      padding: '14px 20px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    title="Click to sort by time"
                  >
                    Timestamp {sortOrder === 'desc' ? '▼' : '▲'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => {
                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: index < filteredLogs.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      {/* User */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            {(log.userName || 'U')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {log.userName || 'Unknown User'}
                          </span>
                        </div>
                      </td>

                      {/* Resource */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem' }}>📄</span>
                          <span style={{ color: '#1e293b', fontWeight: 500 }}>
                            {log.resourceName || 'Unknown Resource'}
                          </span>
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            backgroundColor:
                              log.riskScore >= 75
                                ? '#fef2f2'
                                : log.riskScore >= 55
                                ? '#fff1f2'
                                : log.riskScore >= 30
                                ? '#fffbeb'
                                : '#ecfdf5',
                            color:
                              log.riskScore >= 75
                                ? '#b91c1c'
                                : log.riskScore >= 55
                                ? '#be123c'
                                : log.riskScore >= 30
                                ? '#b45309'
                                : '#047857',
                            border: `1px solid ${
                              log.riskScore >= 75
                                ? '#fca5a5'
                                : log.riskScore >= 55
                                ? '#fecdd3'
                                : log.riskScore >= 30
                                ? '#fde68a'
                                : '#a7f3d0'
                            }`,
                          }}
                        >
                          {log.riskScore} / 100
                        </span>
                      </td>

                      {/* Risk Band */}
                      <td style={{ padding: '16px 20px' }}>
                        {getRiskBandBadge(log.riskBand)}
                      </td>

                      {/* Policy Action */}
                      <td style={{ padding: '16px 20px' }}>
                        {getActionBadge(log.action)}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#94a3b8',
          fontSize: '0.85rem',
        }}
      >
        <span>Showing {filteredLogs.length} of {logs.length} records</span>
        <span>Real-time Zero-Trust Audit Stream (PostgreSQL backed)</span>
      </div>
    </div>
  );
}

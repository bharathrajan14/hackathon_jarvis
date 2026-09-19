import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { SecurityDecisionCard } from '../components/SecurityDecisionCard';
import { FolderLock, Eye, Download, FileSpreadsheet, ShieldAlert, CheckCircle, Fingerprint, Lock, ArrowUpRight } from 'lucide-react';

export const EmployeeResources = () => {
  const { user, session, setActiveModal, setPendingControlData, BACKEND_URL } = useAuth();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [decisionData, setDecisionData] = useState(null);
  const [evaluatingAction, setEvaluatingAction] = useState(null);
  const [activeTabResource, setActiveTabResource] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/resources`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ag_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResources(data);
        if (data.length > 0) {
          setActiveTabResource(data[0]);
        }
      }
    } catch (err) {
      console.error('Fetch resources error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Authoritative action click handler calling backend
  const handleActionClick = async (resource, action) => {
    setEvaluatingAction(`${resource.name}-${action}`);
    setExecutionResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/authorization/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ag_token')}`,
        },
        body: JSON.stringify({
          resourceName: resource.name,
          action,
          network: session?.network,
          location: session?.location,
          deviceTrust: session?.deviceTrust,
        }),
      });

      const checkData = await res.json();
      setDecisionData({
        ...checkData,
        resource: resource.name,
        action,
        identity: user?.name,
        role: user?.role,
        device: session?.deviceTrust === 'trusted' ? 'Trusted Hardware' : 'Unknown',
        network: session?.network || 'Corporate',
        location: session?.location || 'Office',
        aiAnomaly: checkData.aiAnomalyScore || 18,
      });

      // Handle based on backend authoritative decision
      if (checkData.decision === 'ALLOW') {
        // Execute resource access
        const execRes = await fetch(`${BACKEND_URL}/api/authorization/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('ag_token')}`,
          },
          body: JSON.stringify({
            resourceName: resource.name,
            action,
            approvalId: checkData.approvedRequestId,
          }),
        });
        const execData = await execRes.json();
        setExecutionResult({
          type: 'SUCCESS',
          message: `Action ${action} executed successfully on ${resource.name}. Access granted.`,
          payload: execData.payload,
        });
      } else if (checkData.decision === 'RESTRICT') {
        // Trigger Passkey Modal
        setPendingControlData({
          resourceName: resource.name,
          action,
          riskScore: checkData.riskScore,
          reason: checkData.reason,
          onSuccess: async () => {
            // Re-execute after passkey verified
            const execRes = await fetch(`${BACKEND_URL}/api/authorization/execute`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('ag_token')}`,
              },
              body: JSON.stringify({
                resourceName: resource.name,
                action,
                passkeyToken: true,
              }),
            });
            const execData = await execRes.json();
            setExecutionResult({
              type: 'SUCCESS',
              message: `Step-up Passkey accepted! Access granted to ${resource.name}.`,
              payload: execData.payload,
            });
          },
        });
        setActiveModal('PASSKEY');
      } else if (checkData.decision === 'MANAGER_APPROVAL' || checkData.decision === 'APPROVAL_AND_PASSKEY') {
        // Submit access request to Manager
        const reqRes = await fetch(`${BACKEND_URL}/api/manager/approvals/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('ag_token')}`,
          },
          body: JSON.stringify({
            resourceName: resource.name,
            action,
            actionDescription: `Requesting ${action} access to ${resource.name} under current project scope`,
            riskScore: checkData.riskScore,
            riskFactors: checkData.factors,
          }),
        });
        const reqData = await reqRes.json();
        setExecutionResult({
          type: 'APPROVAL_SUBMITTED',
          message: `Access Request submitted to Manager Bob! Awaiting dual-control sign-off.`,
          requestId: reqData.id,
        });
      } else if (checkData.decision === 'DENY') {
        setExecutionResult({
          type: 'DENIED',
          message: `Access Denied: ${checkData.reason?.join('; ') || 'Role unauthorized'}`,
        });
      } else if (checkData.decision === 'SESSION_REVOKED') {
        setExecutionResult({
          type: 'REVOKED',
          message: `Session Revoked: Critical security breach detected. Please login again.`,
        });
      }
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setEvaluatingAction(null);
    }
  };

  const getSensitivityBadge = (sens) => {
    switch (sens) {
      case 'CRITICAL':
        return <span className="badge badge-red">CRITICAL 🔴</span>;
      case 'HIGH':
        return <span className="badge badge-purple">HIGH 🟣</span>;
      case 'MEDIUM':
        return <span className="badge badge-orange">MEDIUM 🟠</span>;
      default:
        return <span className="badge badge-green">LOW 🟢</span>;
    }
  };

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Protected Corporate Resources
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Every resource action undergoes real-time RBAC, environmental context, behavioral drift, and risk evaluation.
        </p>
      </div>

      {/* Execution Feedback Banner */}
      {executionResult && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor:
              executionResult.type === 'SUCCESS'
                ? 'rgba(34, 197, 94, 0.12)'
                : executionResult.type === 'APPROVAL_SUBMITTED'
                ? 'rgba(168, 85, 247, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              executionResult.type === 'SUCCESS'
                ? 'var(--color-green)'
                : executionResult.type === 'APPROVAL_SUBMITTED'
                ? 'var(--color-purple)'
                : 'var(--color-red)'
            }`,
            color: '#FFFFFF',
          }}
        >
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{executionResult.message}</div>
            {executionResult.payload && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {executionResult.payload.preview}
              </div>
            )}
          </div>
          <button
            onClick={() => setExecutionResult(null)}
            className="ag-btn ag-btn-outline"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 9 Resources Data Table */}
      <div className="ag-table-container" style={{ marginBottom: '28px' }}>
        <table className="ag-table">
          <thead>
            <tr>
              <th>Resource Name</th>
              <th>Sensitivity</th>
              <th>VIEW Policy</th>
              <th>DOWNLOAD Policy</th>
              <th>EXPORT Policy</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => {
              const isCritical = r.sensitivity === 'CRITICAL';
              const isHigh = r.sensitivity === 'HIGH';
              const isMedium = r.sensitivity === 'MEDIUM';

              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{r.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.description}</div>
                  </td>
                  <td>{getSensitivityBadge(r.sensitivity)}</td>
                  <td>
                    {isCritical ? (
                      <span className="badge badge-orange">PASSKEY 🟠</span>
                    ) : isHigh ? (
                      <span className="badge badge-orange">PASSKEY 🟠</span>
                    ) : (
                      <span className="badge badge-green">ALLOW 🟢</span>
                    )}
                  </td>
                  <td>
                    {isCritical ? (
                      <span className="badge badge-purple">APPROVAL 🟣</span>
                    ) : isHigh ? (
                      <span className="badge badge-purple">APPROVAL 🟣</span>
                    ) : isMedium ? (
                      <span className="badge badge-orange">PASSKEY 🟠</span>
                    ) : (
                      <span className="badge badge-green">ALLOW 🟢</span>
                    )}
                  </td>
                  <td>
                    {isCritical ? (
                      <span className="badge badge-blue">DUAL CONTROL 🔵</span>
                    ) : isHigh ? (
                      <span className="badge badge-purple">APPROVAL 🟣</span>
                    ) : (
                      <span className="badge badge-red">DENY 🔴</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleActionClick(r, 'VIEW')}
                        disabled={evaluatingAction === `${r.name}-VIEW`}
                        className="ag-btn ag-btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        <Eye size={12} />
                        View
                      </button>

                      {r.actions?.includes('DOWNLOAD') && (
                        <button
                          onClick={() => handleActionClick(r, 'DOWNLOAD')}
                          disabled={evaluatingAction === `${r.name}-DOWNLOAD`}
                          className="ag-btn ag-btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Download size={12} />
                          Download
                        </button>
                      )}

                      {r.actions?.includes('EXPORT') && (
                        <button
                          onClick={() => handleActionClick(r, 'EXPORT')}
                          disabled={evaluatingAction === `${r.name}-EXPORT`}
                          className="ag-btn ag-btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <FileSpreadsheet size={12} />
                          Export
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Authoritative Security Decision Card */}
      {decisionData && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px' }}>
            Latest Real-Time Authorization Output
          </h3>
          <SecurityDecisionCard decisionData={decisionData} />
        </div>
      )}
    </div>
  );
};

export default EmployeeResources;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

export default function ApprovalCenter() {
  const { user, sessionId } = useAuth();
  const isApprover = user?.role === 'hr' || user?.role === 'admin';

  // Manager state: Submission form
  const [actionDescription, setActionDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submittedHistory, setSubmittedHistory] = useState([]);

  // HR / Admin state: Pending approvals list
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [approvalsError, setApprovalsError] = useState('');
  const [decisionFeedback, setDecisionFeedback] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (isApprover) {
      fetchPendingApprovals();
    }
  }, [isApprover]);

  const fetchPendingApprovals = async () => {
    setLoadingApprovals(true);
    setApprovalsError('');
    try {
      const data = await api.getPendingApprovals();
      setPendingApprovals(data || []);
    } catch (err) {
      setApprovalsError(err.message || 'Failed to load pending approvals');
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    if (!actionDescription.trim()) return;

    setSubmitting(true);
    setSubmitSuccess('');
    setSubmitError('');

    try {
      const activeSession = sessionId || localStorage.getItem('sessionId');
      const res = await api.submitSensitiveAction(activeSession, actionDescription.trim());
      setSubmitSuccess(
        `Action submitted successfully! Request ID: ${res.approvalRequest?.id || res.id}. Status: PENDING review by HR or Admin.`
      );
      setSubmittedHistory((prev) => [
        {
          id: res.approvalRequest?.id || res.id || `req_${Date.now()}`,
          description: actionDescription.trim(),
          status: 'PENDING',
          createdAt: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      setActionDescription('');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit sensitive action');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (id, decision) => {
    setProcessingId(id);
    setDecisionFeedback('');
    try {
      await api.decideApproval(id, decision);
      setDecisionFeedback(`Request ${decision === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      // Refresh pending approvals list
      await fetchPendingApprovals();
    } catch (err) {
      setApprovalsError(err.message || `Failed to ${decision.toLowerCase()} request`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '2rem',
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
            <span style={{ fontSize: '1.5rem' }}>⚖️</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Dual-Key Approval Center
            </h1>
            <span className="badge badge-role" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Current Role: {user?.role}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            Human-in-the-loop authorization gates for high-impact corporate operations & zero-trust step-ups.
          </p>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 14px',
          fontSize: '0.8rem',
          color: '#475569',
        }}>
          {isApprover ? (
            <span>🛡️ <strong>Review Mode:</strong> You have HR/Admin authority to resolve pending requests.</span>
          ) : (
            <span>✍️ <strong>Requestor Mode:</strong> Submit sensitive operations for dual-key authorization.</span>
          )}
        </div>
      </div>

      {/* Conditional Content based on Role */}
      {isApprover ? (
        /* ----------------- HR / ADMIN VIEW: PENDING APPROVALS QUEUE ----------------- */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Pending Authorization Queue
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Review, grant, or deny privileged action requests submitted by team managers.
              </p>
            </div>
            <button
              onClick={fetchPendingApprovals}
              disabled={loadingApprovals}
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              {loadingApprovals ? 'Refreshing...' : '🔄 Refresh Queue'}
            </button>
          </div>

          {decisionFeedback && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}>
              ✓ {decisionFeedback}
            </div>
          )}

          {approvalsError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
            }}>
              {approvalsError}
            </div>
          )}

          {loadingApprovals ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              Loading pending requests...
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '3rem 2rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
                All Caught Up!
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '400px', margin: '0 auto' }}>
                There are no pending sensitive authorization requests awaiting HR/Admin review at this time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                  }}
                >
                  <div style={{ flex: '1 1 500px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span className="badge badge-medium" style={{ fontSize: '0.75rem' }}>
                        PENDING APPROVAL
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Submitted {new Date(req.createdAt || req.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                      {req.actionDescription || req.action_description}
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span><strong>Requestor:</strong> {req.requestorName || req.requestor_name || 'Team Member'}</span>
                      <span><strong>Email:</strong> {req.requestorEmail || req.requestor_email || 'N/A'}</span>
                      <span style={{ fontFamily: 'monospace', color: '#64748b' }}>
                        ID: {req.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleDecision(req.id, 'APPROVED')}
                      className="btn-primary"
                      style={{
                        backgroundColor: '#16a34a',
                        fontSize: '0.85rem',
                        padding: '9px 18px',
                        fontWeight: 700,
                        opacity: processingId === req.id ? 0.6 : 1,
                      }}
                    >
                      {processingId === req.id ? 'Processing...' : '✓ Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleDecision(req.id, 'REJECTED')}
                      className="btn-secondary"
                      style={{
                        color: '#dc2626',
                        borderColor: '#fca5a5',
                        backgroundColor: '#fef2f2',
                        fontSize: '0.85rem',
                        padding: '9px 18px',
                        fontWeight: 700,
                        opacity: processingId === req.id ? 0.6 : 1,
                      }}
                    >
                      {processingId === req.id ? 'Processing...' : '✕ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ----------------- MANAGER / EMPLOYEE VIEW: SUBMISSION FORM ----------------- */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Left: Submission Form */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
              Submit Sensitive Operation
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Operations exceeding standard authorization parameters require dual-key verification from HR or an Admin before activation.
            </p>

            {submitSuccess && (
              <div style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                lineHeight: 1.45,
              }}>
                ✓ {submitSuccess}
              </div>
            )}

            {submitError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
              }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleManagerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Action Description & Justification *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Export Q4 Payroll & Bonus reports for external compliance audit..."
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Sample Presets for Testing */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Quick Fill Presets:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActionDescription('Export Q4 Financial & Executive Bonus Records')}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    Payroll Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDescription('Grant provisional database write privileges on Production Master')}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    DB Write Override
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !actionDescription.trim()}
                className="btn-primary"
                style={{
                  padding: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  opacity: submitting || !actionDescription.trim() ? 0.6 : 1,
                }}
              >
                {submitting ? 'Submitting Request...' : 'Submit for Dual Approval →'}
              </button>
            </form>
          </div>

          {/* Right: Submission Status Tracker */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
              Your Session Requests
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Status of requests initiated during this active session.
            </p>

            {submittedHistory.length === 0 ? (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '2rem',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.85rem',
              }}>
                No sensitive action requests submitted in this browser session yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {submittedHistory.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>
                        ● {item.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {item.createdAt}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

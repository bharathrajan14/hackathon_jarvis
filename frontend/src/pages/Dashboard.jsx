import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Access Request Modal state
  const [selectedResource, setSelectedResource] = useState(null);
  const [network, setNetwork] = useState('office');
  const [location, setLocation] = useState('office');
  const [devicePreset, setDevicePreset] = useState('current');
  const [customFingerprint, setCustomFingerprint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getResources();
      setResources(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load authorized resources');
    } finally {
      setLoading(false);
    }
  };

  const openRequestModal = (resource) => {
    setSelectedResource(resource);
    setSubmitError('');
    // Defaults: if testing manager + payroll scenario, provide convenient presets or defaults
    if (resource.name === 'Payroll.xlsx') {
      setNetwork('public');
      setLocation('far');
      setDevicePreset('unknown_mobile');
    } else {
      setNetwork('office');
      setLocation('office');
      setDevicePreset('current');
    }
  };

  const closeModal = () => {
    setSelectedResource(null);
    setSubmitError('');
  };

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResource) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      // 1. Resolve fingerprint based on devicePreset
      let fingerprint = 'fp_primary_workstation';
      if (devicePreset === 'unknown_mobile') {
        fingerprint = `fp_unregistered_mobile_${Date.now()}`;
      } else if (devicePreset === 'custom' && customFingerprint.trim()) {
        fingerprint = customFingerprint.trim();
      }

      // 2. Register / fetch device ID
      const devRes = await api.registerDevice(fingerprint);
      const deviceId = devRes.device.id;

      // 3. Submit access request
      const decisionData = await api.requestAccess(
        selectedResource.id,
        network,
        location,
        deviceId
      );

      // 4. Navigate to decision screen with complete response and resource context
      navigate('/decision', {
        state: {
          decision: decisionData,
          resource: selectedResource,
          context: {
            network,
            location,
            fingerprint,
            deviceId,
          },
        },
      });
    } catch (err) {
      setSubmitError(err.message || 'Access evaluation request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getSensitivityBadge = (sensitivity) => {
    switch (sensitivity) {
      case 'low':
        return <span className="badge badge-low">Low Sensitivity</span>;
      case 'medium':
        return <span className="badge badge-medium">Medium Sensitivity</span>;
      case 'high':
        return <span className="badge badge-high">High Sensitivity</span>;
      default:
        return <span className="badge">{sensitivity}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Page Title & RBAC Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
            Authorized Resources
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Resources accessible to your current role hierarchy (<strong style={{ color: '#2563eb' }}>{user?.role}</strong>). Select a resource to initiate zero-trust evaluation.
          </p>
        </div>

        <button onClick={fetchResources} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>↻</span> Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{
          padding: '4rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          color: '#64748b',
        }}>
          Loading authorized resources...
        </div>
      ) : resources.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          color: '#64748b',
        }}>
          No resources found for your role entitlement.
        </div>
      ) : (
        /* Resources Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}>
          {resources.map((resource) => (
            <div
              key={resource.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}>
                    📄
                  </div>
                  {getSensitivityBadge(resource.sensitivity)}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {resource.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                  ID: {resource.id}
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => openRequestModal(resource)}
                  className="btn-primary"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  Request Access →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Access Request Context Modal */}
      {selectedResource && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
                  Context Capture
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Requesting access to <strong>{selectedResource.name}</strong> ({selectedResource.sensitivity} sensitivity)
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleAccessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Network Environment */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Network Environment
                </label>
                <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                  <option value="office">Corporate Office (0 pts)</option>
                  <option value="public">Public Wi-Fi / Remote (+15 pts)</option>
                  <option value="unknown">Unknown / Untrusted (+25 pts)</option>
                </select>
              </div>

              {/* Geographic Location */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Geographic Location
                </label>
                <select value={location} onChange={(e) => setLocation(e.target.value)}>
                  <option value="office">Headquarters Office (0 pts)</option>
                  <option value="near">Domestic Remote / Near (+10 pts)</option>
                  <option value="far">International / Far (+20 pts)</option>
                </select>
              </div>

              {/* Device Profile */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Device Profile
                </label>
                <select value={devicePreset} onChange={(e) => setDevicePreset(e.target.value)}>
                  <option value="current">Current Workstation (fp_primary_workstation)</option>
                  <option value="unknown_mobile">New Unknown Device (Dynamic Fingerprint: unknown trust)</option>
                  <option value="custom">Custom Fingerprint Input</option>
                </select>
              </div>

              {devicePreset === 'custom' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Fingerprint String
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. fp_laptop_custom_1"
                    value={customFingerprint}
                    onChange={(e) => setCustomFingerprint(e.target.value)}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ flex: 2, opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Evaluating Context...' : 'Evaluate & Submit Access Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

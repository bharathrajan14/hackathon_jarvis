import React from 'react';
import { useAuth } from '../context/AuthContext';
import { GlobalSecurityBar } from '../components/GlobalSecurityBar';
import { Settings as SettingsIcon, Fingerprint, Shield, Key, Laptop, Sliders } from 'lucide-react';

export const Settings = () => {
  const { user, session } = useAuth();

  return (
    <div>
      <GlobalSecurityBar />

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>
          Security & Passkey Settings
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          FIDO2 hardware authenticators, continuous authorization sensitivity thresholds, and audit preferences.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Passkey Management */}
        <div className="ag-card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Fingerprint size={20} color="var(--color-orange)" />
            <span style={{ fontWeight: '700', fontSize: '1rem', color: '#FFFFFF' }}>Registered Hardware Passkeys</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#FFFFFF' }}>
                  {user?.name || 'User'} Primary Laptop (Touch ID / Windows Hello)
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Credential ID: cred_{user?.name?.toLowerCase() || 'alice'}_fido2_key • FIDO2 Certified
                </div>
              </div>
              <span className="badge badge-green">ACTIVE 🟢</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#FFFFFF' }}>
                  YubiKey 5 NFC Hardware Token
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Backup Security Key • Enrolled 2026
                </div>
              </div>
              <span className="badge badge-dark">BACKUP</span>
            </div>
          </div>
        </div>

        {/* Risk Sensitivity Thresholds */}
        <div className="ag-card-elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sliders size={20} color="var(--color-blue)" />
            <span style={{ fontWeight: '700', fontSize: '1rem', color: '#FFFFFF' }}>Adaptive Risk Sensitivity</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Low Risk Gate:</span>
              <strong style={{ color: 'var(--color-green)' }}>0 - 30 (ALLOW)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Medium Risk Gate:</span>
              <strong style={{ color: 'var(--color-orange)' }}>31 - 60 (RESTRICT / PASSKEY)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>High Risk Gate:</span>
              <strong style={{ color: 'var(--color-purple)' }}>61 - 80 (MANAGER APPROVAL)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Critical Risk Killswitch:</span>
              <strong style={{ color: 'var(--color-red)' }}>81 - 100 (SESSION REVOCATION)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

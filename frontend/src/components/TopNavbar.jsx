import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Laptop, ChevronDown, User, LogOut, ShieldCheck, X } from 'lucide-react';

export const TopNavbar = ({ title = 'Dashboard', subtitle = 'Continuous security evaluation in effect' }) => {
  const { user, session, switchDemoUser, logout, notifications, removeNotification } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const riskScore = session?.currentRisk ?? 18;
  const riskLevel = session?.riskLevel ?? (riskScore >= 81 ? 'CRITICAL' : riskScore >= 61 ? 'HIGH' : riskScore >= 31 ? 'MEDIUM' : 'LOW');

  const getRiskBadgeClass = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'badge-red';
      case 'HIGH':
        return 'badge-purple';
      case 'MEDIUM':
        return 'badge-orange';
      default:
        return 'badge-green';
    }
  };

  const getStatusDotClass = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'status-dot-red';
      case 'HIGH':
        return 'status-dot-purple';
      case 'MEDIUM':
        return 'status-dot-orange';
      default:
        return 'status-dot-green';
    }
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      {/* Left: Page Title & Subtitle */}
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#FFFFFF', lineHeight: 1.2 }}>{title}</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{subtitle}</p>
      </div>

      {/* Right: Security Telemetry & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Demo Switcher Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-primary)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ padding: '0 8px', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '600' }}>
            DEMO:
          </span>
          <button
            onClick={() => {
              switchDemoUser('Alice');
              navigate('/employee/dashboard');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: user?.name === 'Alice' ? '700' : '500',
              backgroundColor: user?.name === 'Alice' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              color: user?.name === 'Alice' ? 'var(--color-green)' : 'var(--text-secondary)',
            }}
          >
            Alice
          </button>
          <button
            onClick={() => {
              switchDemoUser('Bob');
              navigate('/manager/dashboard');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: user?.name === 'Bob' ? '700' : '500',
              backgroundColor: user?.name === 'Bob' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: user?.name === 'Bob' ? 'var(--color-blue)' : 'var(--text-secondary)',
            }}
          >
            Bob
          </button>
          <button
            onClick={() => {
              switchDemoUser('David');
              navigate('/admin/dashboard');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: user?.name === 'David' ? '700' : '500',
              backgroundColor: user?.name === 'David' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              color: user?.name === 'David' ? 'var(--color-purple)' : 'var(--text-secondary)',
            }}
          >
            David
          </button>
        </div>

        {/* Live Risk Badge */}
        <div
          className={`badge ${getRiskBadgeClass()}`}
          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span className={`status-dot ${getStatusDotClass()}`} />
          <span>
            Risk <strong>{riskScore}</strong> / 100
          </span>
          <span style={{ opacity: 0.8 }}>({riskLevel})</span>
        </div>

        {/* Device Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            padding: '6px 10px',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Laptop size={14} color="var(--color-green)" />
          <span>Device</span>
          <span style={{ color: 'var(--color-green)', fontWeight: '600' }}>Trusted 🟢</span>
        </div>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Bell size={16} />
            {notifications.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-red)',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '360px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Security Notifications</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {notifications.length} Recent
                </span>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No unread notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(38, 50, 71, 0.4)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.8rem', color: n.severity === 'CRITICAL' ? 'var(--color-red)' : n.severity === 'HIGH' ? 'var(--color-orange)' : '#FFFFFF' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {n.timestamp}
                        </div>
                      </div>
                      <button
                        onClick={() => removeNotification(n.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              color: '#FFFFFF',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.75rem',
              }}
            >
              {user?.name?.[0] || 'U'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user?.role}</div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '200px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px 0' }}>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/employee/session');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ShieldCheck size={14} /> My Session
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <User size={14} /> Settings
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-red)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logoutUser, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const isSocAuthorized = user?.role === 'admin' || user?.role === 'soc' || user?.role === 'hr';

  const navItems = [
    { label: 'Resources & Access', path: '/dashboard' },
    { label: 'Approval Center', path: '/approvals' },
    { label: 'Audit Logs', path: '/audit' },
  ];

  if (isSocAuthorized) {
    navItems.push({ label: 'SOC Dashboard', path: '/soc', isHighlight: true });
  }

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 1.5rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: '0 2px 5px rgba(37, 99, 235, 0.35)',
            }}>
              J
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>Proto</span>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#2563eb' }}> Jarvis</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: '0.4rem' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2563eb' : item.isHighlight ? '#0f766e' : '#64748b',
                    backgroundColor: isActive ? '#eff6ff' : item.isHighlight ? '#f0fdfa' : 'transparent',
                    border: item.isHighlight && !isActive ? '1px solid #ccfbf1' : '1px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
              <span className="badge badge-role" style={{ fontSize: '0.7rem', padding: '2px 8px', textTransform: 'uppercase' }}>
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

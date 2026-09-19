import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  FolderLock,
  Globe,
  GitPullRequest,
  Clock,
  Activity,
  Zap,
  Settings,
  Users,
  Eye,
  Radio,
  FileText,
  Sliders,
  Laptop,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, session } = useAuth();
  const role = String(user?.role || 'EMPLOYEE').toUpperCase();

  const getRoleBadge = () => {
    switch (role) {
      case 'IT_ADMINISTRATOR':
        return <span className="badge badge-purple">IT ADMIN</span>;
      case 'MANAGER':
        return <span className="badge badge-blue">MANAGER</span>;
      default:
        return <span className="badge badge-green">EMPLOYEE</span>;
    }
  };

  return (
    <aside
      style={{
        width: '250px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-blue)',
          }}
        >
          <Shield size={20} />
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '1rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            AdaptiveGuard
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Continuous Security</div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {/* EMPLOYEE MENU */}
        {role === 'EMPLOYEE' && (
          <>
            <NavItem to="/employee/dashboard" icon={<LayoutDashboard size={17} />} label="Dashboard" />

            <SectionHeader label="ACCESS" />
            <NavItem to="/employee/resources" icon={<FolderLock size={17} />} label="My Resources" />
            <NavItem to="/employee/web-access" icon={<Globe size={17} />} label="Web Access" />
            <NavItem to="/employee/requests" icon={<GitPullRequest size={17} />} label="My Requests" />

            <SectionHeader label="SECURITY" />
            <NavItem to="/employee/session" icon={<Clock size={17} />} label="My Session" />
            <NavItem to="/employee/activity" icon={<Activity size={17} />} label="My Activity" />
          </>
        )}

        {/* MANAGER MENU */}
        {role === 'MANAGER' && (
          <>
            <NavItem to="/manager/dashboard" icon={<LayoutDashboard size={17} />} label="Dashboard" />

            <SectionHeader label="TEAM" />
            <NavItem to="/manager/team" icon={<Users size={17} />} label="Team Members" />
            <NavItem to="/manager/resources" icon={<FolderLock size={17} />} label="Resources" />
            <NavItem to="/manager/approvals" icon={<GitPullRequest size={17} />} label="Approval Requests" />

            <SectionHeader label="SECURITY" />
            <NavItem to="/manager/web-access" icon={<Globe size={17} />} label="Web Access" />
            <NavItem to="/manager/sessions" icon={<Eye size={17} />} label="Session Intelligence" />
            <NavItem to="/manager/security" icon={<Radio size={17} />} label="Security Monitor" />
            <NavItem to="/manager/audit" icon={<FileText size={17} />} label="Audit Logs" />
          </>
        )}

        {/* IT ADMINISTRATOR MENU */}
        {role === 'IT_ADMINISTRATOR' && (
          <>
            <NavItem to="/admin/dashboard" icon={<LayoutDashboard size={17} />} label="Security Dashboard" />

            <SectionHeader label="MANAGEMENT" />
            <NavItem to="/admin/users" icon={<Users size={17} />} label="Users" />
            <NavItem to="/admin/policies" icon={<Sliders size={17} />} label="Roles & Policies" />
            <NavItem to="/admin/resources" icon={<FolderLock size={17} />} label="Protected Resources" />
            <NavItem to="/admin/web-policies" icon={<Globe size={17} />} label="Web Policies" />
            <NavItem to="/admin/devices" icon={<Laptop size={17} />} label="Devices" />

            <SectionHeader label="SECURITY" />
            <NavItem to="/admin/security-monitor" icon={<Radio size={17} />} label="Security Monitor" />
            <NavItem to="/admin/sessions" icon={<Eye size={17} />} label="Session Intelligence" />
            <NavItem to="/admin/audit" icon={<FileText size={17} />} label="Audit Logs" />
          </>
        )}

        {/* DEMO SHOWCASE (Shared across roles) */}
        <SectionHeader label="DEMO" />
        <NavItem to="/simulation" icon={<Zap size={17} />} label="Attack Simulation" highlight />

        {/* SYSTEM */}
        <SectionHeader label="SYSTEM" />
        <NavItem to="/settings" icon={<Settings size={17} />} label="Settings" />
      </div>

      {/* User Status Footer */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.8rem',
              color: '#FFFFFF',
            }}
          >
            {user?.name?.[0] || 'A'}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#FFFFFF' }}>{user?.name || 'User'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--color-green)' }}>
              <span className="status-dot status-dot-green" />
              <span>{session.status === 'ACTIVE' ? 'Secure' : session.status}</span>
            </div>
          </div>
        </div>
        {getRoleBadge()}
      </div>
    </aside>
  );
};

const SectionHeader = ({ label }) => (
  <div
    style={{
      fontSize: '0.65rem',
      fontWeight: '700',
      letterSpacing: '0.08em',
      color: 'var(--text-muted)',
      padding: '14px 10px 6px 10px',
      fontFamily: 'var(--font-mono)',
    }}
  >
    {label}
  </div>
);

const NavItem = ({ to, icon, label, highlight }) => (
  <NavLink
    to={to}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 12px',
      borderRadius: '6px',
      fontSize: '0.85rem',
      fontWeight: isActive ? '600' : '500',
      color: isActive ? '#FFFFFF' : highlight ? 'var(--color-orange)' : 'var(--text-secondary)',
      backgroundColor: isActive
        ? 'rgba(59, 130, 246, 0.15)'
        : highlight
        ? 'rgba(245, 158, 11, 0.08)'
        : 'transparent',
      borderLeft: isActive ? '3px solid var(--color-blue)' : '3px solid transparent',
      textDecoration: 'none',
      marginBottom: '2px',
      transition: 'all 0.15s ease',
    })}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

export default Sidebar;

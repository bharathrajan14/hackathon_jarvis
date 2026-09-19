import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';

// Pages
import { Login } from './pages/Login';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { EmployeeResources } from './pages/EmployeeResources';
import { WebAccess } from './pages/WebAccess';
import { EmployeeRequests } from './pages/EmployeeRequests';
import { EmployeeSession } from './pages/EmployeeSession';
import { EmployeeActivity } from './pages/EmployeeActivity';

import { ManagerDashboard } from './pages/ManagerDashboard';
import { ManagerTeam } from './pages/ManagerTeam';
import { ManagerApprovals } from './pages/ManagerApprovals';
import { ManagerSecurity } from './pages/ManagerSecurity';
import { ManagerSessions } from './pages/ManagerSessions';

import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminPolicies } from './pages/AdminPolicies';
import { AdminResources } from './pages/AdminResources';
import { AdminWebPolicies } from './pages/AdminWebPolicies';
import { AdminDevices } from './pages/AdminDevices';
import { AdminSecurityMonitor } from './pages/AdminSecurityMonitor';
import { AdminAudit } from './pages/AdminAudit';

import { AttackSimulation } from './pages/AttackSimulation';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Employee Protected Shell */}
      <Route element={<AppShell title="AdaptiveGuard Employee Portal" subtitle="Continuous zero trust evaluation" />}>
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/resources" element={<EmployeeResources />} />
        <Route path="/employee/web-access" element={<WebAccess />} />
        <Route path="/employee/requests" element={<EmployeeRequests />} />
        <Route path="/employee/session" element={<EmployeeSession />} />
        <Route path="/employee/activity" element={<EmployeeActivity />} />
      </Route>

      {/* Manager Protected Shell */}
      <Route element={<AppShell title="Manager Risk & Approval Center" subtitle="Dual control oversight & team telemetry" />}>
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/team" element={<ManagerTeam />} />
        <Route path="/manager/resources" element={<EmployeeResources />} />
        <Route path="/manager/approvals" element={<ManagerApprovals />} />
        <Route path="/manager/web-access" element={<WebAccess />} />
        <Route path="/manager/sessions" element={<ManagerSessions />} />
        <Route path="/manager/security" element={<ManagerSecurity />} />
        <Route path="/manager/audit" element={<AdminAudit />} />
      </Route>

      {/* IT Admin Protected Shell */}
      <Route element={<AppShell title="Security Operations Center (SOC)" subtitle="System-wide governance & continuous monitoring" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/policies" element={<AdminPolicies />} />
        <Route path="/admin/resources" element={<AdminResources />} />
        <Route path="/admin/web-policies" element={<AdminWebPolicies />} />
        <Route path="/admin/devices" element={<AdminDevices />} />
        <Route path="/admin/security-monitor" element={<AdminSecurityMonitor />} />
        <Route path="/admin/sessions" element={<ManagerSessions />} />
        <Route path="/admin/audit" element={<AdminAudit />} />
      </Route>

      {/* Shared Showcase Routes */}
      <Route element={<AppShell title="AdaptiveGuard Attack Simulation" subtitle="Simulate threat events & observe dynamic policy shifts" />}>
        <Route path="/simulation" element={<AttackSimulation />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback Root */}
      <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
    </Routes>
  );
}

export default App;

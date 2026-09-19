import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { PasskeyModal } from './PasskeyModal';
import { ApprovalModal } from './ApprovalModal';
import { useAuth } from '../context/AuthContext';

export const AppShell = ({ title, subtitle, showSecurityBar = false }) => {
  const { activeModal, setActiveModal, pendingControlData } = useAuth();

  return (
    <div className="app-container">
      {/* 250px Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-content-area">
        {/* 64px Fixed Top Navbar */}
        <TopNavbar title={title} subtitle={subtitle} />

        {/* Dynamic Page Body */}
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {/* Global Modals triggered from any page */}
      <PasskeyModal
        isOpen={activeModal === 'PASSKEY'}
        onClose={() => setActiveModal(null)}
        resourceName={pendingControlData?.resourceName}
        action={pendingControlData?.action}
        riskScore={pendingControlData?.riskScore}
        reason={pendingControlData?.reason}
        onSuccess={pendingControlData?.onSuccess}
      />

      <ApprovalModal
        isOpen={activeModal === 'APPROVAL'}
        onClose={() => setActiveModal(null)}
        request={pendingControlData?.request}
        onDecision={pendingControlData?.onDecision}
      />
    </div>
  );
};

export default AppShell;

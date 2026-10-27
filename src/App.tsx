/**
 * RealCore Auto Call CRM Bất Động Sản
 * Main Application Orchestrator
 */

import React, { useState } from 'react';
import { NavTab, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { LeadsView } from './views/LeadsView';
import { CampaignsView } from './views/CampaignsView';
import { TelephonyView } from './views/TelephonyView';
import { TasksView } from './views/TasksView';
import { CallLogsView } from './views/CallLogsView';
import { UsersView } from './views/UsersView';
import { ReportsView } from './views/ReportsView';
import { SheetsSyncView } from './views/SheetsSyncView';
import { SettingsView } from './views/SettingsView';
import { CallModal } from './components/CallModal';
import { LeadDetailModal } from './components/LeadDetailModal';
import { LeadFormModal } from './components/LeadFormModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { ConflictResolutionModal } from './components/ConflictResolutionModal';
import { BatchAssignModal } from './components/BatchAssignModal';
import { Lead, SyncConflict, User } from './types';
import { db } from './services/db';
import { AuthView } from './views/AuthView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [allUsers, setAllUsers] = useState<User[]>(() => db.getUsers());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedId = localStorage.getItem('realcore_auth_user_id');
        if (storedId) {
          const user = db.getUserById(storedId);
          if (user && user.isActive) return user;
        }
      }
    } catch (e) {
      // fallback
    }
    return null;
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Search query in Header, shared with LeadsView
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [activeCallLead, setActiveCallLead] = useState<Lead | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetailLead, setActiveDetailLead] = useState<Lead | null>(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [activeEditLead, setActiveEditLead] = useState<Lead | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);

  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null);

  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [selectedLeadIdsForBatch, setSelectedLeadIdsForBatch] = useState<string[]>([]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setAllUsers(db.getUsers());
    if (currentUser) {
      const updatedUser = db.getUserById(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('realcore_auth_user_id', user.id);
      }
    } catch (e) {}
    setRefreshKey((prev) => prev + 1);
  };

  const handleLogout = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('realcore_auth_user_id');
      }
    } catch (e) {}
    setCurrentUser(null);
  };

  const handleSwitchUser = (userId: string) => {
    const target = db.getUserById(userId);
    if (target) {
      setCurrentUser(target);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('realcore_auth_user_id', target.id);
        }
      } catch (e) {}
      // If switching to Agent and currently on an admin-only tab, redirect to dashboard
      if (target.role === 'AGENT' && currentTab === 'users') {
        setCurrentTab('dashboard');
      }
      handleRefresh();
    }
  };

  // If not logged in, display the Register / Login view
  if (!currentUser) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  // Badges counts (currentUser is authenticated)
  const now = new Date().toISOString();
  const dueTasksCount = db
    .getTasks(currentUser)
    .filter((t) => !t.completedAt && t.dueAt <= now).length;
  const conflictsCount = db
    .getSyncConflicts()
    .filter((c) => !c.resolution).length;

  const handleOpenCallModal = (lead?: Lead) => {
    setActiveCallLead(lead || null);
    setCallModalOpen(true);
  };

  const handleViewLead = (lead: Lead) => {
    setActiveDetailLead(lead);
    setDetailModalOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setActiveEditLead(lead);
    setFormModalOpen(true);
  };

  const handleCreateLead = () => {
    setActiveEditLead(null);
    setFormModalOpen(true);
  };

  const handleOpenConflict = (conflict: SyncConflict) => {
    setActiveConflict(conflict);
    setConflictModalOpen(true);
  };

  const handleOpenBatchAssign = (ids: string[]) => {
    setSelectedLeadIdsForBatch(ids);
    setBatchAssignOpen(true);
  };

  return (
    <div key={refreshKey} className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        dueTasksCount={dueTasksCount}
        conflictsCount={conflictsCount}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={handleSwitchUser}
          onOpenQuickCall={() => handleOpenCallModal()}
          onSelectTab={setCurrentTab}
          dueTasksCount={dueTasksCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogout={handleLogout}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              onSelectTab={setCurrentTab}
              onOpenCallModal={handleOpenCallModal}
              onOpenImportModal={() => setImportModalOpen(true)}
              onViewLead={handleViewLead}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'leads' && (
            <LeadsView
              currentUser={currentUser}
              onViewLead={handleViewLead}
              onEditLead={handleEditLead}
              onCallLead={handleOpenCallModal}
              onOpenCreateModal={handleCreateLead}
              onOpenBatchAssign={handleOpenBatchAssign}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'campaigns' && (
            <CampaignsView
              currentUser={currentUser}
              onFilterByCampaign={(cId) => {
                setCurrentTab('leads');
              }}
              onOpenImportModal={() => setImportModalOpen(true)}
            />
          )}

          {currentTab === 'telephony' && (
            <TelephonyView
              currentUser={currentUser}
              onOpenCallModal={handleOpenCallModal}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              currentUser={currentUser}
              onOpenCallModal={handleOpenCallModal}
              onViewLead={handleViewLead}
            />
          )}

          {currentTab === 'call_logs' && (
            <CallLogsView currentUser={currentUser} />
          )}

          {currentTab === 'users' && (
            <UsersView currentUser={currentUser} />
          )}

          {currentTab === 'reports' && (
            <ReportsView currentUser={currentUser} />
          )}

          {currentTab === 'sheets_sync' && (
            <SheetsSyncView
              currentUser={currentUser}
              onOpenConflictModal={handleOpenConflict}
              onRefresh={handleRefresh}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onRefresh={handleRefresh}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        lead={activeCallLead}
        currentUser={currentUser}
        onCallLogged={handleRefresh}
      />

      <LeadDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        lead={activeDetailLead}
        currentUser={currentUser}
        onCallLead={(lead) => {
          setDetailModalOpen(false);
          handleOpenCallModal(lead);
        }}
        onEditLead={(lead) => {
          setDetailModalOpen(false);
          handleEditLead(lead);
        }}
        onRefresh={handleRefresh}
      />

      <LeadFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        leadToEdit={activeEditLead}
        currentUser={currentUser}
        onSuccess={handleRefresh}
      />

      <ImportExcelModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        currentUser={currentUser}
        onImportComplete={handleRefresh}
      />

      <ConflictResolutionModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        conflict={activeConflict}
        currentUser={currentUser}
        onResolved={handleRefresh}
      />

      <BatchAssignModal
        isOpen={batchAssignOpen}
        onClose={() => setBatchAssignOpen(false)}
        selectedLeadIds={selectedLeadIdsForBatch}
        currentUser={currentUser}
        onAssigned={handleRefresh}
      />
    </div>
  );
}

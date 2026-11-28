/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudentDiscoveryApp } from './components/StudentDiscoveryApp';
import { AdminPortalView } from './components/AdminPortalView';
import { RoleLoginModal } from './components/RoleLoginModal';
import { ecosystemStore, EcosystemUser } from './data/ecosystemStore';

export default function App() {
  const [currentUser, setCurrentUser] = useState<EcosystemUser | null>(() =>
    ecosystemStore.getCurrentUser()
  );
  const [appMode, setAppMode] = useState<'student-discovery' | 'admin-portal'>('student-discovery');
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    const unsub = ecosystemStore.subscribe(() => {
      const user = ecosystemStore.getCurrentUser();
      setCurrentUser(user);
      if (user?.roleLayer !== 'ADMIN' && appMode === 'admin-portal') {
        setAppMode('student-discovery');
      }
    });
    return () => unsub();
  }, [appMode]);

  const handleOpenAdminPortal = () => {
    if (currentUser?.roleLayer === 'ADMIN') {
      setAppMode('admin-portal');
    } else {
      setShowRoleModal(true);
    }
  };

  const handleExitAdminPortal = () => {
    setAppMode('student-discovery');
  };

  if (appMode === 'admin-portal' && currentUser?.roleLayer === 'ADMIN') {
    return (
      <>
        <AdminPortalView
          currentAdmin={currentUser}
          onExitToStudentView={handleExitAdminPortal}
        />
        <RoleLoginModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          currentUser={currentUser}
          onSelectUser={(u) => {
            setCurrentUser(u);
            if (u?.roleLayer === 'ADMIN') {
              setAppMode('admin-portal');
            } else {
              setAppMode('student-discovery');
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <StudentDiscoveryApp
        currentUser={currentUser}
        onOpenRoleModal={() => setShowRoleModal(true)}
        onOpenAdminPortal={handleOpenAdminPortal}
      />
      <RoleLoginModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        currentUser={currentUser}
        onSelectUser={(u) => {
          setCurrentUser(u);
          if (u?.roleLayer === 'ADMIN') {
            setAppMode('admin-portal');
          }
        }}
      />
    </>
  );
}

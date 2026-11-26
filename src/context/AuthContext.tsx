import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PortalMode, SessionContext, User } from '../types';

export interface AiDraftHandoff {
  title: string;
  caption: string;
  hashtags: string[];
  callToAction?: string;
  relatedEvent?: string;
  eventDate?: string;
  platformAdaptations?: Record<string, string>;
  aiAssisted: boolean;
}

interface AuthContextValue {
  session: SessionContext | null;
  loading: boolean;
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  activeClubId: string | null;
  setActiveClubId: (clubId: string) => void;
  loginAs: (userIdOrEmail: { userId?: string; email?: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  apiFetch: <T>(url: string, options?: RequestInit) => Promise<T>;
  draftHandoff: AiDraftHandoff | null;
  setDraftHandoff: (draft: AiDraftHandoff | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'cuny_sps_hub_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [portalMode, setPortalMode] = useState<PortalMode>('CLUB');
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [draftHandoff, setDraftHandoff] = useState<AiDraftHandoff | null>(null);

  const apiFetch = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      const storedUserId = session?.user.userId ?? localStorage.getItem(STORAGE_KEY) ?? '';
      const headers = new Headers(options.headers);
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (storedUserId) {
        headers.set('x-cuny-user-id', storedUserId);
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [session?.user.userId]
  );

  const applySession = useCallback((nextSession: SessionContext) => {
    setSession(nextSession);
    localStorage.setItem(STORAGE_KEY, nextSession.user.userId);
    if (nextSession.effectiveAdminRole) {
      setPortalMode('ADMIN');
    } else {
      setPortalMode('CLUB');
    }
    if (nextSession.memberships.length > 0) {
      setActiveClubId((prev) => {
        const stillValid = nextSession.memberships.some((m) => m.clubId === prev);
        return stillValid ? prev : nextSession.memberships[0].clubId;
      });
    } else if (nextSession.effectiveAdminRole) {
      setActiveClubId('club-ai');
    } else {
      setActiveClubId(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/session', {
        headers: { 'x-cuny-user-id': savedId },
      });
      if (!res.ok) {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      } else {
        const data = (await res.json()) as SessionContext;
        applySession(data);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const loginAs = useCallback(
    async (payload: { userId?: string; email?: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Institutional authentication failed.');
      }
      applySession(data as SessionContext);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setActiveClubId(null);
    setDraftHandoff(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        portalMode,
        setPortalMode,
        activeClubId,
        setActiveClubId,
        loginAs,
        logout,
        refreshSession,
        apiFetch,
        draftHandoff,
        setDraftHandoff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function formatRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'SL_SUPER_ADMIN':
      return 'Student Life Super Admin';
    case 'SL_ADMIN':
      return 'Student Life Admin (Scoped)';
    case 'CLUB_LEAD':
      return 'Club President / Co-Chair';
    case 'EDITOR':
      return 'Club Social Media Editor';
    case 'CONTRIBUTOR':
      return 'Club Contributor';
    case 'VIEWER':
      return 'Faculty / Viewer';
    default:
      return 'Institutional User';
  }
}

export type PersonaListItem = {
  user: User;
  memberships: SessionContext['memberships'];
};

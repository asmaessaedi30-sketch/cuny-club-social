import type { ClubMembership, PermissionRow, RoleName, User } from '../src/types.ts';
import { getDb } from './store.ts';

export type Capability =
  | 'VIEW_CLUB_DIRECTORY'
  | 'CREATE_CLUB_WORKSPACE'
  | 'AUTHORIZE_CLUB_LEADER'
  | 'INVITE_CLUB_MEMBERS'
  | 'ASSIGN_CLUB_ROLES'
  | 'REVOKE_CLUB_ACCESS'
  | 'REQUEST_NEW_SOCIAL_ACCOUNT'
  | 'APPROVE_INTERNAL_ACCOUNT_REQUEST'
  | 'EXECUTE_EXTERNAL_ACCOUNT_SETUP'
  | 'CONNECT_EXISTING_SOCIAL_ACCOUNT'
  | 'CREATE_CONTENT_DRAFT'
  | 'SCHEDULE_CONTENT'
  | 'PUBLISH_CONTENT'
  | 'VIEW_ANALYTICS'
  | 'VIEW_PRIVATE_MESSAGES'
  | 'REQUEST_ACCOUNT_CLOSURE'
  | 'AUTHORIZE_INTERNAL_CLOSURE_REQUEST'
  | 'VIEW_SECURITY_AUDIT_LOGS'
  | 'MANAGE_PLATFORM_CONFIG';

export const PERMISSIONS_MATRIX: PermissionRow[] = [
  { capability: 'View club directory', slSuperAdmin: 'Allowed', slAdmin: 'Scoped / Allowed', clubLead: 'Own clubs', editor: 'Own clubs', contributor: 'Own clubs', viewer: 'Own clubs' },
  { capability: 'Create club workspace', slSuperAdmin: 'Allowed', slAdmin: 'Conditional', clubLead: 'Not allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Authorize club leader', slSuperAdmin: 'Allowed', slAdmin: 'Conditional', clubLead: 'Not allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Invite club members', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Assign club roles', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Revoke club access', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Request new social account', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Approve internal account request', slSuperAdmin: 'Allowed', slAdmin: 'Conditional', clubLead: 'Not allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Execute external account setup', slSuperAdmin: 'Conditional', slAdmin: 'Conditional', clubLead: 'Not allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Connect existing social account', slSuperAdmin: 'Conditional', slAdmin: 'Conditional', clubLead: 'Conditional', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Create content draft', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Allowed', contributor: 'Allowed', viewer: 'Not allowed' },
  { capability: 'Schedule content', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Publish content', slSuperAdmin: 'Conditional', slAdmin: 'Conditional', clubLead: 'Allowed', editor: 'Allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'View analytics', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Allowed', contributor: 'Conditional', viewer: 'Conditional' },
  { capability: 'View private messages', slSuperAdmin: 'Conditional', slAdmin: 'Conditional', clubLead: 'Conditional', editor: 'Conditional', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Request account closure', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Authorize internal closure request', slSuperAdmin: 'Allowed', slAdmin: 'Conditional', clubLead: 'Not allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'View security audit logs', slSuperAdmin: 'Allowed', slAdmin: 'Scoped', clubLead: 'Limited', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
  { capability: 'Manage platform-wide configuration', slSuperAdmin: 'Allowed', slAdmin: 'Not allowed', clubLead: 'Not allowed', editor: 'Not allowed', contributor: 'Not allowed', viewer: 'Not allowed' },
];

export function getUserEffectiveClubRole(user: User, clubId: string, memberships?: ClubMembership[]): RoleName | null {
  if (user.status !== 'Active') return null;
  if (user.systemRole === 'SL_SUPER_ADMIN') return 'SL_SUPER_ADMIN';
  if (user.systemRole === 'SL_ADMIN') {
    if (user.assignedAdminClubIds?.includes(clubId)) {
      return 'SL_ADMIN';
    }
  }
  const membership: ClubMembership | undefined = (memberships ?? getDb().memberships).find(
    (m) => m.userId === user.userId && m.clubId === clubId && m.status === 'Active'
  );
  return membership ? membership.role : null;
}

export function canAccessClub(user: User, clubId: string): boolean {
  return getUserEffectiveClubRole(user, clubId) !== null;
}

export function hasClubCapability(user: User, clubId: string, capability: Capability): boolean {
  const role = getUserEffectiveClubRole(user, clubId);
  return roleHasCapability(role, capability);
}

export function roleHasCapability(role: RoleName | null, capability: Capability): boolean {
  if (!role) return false;
  switch (capability) {
    case 'VIEW_CLUB_DIRECTORY':
      return true;
    case 'CREATE_CLUB_WORKSPACE':
    case 'AUTHORIZE_CLUB_LEADER':
    case 'APPROVE_INTERNAL_ACCOUNT_REQUEST':
    case 'EXECUTE_EXTERNAL_ACCOUNT_SETUP':
    case 'AUTHORIZE_INTERNAL_CLOSURE_REQUEST':
      return role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN';
    case 'MANAGE_PLATFORM_CONFIG':
      return role === 'SL_SUPER_ADMIN';
    case 'INVITE_CLUB_MEMBERS':
    case 'ASSIGN_CLUB_ROLES':
    case 'REVOKE_CLUB_ACCESS':
    case 'REQUEST_NEW_SOCIAL_ACCOUNT':
    case 'CONNECT_EXISTING_SOCIAL_ACCOUNT':
    case 'REQUEST_ACCOUNT_CLOSURE':
      return role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN' || role === 'CLUB_LEAD';
    case 'CREATE_CONTENT_DRAFT':
      return role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN' || role === 'CLUB_LEAD' || role === 'EDITOR' || role === 'CONTRIBUTOR';
    case 'SCHEDULE_CONTENT':
    case 'PUBLISH_CONTENT':
    case 'VIEW_PRIVATE_MESSAGES':
      return role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN' || role === 'CLUB_LEAD' || role === 'EDITOR';
    case 'VIEW_ANALYTICS':
      return true; // Conditional for contributor/viewer on own club
    case 'VIEW_SECURITY_AUDIT_LOGS':
      return role === 'SL_SUPER_ADMIN' || role === 'SL_ADMIN' || role === 'CLUB_LEAD';
    default:
      return false;
  }
}

export function isAdminUser(user: User): boolean {
  return user.status === 'Active' && (user.systemRole === 'SL_SUPER_ADMIN' || user.systemRole === 'SL_ADMIN');
}

export function canAdminManageClub(user: User, clubId: string): boolean {
  if (user.status !== 'Active') return false;
  if (user.systemRole === 'SL_SUPER_ADMIN') return true;
  if (user.systemRole === 'SL_ADMIN') {
    return Boolean(user.assignedAdminClubIds?.includes(clubId));
  }
  return false;
}

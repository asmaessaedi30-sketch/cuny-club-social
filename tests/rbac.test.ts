import assert from 'node:assert/strict';
import test from 'node:test';
import { getUserEffectiveClubRole, roleHasCapability, type Capability } from '../server/rbac.ts';
import type { User, ClubMembership, RoleName } from '../src/types.ts';

const user = {userId:'synthetic',status:'Active',systemRole:'STANDARD_USER'} as User;
const roles: RoleName[] = ['SL_SUPER_ADMIN','SL_ADMIN','CLUB_LEAD','EDITOR','CONTRIBUTOR','VIEWER'];
const membership = (role: RoleName, status = 'Active') => [{userId:user.userId, clubId:'a', role, status}] as ClubMembership[];

test('role capabilities enforce draft, publishing, team and platform boundaries', () => {
  const allowed: Partial<Record<Capability, RoleName[]>> = {
    CREATE_CONTENT_DRAFT:roles.slice(0,5),
    SCHEDULE_CONTENT:roles.slice(0,4),
    PUBLISH_CONTENT:roles.slice(0,4),
    VIEW_PRIVATE_MESSAGES:roles.slice(0,4),
    ASSIGN_CLUB_ROLES:roles.slice(0,3),
    REVOKE_CLUB_ACCESS:roles.slice(0,3),
    INVITE_CLUB_MEMBERS:roles.slice(0,3),
    AUTHORIZE_CLUB_LEADER:roles.slice(0,2),
    MANAGE_PLATFORM_CONFIG:roles.slice(0,1),
  };
  for (const [capability, permitted] of Object.entries(allowed)) {
    for (const role of roles) assert.equal(roleHasCapability(role,capability as Capability),permitted.includes(role),role+' '+capability);
    assert.equal(roleHasCapability(null,capability as Capability), false);
  }
});

test('every club role is scoped to an active membership and revoked users lose access', () => {
  for (const role of roles.slice(2)) {
    assert.equal(getUserEffectiveClubRole(user,'a',membership(role)),role);
    assert.equal(getUserEffectiveClubRole(user,'b',membership(role)),null);
    assert.equal(getUserEffectiveClubRole(user,'a',membership(role,'Revoked')),null);
    assert.equal(getUserEffectiveClubRole({...user,status:'Revoked'} as User,'a',membership(role)),null);
  }
});

test('scoped administrators with missing scope do not inherit global access', () => {
  const admin = {...user,systemRole:'SL_ADMIN'} as User;
  assert.equal(getUserEffectiveClubRole(admin,'a',[]),null);
  assert.equal(getUserEffectiveClubRole({...admin,assignedAdminClubIds:['a']},'a',[]),'SL_ADMIN');
  assert.equal(getUserEffectiveClubRole({...admin,assignedAdminClubIds:['a']},'b',[]),null);
  assert.equal(getUserEffectiveClubRole({...user,systemRole:'SL_SUPER_ADMIN'},'b',[]),'SL_SUPER_ADMIN');
});

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ClubMemberRecord,
  JoinClubRequest,
  BudgetRequest,
  CollaborationRequest,
} from '../data/ecosystemStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-supabase-project')
);

export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// ==============================================================================
// 1. JOIN REQUESTS SYNC
// ==============================================================================

export async function fetchJoinRequestsFromSupabase(): Promise<JoinClubRequest[] | null> {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('join_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch join requests:', error.message);
      return null;
    }

    return (data || []).map((row) => ({
      id: row.id,
      clubId: row.club_id,
      clubName: row.club_name,
      studentName: row.student_name,
      studentEmail: row.student_email,
      major: row.major,
      interestReason: row.interest_reason,
      submittedAt: row.submitted_at,
      status: row.status,
      reviewedBy: row.reviewed_by || undefined,
      reviewedAt: row.reviewed_at || undefined,
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching join requests:', err);
    return null;
  }
}

export async function upsertJoinRequestToSupabase(req: JoinClubRequest): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('join_requests').upsert({
      id: req.id,
      club_id: req.clubId,
      club_name: req.clubName,
      student_name: req.studentName,
      student_email: req.studentEmail,
      major: req.major,
      interest_reason: req.interestReason,
      submitted_at: req.submittedAt,
      status: req.status,
      reviewed_by: req.reviewedBy || null,
      reviewed_at: req.reviewedAt || null,
    });

    if (error) {
      console.warn('[Supabase] Error upserting join request:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception upserting join request:', err);
    return false;
  }
}

// ==============================================================================
// 2. BUDGET REQUESTS SYNC
// ==============================================================================

export async function fetchBudgetRequestsFromSupabase(): Promise<BudgetRequest[] | null> {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('budget_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch budget requests:', error.message);
      return null;
    }

    return (data || []).map((row) => ({
      id: row.id,
      clubId: row.club_id,
      clubName: row.club_name,
      submittedBy: row.submitted_by,
      submitterEmail: row.submitter_email,
      title: row.title,
      amount: Number(row.amount),
      category: row.category,
      justification: row.justification,
      intendedEventDate: row.intended_event_date || undefined,
      submittedAt: row.submitted_at,
      status: row.status,
      adminDecisionNotes: row.admin_decision_notes || undefined,
      reviewedBy: row.reviewed_by || undefined,
      reviewedAt: row.reviewed_at || undefined,
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching budget requests:', err);
    return null;
  }
}

export async function upsertBudgetRequestToSupabase(req: BudgetRequest): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('budget_requests').upsert({
      id: req.id,
      club_id: req.clubId,
      club_name: req.clubName,
      submitted_by: req.submittedBy,
      submitter_email: req.submitterEmail,
      title: req.title,
      amount: req.amount,
      category: req.category,
      justification: req.justification,
      intended_event_date: req.intendedEventDate || null,
      submitted_at: req.submittedAt,
      status: req.status,
      admin_decision_notes: req.adminDecisionNotes || null,
      reviewed_by: req.reviewedBy || null,
      reviewed_at: req.reviewedAt || null,
    });

    if (error) {
      console.warn('[Supabase] Error upserting budget request:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception upserting budget request:', err);
    return false;
  }
}

// ==============================================================================
// 3. COLLABORATION REQUESTS SYNC
// ==============================================================================

export async function fetchCollabRequestsFromSupabase(): Promise<CollaborationRequest[] | null> {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('collaboration_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch collab requests:', error.message);
      return null;
    }

    return (data || []).map((row) => ({
      id: row.id,
      initiatingClubId: row.initiating_club_id,
      initiatingClubName: row.initiating_club_name,
      targetClubId: row.target_club_id,
      targetClubName: row.target_club_name,
      submittedBy: row.submitted_by,
      submitterEmail: row.submitter_email,
      eventTitle: row.event_title,
      proposedDate: row.proposed_date,
      proposedFormat: row.proposed_format,
      pitchDescription: row.pitch_description,
      expectedAttendees: Number(row.expected_attendees || 30),
      submittedAt: row.submitted_at,
      status: row.status,
      responseNotes: row.response_notes || undefined,
      respondedBy: row.responded_by || undefined,
      respondedAt: row.responded_at || undefined,
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching collab requests:', err);
    return null;
  }
}

export async function upsertCollabRequestToSupabase(req: CollaborationRequest): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('collaboration_requests').upsert({
      id: req.id,
      initiating_club_id: req.initiatingClubId,
      initiating_club_name: req.initiatingClubName,
      target_club_id: req.targetClubId,
      target_club_name: req.targetClubName,
      submitted_by: req.submittedBy,
      submitter_email: req.submitterEmail,
      event_title: req.eventTitle,
      proposed_date: req.proposedDate,
      proposed_format: req.proposedFormat,
      pitch_description: req.pitchDescription,
      expected_attendees: req.expectedAttendees,
      submitted_at: req.submittedAt,
      status: req.status,
      response_notes: req.responseNotes || null,
      responded_by: req.respondedBy || null,
      responded_at: req.respondedAt || null,
    });

    if (error) {
      console.warn('[Supabase] Error upserting collab request:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception upserting collab request:', err);
    return false;
  }
}

// ==============================================================================
// 4. MEMBERSHIP ROSTERS SYNC
// ==============================================================================

export async function fetchMembersFromSupabase(): Promise<ClubMemberRecord[] | null> {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('club_memberships')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Supabase] Failed to fetch memberships:', error.message);
      return null;
    }

    return (data || []).map((row) => ({
      memberId: row.id,
      clubId: row.club_id,
      clubName: row.club_name,
      name: row.name,
      email: row.email,
      major: row.major || 'CUNY SPS Student',
      role: row.role,
      joinedDate: row.joined_date,
      status: row.status,
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching memberships:', err);
    return null;
  }
}

export async function upsertMemberToSupabase(member: ClubMemberRecord): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('club_memberships').upsert({
      id: member.memberId,
      club_id: member.clubId,
      club_name: member.clubName,
      name: member.name,
      email: member.email,
      major: member.major,
      role: member.role,
      joined_date: member.joinedDate,
      status: member.status,
    });

    if (error) {
      console.warn('[Supabase] Error upserting membership:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception upserting membership:', err);
    return false;
  }
}

// ==============================================================================
// 5. REAL-TIME MULTI-DEVICE SUBSCRIPTIONS
// ==============================================================================

export function subscribeToRealtimeEcosystem(
  onUpdate: (table: string, eventType: string, payload: any) => void
): () => void {
  if (!supabaseClient) return () => {};

  const channel = supabaseClient
    .channel('cuny-hub-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'join_requests' },
      (payload) => onUpdate('join_requests', payload.eventType, payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budget_requests' },
      (payload) => onUpdate('budget_requests', payload.eventType, payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'collaboration_requests' },
      (payload) => onUpdate('collaboration_requests', payload.eventType, payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'club_memberships' },
      (payload) => onUpdate('club_memberships', payload.eventType, payload)
    )
    .subscribe();

  return () => {
    supabaseClient?.removeChannel(channel);
  };
}

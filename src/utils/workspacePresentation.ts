export function notificationText(message: string): string {
  // Historic notifications are records, not provider delivery receipts.
  return message.replace(/Email reminder sent to ([^\s;]+)\.?$/i, (_, recipient: string) =>
    `Email reminder recorded for ${recipient.replace(/\.$/, '')}; delivery is unverified. Please check Email Reminders.`);
}

const SEARCH_TERMS: Record<string, string> = {
  'create-post': 'compose draft publish caption posts', calendar: 'schedule social posts',
  'social-accounts': 'connections integrations meta facebook instagram',
  'member-directory': 'roster students members', team: 'invitations roles officers',
  'event-reminders': 'email reminders mail', 'club-resources': 'forms documents budget',
  'club-blog': 'articles stories news', 'messaging-center': 'broadcast message announcements',
};
export function searchWorkspacePages<T extends { id: string; label: string; section?: string }>(pages: T[], query: string): T[] {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return pages.filter(page => {
    const text = `${page.label} ${page.section ?? ''} ${SEARCH_TERMS[page.id] ?? ''}`.toLocaleLowerCase();
    return tokens.every(token => text.includes(token));
  });
}

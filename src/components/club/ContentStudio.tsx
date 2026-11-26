import { ActionConfirmation, type ConfirmationAction } from '../ActionConfirmation';
import { publishingPreflight } from '../../utils/publishingPreflight';
import { integrationStatus } from '../../utils/integrationStatus';
import { requestDraftDiscard, useDraftProtection } from '../../utils/draftProtection';
import { campusDate, campusTimeMs } from '../../utils/calendarDates';
import { userFacingAiError } from '../../utils/userFacingError';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileImage,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  Share2,
  Sparkles,
  Upload,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type {
  Club,
  CrossClubReshareRequest,
  MediaAsset,
  Post,
  PublicClubSummary,
  RoleName,
  SocialAccount,
  SocialPlatform,
} from '../../types';
import {
  getClubLogoUrl,
  loadImageElement,
  STUDENT_LIFE_LOGO_URL,
} from '../../utils/brandAssets';
import { StatusText } from '../StatusText';
import { AudioRecorderButton } from '../AudioRecorderButton';

interface ContentStudioProps {
  club: Club;
  effectiveRole: RoleName | null;
  accounts: SocialAccount[];
  posts: Post[];
  editingPost: Post | null;
  onClearEditing: () => void;
  onRefresh: () => Promise<void>;
}

type FlyerTemplate =
  | 'Workshop'
  | 'Panel Discussion'
  | 'General Body Meeting'
  | 'Heritage & Community';

const KNOWN_CAMEL_HASHTAGS: Record<string, string> = {
  '#cunysps': '#CUNYSPS',
  '#cuny': '#CUNY',
  '#studentlife': '#StudentLife',
  '#datascience': '#DataScience',
  '#aiclub': '#AIClub',
  '#healthinformatics': '#HealthInformatics',
  '#careerdevelopment': '#CareerDevelopment',
  '#firstgen': '#FirstGen',
  '#blackhistorymonth': '#BlackHistoryMonth',
  '#womenshistorymonth': '#WomensHistoryMonth',
  '#onlinelearning': '#OnlineLearning',
  '#civictech': '#CivicTech',
};

function toCamelCaseHashtag(tag: string): string {
  const clean = tag.trim();
  if (!clean.startsWith('#')) return clean;
  const lower = clean.toLowerCase();
  if (KNOWN_CAMEL_HASHTAGS[lower]) return KNOWN_CAMEL_HASHTAGS[lower];
  const body = clean.slice(1);
  if (body.length <= 4 && body === body.toUpperCase()) return `#${body}`;
  // Convert snake/kebab or single all-lowercase token cleanly
  if (/[_-]/.test(body)) {
    return (
      '#' +
      body
        .split(/[_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
    );
  }
  if (body === body.toLowerCase() && body.length > 3) {
    return `#${body.charAt(0).toUpperCase()}${body.slice(1)}`;
  }
  return clean;
}

function isNonCamelCaseHashtag(tag: string): boolean {
  const t = tag.trim();
  if (!t.startsWith('#') || t.length <= 3) return false;
  const body = t.slice(1);
  if (KNOWN_CAMEL_HASHTAGS[t.toLowerCase()] && t !== KNOWN_CAMEL_HASHTAGS[t.toLowerCase()]) {
    return true;
  }
  return body === body.toLowerCase() || /[_-]/.test(body);
}

export function ContentStudio({
  club,
  effectiveRole,
  accounts,
  posts,
  editingPost,
  onClearEditing,
  onRefresh,
}: ContentStudioProps) {
  const { apiFetch, draftHandoff, setDraftHandoff } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [postId, setPostId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('#CUNYSPS');
  const [callToAction, setCallToAction] = useState('');
  const [relatedEvent, setRelatedEvent] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [pendingPublishAction, setPendingPublishAction] = useState<ConfirmationAction | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.filter((a) => a.connection.status === 'Connected').map((a) => a.accountId)
  );
  const [scheduledAt, setScheduledAt] = useState(() => `${campusDate()}T15:00`);
  const [mediaAsset, setMediaAsset] = useState<MediaAsset | undefined>(undefined);
  const [altText, setAltText] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('Facebook Pages');
  const [aiAssisted, setAiAssisted] = useState(false);

  // Inline AI Caption & Alt-Text helper state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTone, setAiTone] = useState('Informative & welcoming');
  const [aiAudience, setAiAudience] = useState('CUNY SPS students across online programs');
  const [aiLoading, setAiLoading] = useState(false);
  const [altLoading, setAltLoading] = useState(false);

  // Promotional Graphic Card Builder state (AI-003)
  const [showGraphicBuilder, setShowGraphicBuilder] = useState(false);
  const [flyerTemplate, setFlyerTemplate] = useState<FlyerTemplate>('Workshop');
  const [cardAccent, setCardAccent] = useState('#004B87');
  const [cardSubtitle, setCardSubtitle] = useState('Virtual Student Event · Open to All CUNY SPS');

  // Peer Review & Cross-Club Reshare state
  const [reviewCommentText, setReviewCommentText] = useState('');
  const [partnerClubs, setPartnerClubs] = useState<PublicClubSummary[]>([]);
  const [reshareRequests, setReshareRequests] = useState<CrossClubReshareRequest[]>([]);
  const [reshareTargetClubId, setReshareTargetClubId] = useState('');
  const [reshareNote, setReshareNote] = useState('');

  const baseUpdatedAt = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { dirty, markChanged, markClean, version, discardDialog } = useDraftProtection(busy);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const canDraft = effectiveRole !== 'VIEWER';
  const canPublishOrSchedule =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD' ||
    effectiveRole === 'EDITOR';

  const currentLoadedPost = useMemo(
    () => (postId ? posts.find((p) => p.postId === postId) ?? editingPost : null),
    [editingPost, postId, posts]
  );

  const nonCamelTags = useMemo(
    () =>
      hashtagsText
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t && isNonCamelCaseHashtag(t)),
    [hashtagsText]
  );

  const loadReshareData = useCallback(async () => {
    try {
      const [dirRes, reqRes] = await Promise.all([
        apiFetch<{ clubs: PublicClubSummary[] }>('/api/public/campus'),
        apiFetch<{ requests: CrossClubReshareRequest[] }>('/api/reshare-requests'),
      ]);
      const partners = dirRes.clubs.filter((c) => c.clubId !== club.clubId);
      setPartnerClubs(partners);
      setReshareTargetClubId((prev) => prev || partners[0]?.clubId || '');
      setReshareRequests(reqRes.requests);
    } catch {
      // Non-blocking reshare loader
    }
  }, [apiFetch, club.clubId]);

  useEffect(() => {
    void loadReshareData();
  }, [loadReshareData]);

  useEffect(() => {
    if (editingPost) {
      markClean();
      setPostId(editingPost.postId);
      baseUpdatedAt.current = editingPost.updatedAt;
      setTitle(editingPost.title);
      setCaption(editingPost.caption);
      setHashtagsText(editingPost.hashtags.join(' '));
      setCallToAction(editingPost.callToAction ?? '');
      setRelatedEvent(editingPost.relatedEvent ?? '');
      setEventDate(editingPost.eventDate ?? '');
      setSelectedAccountIds(editingPost.targetAccountIds);
      if (editingPost.scheduledAt) {
        const instant = new Date(editingPost.scheduledAt);
        const time = instant.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        setScheduledAt(`${campusDate(instant)}T${time}`);
      }
      setMediaAsset(editingPost.mediaAsset);
      setAltText(editingPost.mediaAsset?.altText ?? '');
      setAiAssisted(editingPost.aiAssisted);
    }
  }, [editingPost]);

  useEffect(() => {
    if (draftHandoff) {
      markChanged();
      setPostId(null);
      baseUpdatedAt.current = null;
      setTitle(draftHandoff.title);
      setCaption(draftHandoff.caption);
      setHashtagsText(draftHandoff.hashtags.join(' '));
      setCallToAction(draftHandoff.callToAction ?? '');
      setRelatedEvent(draftHandoff.relatedEvent ?? '');
      setEventDate(draftHandoff.eventDate ?? '');
      setAiAssisted(draftHandoff.aiAssisted);
      setFeedback('Loaded draft into Content Studio. Review and edit before saving or publishing.');
      setDraftHandoff(null);
    }
  }, [draftHandoff, setDraftHandoff]);

  const resetForm = () => {
    markClean();
    setPostId(null);
    baseUpdatedAt.current = null;
    setTitle('');
    setCaption('');
    setHashtagsText('#CUNYSPS');
    setCallToAction('');
    setRelatedEvent('');
    setEventDate('');
    setMediaAsset(undefined);
    setAltText('');
    setAiAssisted(false);
    setReviewCommentText('');
    onClearEditing();
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  const handleConvertCamelCaseHashtags = () => {
    const converted = hashtagsText
      .split(/(\s+)/)
      .map((part) => (part.startsWith('#') ? toCamelCaseHashtag(part) : part))
      .join('');
    markChanged();
    setHashtagsText(converted);
    setFeedback('Converted hashtags to WCAG CamelCase for screen-reader accessibility.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      markChanged();
      const dataUrl = String(reader.result);
      setMediaAsset({
        assetId: `asset-${Date.now()}`,
        clubId: club.clubId,
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        altText: altText || `${club.name} event graphic`,
        uploadedBy: 'Club Officer',
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateGeminiAltText = async () => {
    if (!mediaAsset) return;
    const base64Part = mediaAsset.dataUrl.includes(',')
      ? mediaAsset.dataUrl.split(',')[1]
      : mediaAsset.dataUrl;
    if (!base64Part) return;
    setAltLoading(true);
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ altText: string; modelUsed?: string }>(
        `/api/clubs/${club.clubId}/ai/alt-text`,
        {
          method: 'POST',
          body: JSON.stringify({
            base64Data: base64Part,
            mimeType: mediaAsset.mimeType || 'image/png',
            eventContext: title || relatedEvent || club.name,
          }),
        }
      );
      markChanged();
      setAltText(res.altText);
      setMediaAsset((prev) => (prev ? { ...prev, altText: res.altText } : prev));
      setFeedback(`Generated WCAG 2.1 AA alt-text via ${res.modelUsed ?? 'Gemini Vision'}.`);
    } catch (err) {
      setError(userFacingAiError(err instanceof Error ? err.message : ''));
    } finally {
      setAltLoading(false);
    }
  };

  const handleGenerateEventGraphic = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const headline = title || relatedEvent || 'Upcoming Student Organization Event';
    const clubLogoSrc = getClubLogoUrl(club.clubId, club.shortCode, club.name);
    const [studentLifeImg, clubEmblemImg] = await Promise.all([
      loadImageElement(STUDENT_LIFE_LOGO_URL),
      clubLogoSrc ? loadImageElement(clubLogoSrc) : Promise.resolve(null),
    ]);

    if (flyerTemplate === 'Panel Discussion') {
      // Dark executive header + left vertical accent bar
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = cardAccent;
      ctx.fillRect(0, 0, 44, 1080);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(44, 0, 1036, 220);

      ctx.fillStyle = '#93C5FD';
      ctx.font = '700 24px sans-serif';
      ctx.fillText('PANEL DISCUSSION · CUNY SPS STUDENT LIFE', 96, 86);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 40px sans-serif';
      ctx.fillText(club.name.toUpperCase(), 96, 152);
    } else if (flyerTemplate === 'General Body Meeting') {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = cardAccent;
      ctx.fillRect(64, 64, 952, 180);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 24px sans-serif';
      ctx.fillText('GENERAL BODY MEETING · ALL MEMBERS WELCOME', 100, 130);
      ctx.font = '700 40px sans-serif';
      ctx.fillText(`${club.shortCode} · ${club.name}`, 100, 194);
    } else if (flyerTemplate === 'Heritage & Community') {
      ctx.fillStyle = '#FFFBEB';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = '#0F766E';
      ctx.fillRect(0, 0, 1080, 240);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(0, 240, 1080, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 26px sans-serif';
      ctx.fillText('CUNY SPS HERITAGE & COMMUNITY SHOWCASE', 72, 92);
      ctx.font = '700 42px sans-serif';
      ctx.fillText(club.name.toUpperCase(), 72, 164);
    } else {
      // Classic Workshop Banner
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = cardAccent;
      ctx.fillRect(0, 0, 1080, 260);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 26px sans-serif';
      ctx.fillText('CUNY SCHOOL OF PROFESSIONAL STUDIES · WORKSHOP', 72, 95);
      ctx.font = '700 44px sans-serif';
      ctx.fillText(club.name.toUpperCase(), 72, 165);
    }

    // Draw circular club emblem in top-right header if applicable (e.g. CUNY SPS AI Club)
    if (clubEmblemImg) {
      const cx = flyerTemplate === 'General Body Meeting' ? 934 : 950;
      const cy = flyerTemplate === 'General Body Meeting' ? 154 : 124;
      const radius = 64;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(clubEmblemImg, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
    }

    // Main Headline
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 60px sans-serif';
    const leftPad = flyerTemplate === 'Panel Discussion' ? 96 : 72;
    const words = headline.split(' ');
    let line = '';
    let y = 395;
    for (const w of words) {
      const testLine = line + w + ' ';
      if (ctx.measureText(testLine).width > 900) {
        ctx.fillText(line.trim(), leftPad, y);
        line = w + ' ';
        y += 78;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), leftPad, y);

    // Subtitle & Date block
    ctx.fillStyle = '#475569';
    ctx.font = '500 30px sans-serif';
    ctx.fillText(cardSubtitle, leftPad, y + 86);

    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(leftPad, 804, 1080 - leftPad * 2, 184);
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(
      `Date: ${eventDate || 'See Event Details'}   |   ${callToAction || 'RSVP via Student Life'}`,
      leftPad + 30,
      866
    );
    ctx.fillStyle = '#475569';
    ctx.font = '500 22px sans-serif';
    ctx.fillText(
      `Recognized Organization: ${club.name} (${club.shortCode})`,
      leftPad + 30,
      912
    );
    ctx.fillText('CUNY SPS Office of Student Life', leftPad + 30, 948);

    // Draw official Student Life Wildcat banner inside bottom-right card
    if (studentLifeImg) {
      const maxH = 112;
      const aspect = studentLifeImg.naturalWidth > 0
        ? studentLifeImg.naturalWidth / studentLifeImg.naturalHeight
        : 2.0;
      const drawW = Math.min(260, Math.round(maxH * aspect));
      const drawH = Math.round(drawW / aspect);
      const boxX = 1080 - leftPad - drawW - 24;
      const boxY = 804 + Math.round((184 - drawH) / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(boxX - 10, boxY - 8, drawW + 20, drawH + 16);
      ctx.drawImage(studentLifeImg, boxX, boxY, drawW, drawH);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const generatedAlt = `${flyerTemplate} flyer for ${club.name}: ${headline}. ${cardSubtitle}. Date: ${eventDate || 'Upcoming'}.`;
    markChanged();
    setAltText(generatedAlt);
    setMediaAsset({
      assetId: `asset-gfx-${Date.now()}`,
      clubId: club.clubId,
      fileName: `${club.shortCode.toLowerCase()}-${flyerTemplate.toLowerCase().replace(/\s+/g, '-')}-card.png`,
      mimeType: 'image/png',
      dataUrl,
      altText: generatedAlt,
      uploadedBy: 'Promotional Flyer Studio',
      uploadedAt: new Date().toISOString(),
    });
    setShowGraphicBuilder(false);
    setFeedback(`Rendered ${flyerTemplate} promotional flyer with official CUNY SPS branding and alt-text.`);
  };

  const handleGenerateInlineCaption = async () => {
    setAiLoading(true);
    setError('');
    try {
      const res = await apiFetch<{
        caption: string;
        hashtags: string[];
        callToAction: string;
        accessibilityNote: string;
      }>(`/api/clubs/${club.clubId}/ai/captions`, {
        method: 'POST',
        body: JSON.stringify({
          eventName: relatedEvent || title || `${club.name} Announcement`,
          date: eventDate || 'Upcoming this semester',
          time: '6:30 PM ET',
          description: caption || title || club.description,
          targetAudience: aiAudience,
          platform: previewPlatform,
          tone: aiTone,
        }),
      });
      markChanged();
      setCaption(res.caption);
      setHashtagsText(res.hashtags.join(' '));
      setCallToAction(res.callToAction);
      setAiAssisted(true);
      setFeedback(`AI draft ready (human review required). Note: ${res.accessibilityNote}`);
    } catch (err) {
      setError(userFacingAiError(err instanceof Error ? err.message : ''));
    } finally {
      setAiLoading(false);
    }
  };

  const saveOrUpdateDraft = async (saveCopy = false): Promise<Post> => {
    const savedVersion = version.current;
    const hashtags = hashtagsText
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const finalMedia = mediaAsset
      ? { ...mediaAsset, altText: altText || mediaAsset.altText }
      : undefined;

    if (postId && !saveCopy) {
      const res = await apiFetch<{ post: Post }>(`/api/clubs/${club.clubId}/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          expectedUpdatedAt: baseUpdatedAt.current,
          title,
          caption,
          hashtags,
          callToAction,
          relatedEvent,
          eventDate,
          targetAccountIds: selectedAccountIds,
          mediaAsset: finalMedia,
          aiAssisted,
        }),
      });
      baseUpdatedAt.current = res.post.updatedAt;
      markClean(savedVersion);
      return res.post;
    }

    const res = await apiFetch<{ post: Post }>(`/api/clubs/${club.clubId}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        caption,
        hashtags,
        callToAction,
        relatedEvent,
        eventDate,
        targetAccountIds: selectedAccountIds,
        mediaAsset: finalMedia,
        aiAssisted,
      }),
    });
    markClean(savedVersion);
    setPostId(res.post.postId);
    baseUpdatedAt.current = res.post.updatedAt;
    return res.post;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await saveOrUpdateDraft();
      setFeedback('Draft saved to club workspace.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestPeerReview = async () => {
    if (!title.trim() || !caption.trim()) {
      setError('Enter a post title and caption before requesting Lead/Editor peer review.');
      return;
    }
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const saved = await saveOrUpdateDraft();
      await apiFetch(`/api/clubs/${club.clubId}/posts/${saved.postId}/request-review`, {
        method: 'POST',
        body: JSON.stringify({ note: reviewCommentText.trim() || undefined }),
      });
      setReviewCommentText('');
      setFeedback(
        'Submitted draft for internal Club Lead / Editor peer review (status updated to In Review).'
      );
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request internal peer review.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddPeerReviewComment = async () => {
    if (!postId || !reviewCommentText.trim()) return;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${club.clubId}/posts/${postId}/review-comment`, {
        method: 'POST',
        body: JSON.stringify({ body: reviewCommentText.trim() }),
      });
      setReviewCommentText('');
      setFeedback('Added peer review note and notified draft author.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add review comment.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestReshare = async () => {
    if (!postId || !reshareTargetClubId) return;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/clubs/${club.clubId}/posts/${postId}/reshare-request`, {
        method: 'POST',
        body: JSON.stringify({
          targetClubId: reshareTargetClubId,
          note: reshareNote.trim() || undefined,
        }),
      });
      setReshareNote('');
      setFeedback('Sent cross-club co-sponsored reshare request to partner club officers.');
      await loadReshareData();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send cross-club reshare request.');
    } finally {
      setBusy(false);
    }
  };

  const handleReshareDecision = async (
    requestId: string,
    decision: 'Approved' | 'Declined'
  ) => {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/reshare-requests/${requestId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setFeedback(
        decision === 'Approved'
          ? 'Approved reshare request and added cross-post draft to your club queue.'
          : 'Declined cross-club reshare request.'
      );
      await loadReshareData();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process reshare decision.');
    } finally {
      setBusy(false);
    }
  };

  const currentPreflight = publishingPreflight({ title, caption, targetAccountIds: selectedAccountIds, mediaAsset: mediaAsset ? { ...mediaAsset, altText } : undefined }, accounts);
  const confirmPublishing = (action: 'schedule' | 'publish', run: () => void, savedPost?: Post) => {
    const check = savedPost ? publishingPreflight(savedPost, accounts) : currentPreflight;
    if (check.errors.length) { setError(check.errors.join(' ')); return; }
    setError('');
    setPendingPublishAction({
      title: action === 'schedule' ? 'Confirm scheduled destinations' : 'Confirm publishing destinations',
      description: `${action === 'schedule' ? `Schedule at ${scheduledAt.replace('T', ' ')} New York time.` : 'Publish now.'}\n${check.destinations.join('\n')}\nSimulation creates no external post. Configured destinations may contact a provider; configuration does not prove delivery.`,
      preview: savedPost?.caption ?? caption,
      confirmLabel: action === 'schedule' ? 'Confirm schedule' : 'Confirm publish',
      onConfirm: () => { setPendingPublishAction(null); run(); },
    });
  };

  const handleSchedule = async (confirmed = false) => {
    if (!confirmed) { confirmPublishing('schedule', () => void handleSchedule(true)); return; }
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const instant = campusTimeMs(scheduledAt.slice(0, 10), scheduledAt.slice(11));
      if (!Number.isFinite(instant) || instant <= Date.now()) throw new Error('Choose a future New York time. Daylight-saving gaps and repeated-hour times are not supported; choose another time.');
      const saved = await saveOrUpdateDraft();
      await apiFetch(`/api/clubs/${club.clubId}/posts/${saved.postId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          scheduledAt: new Date(instant).toISOString(),
          targetAccountIds: selectedAccountIds,
        }),
      });
      setFeedback('Schedule recorded. Check the destination modes and queue for publishing outcomes.');
      resetForm();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule post.');
    } finally {
      setBusy(false);
    }
  };

  const handlePublishNow = async (overridePostId?: string, confirmed = false) => {
    if (!confirmed) {
      const queued = overridePostId ? posts.find(post => post.postId === overridePostId) : undefined;
      if (overridePostId && !queued) { setError('This queued post is unavailable. Refresh the workspace.'); return; }
      confirmPublishing('publish', () => void handlePublishNow(overridePostId, true), queued); return;
    }
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const targetId = overridePostId ?? (await saveOrUpdateDraft()).postId;
      const res = await apiFetch<{ post: Post }>(
        `/api/clubs/${club.clubId}/posts/${targetId}/publish`,
        {
          method: 'POST',
          body: JSON.stringify(overridePostId ? {} : { targetAccountIds: selectedAccountIds }),
        }
      );
      if (res.post.status === 'Failed') {
        const failedAttempt = res.post.publishAttempts.find((a) => a.outcome === 'Failed');
        setError(
          `Publishing failed on ${failedAttempt?.handle ?? 'platform'}: ${failedAttempt?.errorMessage ?? 'Connector error'}. ${failedAttempt?.nextAction ?? ''}`
        );
      } else {
        setFeedback(
          'Publishing attempt recorded. Simulation destinations do not create external posts; check queue results for provider evidence.'
        );
        if (!overridePostId) resetForm();
      }
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post.');
    } finally {
      setBusy(false);
    }
  };

  const fullCaptionPreview = [caption, callToAction, hashtagsText].filter(Boolean).join('\n\n');
  const incomingReshares = reshareRequests.filter((r) => r.targetClubId === club.clubId);
  const outgoingReshares = reshareRequests.filter((r) => r.sourceClubId === club.clubId);

  return (
    <div className="space-y-8">
      <ActionConfirmation action={pendingPublishAction} onCancel={() => setPendingPublishAction(null)} />
      {discardDialog}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Content Creation Studio</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Draft, peer-review internally, generate accessible flyers & WCAG alt-text, schedule, and
            publish directly—no Student Life pre-approval required.
          </p>
        </div>
        {postId && (
          <button
            type="button"
            onClick={async () => { if (await requestDraftDiscard()) resetForm(); }}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
          >
            New Blank Draft
          </button>
        )}
      </div>

      {!canDraft && (
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700">
          Viewer role: You have read-only visibility into scheduled and published club content.
        </div>
      )}

      {error && (
        <div role="alert" className="p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {canDraft && <p role="status" className="text-xs font-medium text-slate-600">{dirty ? 'Unsaved changes — save your draft before leaving.' : 'No unsaved changes.'}</p>}
      {error && postId && canDraft && (
        <button type="button" disabled={busy} className="text-sm font-semibold text-[#004B87] underline disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            try {
              await saveOrUpdateDraft(true);
              setError('');
              setFeedback('Your edits were saved as a separate draft. The original post was not changed.');
              await onRefresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to save a copy. Your edits are still here.');
            } finally { setBusy(false); }
          }}>Save my edits as a new draft</button>
      )}
      {feedback && (
        <div className="p-3.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Composer Column */}
        <form
          onChangeCapture={markChanged}
          onSubmit={handleSaveDraft}
          className="lg:col-span-7 min-w-0 bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <fieldset disabled={busy} className="min-w-0 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-slate-900">
                {postId ? `Editing Post (${postId})` : 'New Social Media Post'}
              </h2>
              {currentLoadedPost && <StatusText status={currentLoadedPost.status} />}
            </div>
            {canDraft && (
              <button
                type="button"
                onClick={() => setShowAiPanel((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showAiPanel ? 'Hide AI Caption Helper' : 'AI Caption Helper'}</span>
              </button>
            )}
          </div>

          {showAiPanel && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Gemini AI Caption Generator (AI-001 · Draft Only)
                </span>
                <span className="text-[11px] text-slate-500">Human review required</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={aiAudience}
                  onChange={(e) => setAiAudience(e.target.value)}
                  placeholder="Target audience"
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                >
                  <option>Informative & welcoming</option>
                  <option>Academic & professional</option>
                  <option>Energetic student event promo</option>
                  <option>Concise reminder</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => void handleGenerateInlineCaption()}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded cursor-pointer"
                >
                  {aiLoading ? 'Generating Draft...' : 'Generate Suggested Caption'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="post-title" className="block text-xs font-medium text-slate-700 mb-1">
                Internal Post Title
              </label>
              <input id="post-title"
                type="text"
                required
                disabled={!canDraft}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Spring AI Ethics Panel Announcement"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] disabled:bg-slate-50"
              />
            </div>
            <div>
              <label htmlFor="post-event" className="block text-xs font-medium text-slate-700 mb-1">
                Related Club Event (Optional)
              </label>
              <input id="post-event"
                type="text"
                disabled={!canDraft}
                value={relatedEvent}
                onChange={(e) => setRelatedEvent(e.target.value)}
                placeholder="e.g., AI Club Meeting"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] disabled:bg-slate-50"
              />
            </div>
            <div>
              <label htmlFor="post-event-date" className="block text-xs font-medium text-slate-700 mb-1">
                Event Date (Optional)
              </label>
              <input id="post-event-date"
                type="date"
                disabled={!canDraft}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="post-copy" className="block text-xs font-medium text-slate-700">Post Copy</label>
              <div className="flex items-center gap-3">
                {canDraft && (
                  <AudioRecorderButton
                    clubId={club.clubId}
                    compact
                    contextHint={`Social post caption for ${club.name}`}
                    onTranscript={(transcript) => {
                      markChanged();
                      setCaption((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
                      setAiAssisted(true);
                      setFeedback('Voice transcript added to Post Copy. Review and edit before publishing.');
                    }}
                    onError={setError}
                  />
                )}
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {caption.length} chars
                </span>
              </div>
            </div>
            <textarea id="post-copy"
              rows={5}
              required
              disabled={!canDraft}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your announcement, dictate a voice note, or use the AI Caption Helper..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="post-cta" className="block text-xs font-medium text-slate-700 mb-1">
                Call to Action
              </label>
              <input id="post-cta"
                type="text"
                disabled={!canDraft}
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                placeholder="RSVP via Student Life Portal"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="post-hashtags" className="block text-xs font-medium text-slate-700">
                  Hashtags (WCAG CamelCase)
                </label>
                {nonCamelTags.length > 0 && canDraft && (
                  <button
                    type="button"
                    onClick={handleConvertCamelCaseHashtags}
                    className="text-[11px] font-semibold text-[#004B87] hover:underline cursor-pointer"
                  >
                    Convert to CamelCase
                  </button>
                )}
              </div>
              <input id="post-hashtags"
                type="text"
                disabled={!canDraft}
                value={hashtagsText}
                onChange={(e) => setHashtagsText(e.target.value)}
                placeholder="#CUNYSPS #StudentLife"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
              />
              {nonCamelTags.length > 0 && (
                <p className="mt-1 text-[11px] text-amber-700">
                  Screen-reader check: Use CamelCase for {nonCamelTags.join(', ')} (e.g.{' '}
                  {nonCamelTags.map(toCamelCaseHashtag).join(' ')}).
                </p>
              )}
            </div>
          </div>

          {/* Media Upload & 4-Template Promotional Flyer Studio */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-medium text-slate-700">Approved Media & Alt-Text</span>
              {canDraft && (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGraphicBuilder((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 rounded cursor-pointer"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    <span>Promotional Flyer Templates</span>
                  </button>
                </div>
              )}
            </div>

            {showGraphicBuilder && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <div className="text-xs font-semibold text-slate-900">
                  CUNY SPS Branded Promotional Flyer Builder (4 Templates)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Flyer Template Layout
                    </label>
                    <select
                      value={flyerTemplate}
                      onChange={(e) => setFlyerTemplate(e.target.value as FlyerTemplate)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="Workshop">Workshop Banner</option>
                      <option value="Panel Discussion">Panel Discussion</option>
                      <option value="General Body Meeting">General Body Meeting</option>
                      <option value="Heritage & Community">Heritage & Community Showcase</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Subtitle / Logistics Line
                    </label>
                    <input
                      type="text"
                      value={cardSubtitle}
                      onChange={(e) => setCardSubtitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Institutional Palette
                    </label>
                    <select
                      value={cardAccent}
                      onChange={(e) => setCardAccent(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="#004B87">CUNY Royal Blue (#004B87)</option>
                      <option value="#0F172A">Executive Slate (#0F172A)</option>
                      <option value="#1E3A8A">Academic Cobalt (#1E3A8A)</option>
                      <option value="#0F766E">Community Teal (#0F766E)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleGenerateEventGraphic()}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded cursor-pointer"
                  >
                    Render & Attach Flyer
                  </button>
                </div>
              </div>
            )}

            {mediaAsset && (
              <div className="flex flex-col sm:flex-row gap-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <img
                  src={mediaAsset.dataUrl}
                  alt={altText || mediaAsset.fileName}
                  className="w-24 h-24 object-cover rounded border border-slate-200 shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{mediaAsset.fileName}</span>
                    {canDraft && (
                      <button
                        type="button"
                        onClick={() => { markChanged(); setMediaAsset(undefined); }}
                        className="text-red-700 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-slate-600">
                        WCAG Accessible Alt-Text
                      </label>
                      {canDraft && (
                        <button
                          type="button"
                          disabled={altLoading}
                          onClick={() => void handleGenerateGeminiAltText()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#004B87] hover:underline cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>
                            {altLoading ? 'Analyzing Image...' : 'Generate Alt-Text with Gemini'}
                          </span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe visual content for screen readers..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Target Accounts & Scheduling */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-700">
              Select Target Official Social Accounts
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {accounts.map((acc) => {
                const checked = selectedAccountIds.includes(acc.accountId);
                return (
                  <label
                    key={acc.accountId}
                    className={`flex items-center justify-between p-3 border rounded-md text-xs cursor-pointer ${
                      checked ? 'border-[#004B87] bg-sky-50/50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        disabled={!canDraft}
                        checked={checked}
                        onChange={() => toggleAccount(acc.accountId)}
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{acc.handle}</div>
                        <div className="text-slate-500">{acc.platform}</div>
                      </div>
                    </div>
                    <StatusText status={integrationStatus(acc).label} />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Internal Peer Review Handoff & Comments */}
          {canDraft && (
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#004B87]" />
                  <span>Internal Peer Review & Contributor-to-Editor Handoff</span>
                </div>
                {currentLoadedPost?.peerReviewRequestedBy && (
                  <span className="text-[11px] text-slate-500">
                    Requested by {currentLoadedPost.peerReviewRequestedBy}
                  </span>
                )}
              </div>

              {currentLoadedPost?.peerReviewComments &&
                currentLoadedPost.peerReviewComments.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {currentLoadedPost.peerReviewComments.map((c) => (
                      <div
                        key={c.commentId}
                        className="p-2 bg-white border border-slate-200 rounded text-[11px]"
                      >
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {c.authorName} ({c.authorRoleLabel})
                          </span>
                          <span className="font-mono-tabular">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 mt-0.5">{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={reviewCommentText}
                  onChange={(e) => setReviewCommentText(e.target.value)}
                  placeholder="Optional handoff note or inline peer-review feedback..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
                {postId && (
                  <button
                    type="button"
                    disabled={busy || !reviewCommentText.trim()}
                    onClick={() => void handleAddPeerReviewComment()}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Add Note</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRequestPeerReview()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100/80 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Request Lead/Editor Review</span>
                </button>
              </div>
            </div>
          )}

          <section aria-label="Publishing preflight" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
            <h2 className="font-semibold text-slate-900">Before scheduling or publishing</h2>
            {currentPreflight.errors.length ? <ul className="list-disc pl-4 text-amber-900">{currentPreflight.errors.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className="text-slate-700">Required fields are complete. Review each destination below.</p>}
            <ul className="space-y-1 text-slate-700">{currentPreflight.destinations.map(destination => <li key={destination}>{destination}</li>)}</ul>
            <p className="text-slate-500">You can save an incomplete draft. These checks do not verify provider delivery or replace platform validation.</p>
          </section>
          {canDraft && (
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <label htmlFor="schedule-dt" className="text-xs font-medium text-slate-600 whitespace-nowrap">
                  Schedule Date/Time (New York):
                </label>
                <input
                  id="schedule-dt"
                  type="datetime-local"
                  disabled={!canPublishOrSchedule}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="min-w-0 max-w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md disabled:bg-slate-100"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>
                {canPublishOrSchedule && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSchedule()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#004B87] border border-[#004B87] bg-white hover:bg-sky-50 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>Schedule</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handlePublishNow()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Now</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          </fieldset>
        </form>

        {/* Platform-Specific Preview & Queues Column */}
        <div className="lg:col-span-5 min-w-0 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Eye className="w-4 h-4 text-slate-400" />
                <span>Platform Preview</span>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                {(['Facebook Pages', 'Instagram Professional'] as SocialPlatform[]).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setPreviewPlatform(plat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      previewPlatform === plat
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {plat === 'Facebook Pages' ? 'Facebook' : 'Instagram'}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{club.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {previewPlatform} ·{' '}
                    {accounts.find((a) => a.platform === previewPlatform)?.handle ?? '@officialhandle'}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">Preview</span>
              </div>

              {previewPlatform === 'Instagram Professional' && mediaAsset && (
                <img
                  src={mediaAsset.dataUrl}
                  alt={altText || 'Preview graphic'}
                  className="w-full aspect-square object-cover rounded border border-slate-200"
                />
              )}

              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {fullCaptionPreview || 'Your post caption, call to action, and hashtags will appear here.'}
              </div>

              {previewPlatform === 'Facebook Pages' && mediaAsset && (
                <img
                  src={mediaAsset.dataUrl}
                  alt={altText || 'Preview graphic'}
                  className="w-full max-h-60 object-cover rounded border border-slate-200"
                />
              )}

              {previewPlatform === 'Instagram Professional' && !mediaAsset && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                  Instagram Professional requires an uploaded image or promotional graphic card before
                  publishing.
                </div>
              )}
            </div>
          </div>

          {/* Cross-Club Co-Sponsored Reshare Actions & Queue */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#004B87]" />
                <span>Cross-Club Co-Sponsored Reshares</span>
              </h2>
              <span className="text-[11px] font-mono-tabular text-slate-500">
                {incomingReshares.length} incoming · {outgoingReshares.length} outgoing
              </span>
            </div>

            {postId && canPublishOrSchedule && partnerClubs.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <div className="text-[11px] font-semibold text-slate-800">
                  Invite Partner Club to Cross-Post &ldquo;{title || postId}&rdquo;
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={reshareTargetClubId}
                    onChange={(e) => setReshareTargetClubId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                  >
                    {partnerClubs.map((pc) => (
                      <option key={pc.clubId} value={pc.clubId}>
                        {pc.name} ({pc.shortCode})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRequestReshare()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded whitespace-nowrap cursor-pointer"
                  >
                    Request Reshare
                  </button>
                </div>
                <input
                  type="text"
                  value={reshareNote}
                  onChange={(e) => setReshareNote(e.target.value)}
                  placeholder="Optional co-sponsorship note..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
            )}

            {incomingReshares.length === 0 && outgoingReshares.length === 0 ? (
              <p className="text-xs text-slate-500">
                No cross-club reshare requests active. Load a saved post to invite a partner club.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {incomingReshares.map((req) => (
                  <div
                    key={req.requestId}
                    className="p-3 border border-slate-200 rounded bg-sky-50/40 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        From {req.sourceClubShortCode}: {req.sourcePostTitle}
                      </span>
                      <StatusText status={req.status} />
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{req.sourceCaption}</p>
                    {req.status === 'Pending' && canPublishOrSchedule && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReshareDecision(req.requestId, 'Approved')}
                          className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded cursor-pointer"
                        >
                          Approve & Queue Draft
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReshareDecision(req.requestId, 'Declined')}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 hover:text-red-700 rounded cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {outgoingReshares.map((req) => (
                  <div
                    key={req.requestId}
                    className="p-2.5 border border-slate-200 rounded bg-white text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        Sent to {req.targetClubShortCode}: {req.sourcePostTitle}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Requested by {req.requestedByName}
                      </div>
                    </div>
                    <StatusText status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publishing History & Retry Queue (US-023) */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Publishing Queue & Results ({posts.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200 max-h-[380px] overflow-y-auto">
              {posts.map((p) => {
                const failedAttempt = p.publishAttempts.find((a) => a.outcome === 'Failed');
                return (
                  <div key={p.postId} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!(await requestDraftDiscard())) return;
                          markClean();
                          setPostId(p.postId);
                          baseUpdatedAt.current = p.updatedAt;
                          setTitle(p.title);
                          setCaption(p.caption);
                          setHashtagsText(p.hashtags.join(' '));
                          setCallToAction(p.callToAction ?? '');
                          setRelatedEvent(p.relatedEvent ?? '');
                          setEventDate(p.eventDate ?? '');
                          setSelectedAccountIds(p.targetAccountIds);
                          setMediaAsset(p.mediaAsset);
                          setAltText(p.mediaAsset?.altText ?? '');
                        }}
                        className="text-left text-xs font-semibold text-slate-900 hover:text-[#004B87] cursor-pointer"
                      >
                        {p.title}
                      </button>
                      <StatusText status={p.status} />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Author: {p.authorName} · {p.targetAccountIds.length} target account(s)
                      {p.peerReviewComments && p.peerReviewComments.length > 0
                        ? ` · ${p.peerReviewComments.length} review note(s)`
                        : ''}
                      {p.scheduledAt && p.status === 'Scheduled'
                        ? ` · Due ${new Date(p.scheduledAt).toLocaleString()}`
                        : ''}
                    </div>
                    {failedAttempt && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-800 space-y-1">
                        <div className="font-semibold">
                          {failedAttempt.errorCode}: {failedAttempt.errorMessage}
                        </div>
                        <div>Next Action: {failedAttempt.nextAction}</div>
                        {canPublishOrSchedule && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handlePublishNow(p.postId)}
                            className="mt-1 inline-flex items-center gap-1 font-semibold text-red-900 hover:underline cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry Failed Platforms (Duplicate-Safe)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


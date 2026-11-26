import { ActionConfirmation, type ConfirmationAction } from '../ActionConfirmation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  Heart,
  ImagePlus,
  MessageSquare,
  Pencil,
  PenSquare,
  Plus,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { formatRoleLabel, useAuth } from '../../context/AuthContext';
import type {
  BlogPostCategory,
  BlogPostStatus,
  Club,
  ClubBlogPost,
  ClubBlogTaxonomy,
  ClubEvent,
  RoleName,
} from '../../types';
import { readAndResizeBlogCoverFile } from '../../utils/brandAssets';
import { ClubLogoMark } from '../BrandMarks';
import { StatusText } from '../StatusText';

interface ClubBlogViewProps {
  club: Club;
  effectiveRole: RoleName | null;
  events?: ClubEvent[];
  clubOptions?: { clubId: string; name: string; shortCode: string }[];
  onSelectClub?: (clubId: string) => void;
  onShareToSocialStudio?: (post: ClubBlogPost) => void;
  onRefreshParent?: () => Promise<void>;
}

const CORE_BLOG_CATEGORIES: BlogPostCategory[] = [
  'News',
  'Event Recap',
  'Member Spotlight',
];

const DEFAULT_BLOG_CATEGORIES: BlogPostCategory[] = [
  'News',
  'Event Recap',
  'Member Spotlight',
  'Tutorial & Guide',
  'Campus Voices',
  'Research & Projects',
];

function normalizeTagLabel(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').slice(0, 32);
}

function parseTagsList(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const clean = normalizeTagLabel(part);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result.slice(0, 8);
}

function formatInlineSegments(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="font-mono text-[0.9em] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function BlogMarkdownBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-slate-700">
      {blocks.map((rawBlock, idx) => {
        const block = rawBlock.trim();
        if (!block) return null;

        if (block.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-base font-bold text-slate-900 pt-2">
              {formatInlineSegments(block.slice(4))}
            </h4>
          );
        }
        if (block.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-lg font-bold text-slate-900 pt-3">
              {formatInlineSegments(block.slice(3))}
            </h3>
          );
        }
        if (block.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-xl font-bold text-slate-900 pt-3">
              {formatInlineSegments(block.slice(2))}
            </h2>
          );
        }
        if (block.startsWith('> ')) {
          const quoteText = block
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join(' ');
          return (
            <blockquote
              key={idx}
              className="border border-slate-200 bg-slate-50/80 rounded-lg px-5 py-4 text-sm italic text-slate-700"
            >
              {formatInlineSegments(quoteText)}
            </blockquote>
          );
        }

        const lines = block.split('\n');
        const isBulletList = lines.every((line) => /^[-*]\s+/.test(line.trim()));
        if (isBulletList) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1.5 text-slate-700">
              {lines.map((line, liIdx) => (
                <li key={liIdx}>{formatInlineSegments(line.trim().replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line">
            {formatInlineSegments(block)}
          </p>
        );
      })}
    </div>
  );
}

function BlogCoverVisual({
  coverImageUrl,
  coverImageAlt,
  title,
  clubShortCode,
  accentColor,
  compact = false,
}: {
  coverImageUrl?: string;
  coverImageAlt?: string;
  title: string;
  clubShortCode: string;
  accentColor?: string;
  compact?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [coverImageUrl]);

  const safeAccent =
    accentColor && /^#[0-9a-fA-F]{3,8}$/.test(accentColor) ? accentColor : '#004B87';

  if (coverImageUrl && !imgFailed) {
    return (
      <div
        className={`w-full overflow-hidden bg-slate-100 border-b border-slate-200 ${
          compact ? 'h-44' : 'max-h-[340px]'
        }`}
      >
        <img
          src={coverImageUrl}
          alt={coverImageAlt || title}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-full border-b border-slate-200 flex items-end justify-between px-5 ${
        compact ? 'h-28 py-4' : 'h-40 py-6'
      }`}
      style={{
        background: `linear-gradient(135deg, ${safeAccent}18 0%, #F8FAFC 65%, ${safeAccent}0D 100%)`,
      }}
    >
      <div className="space-y-1 max-w-2xl">
        <div
          className="text-[11px] font-mono font-semibold tracking-wide"
          style={{ color: safeAccent }}
        >
          {clubShortCode} · CLUB EDITORIAL
        </div>
        <div
          className={`font-bold text-slate-900 line-clamp-2 ${
            compact ? 'text-sm' : 'text-lg'
          }`}
        >
          {title}
        </div>
      </div>
    </div>
  );
}

export function ClubBlogView({
  club,
  effectiveRole,
  events = [],
  clubOptions,
  onSelectClub,
  onShareToSocialStudio,
  onRefreshParent,
}: ClubBlogViewProps) {
  const { apiFetch, session } = useAuth();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [posts, setPosts] = useState<ClubBlogPost[]>([]);
  const [taxonomy, setTaxonomy] = useState<ClubBlogTaxonomy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | BlogPostCategory>('ALL');
  const [tagFilter, setTagFilter] = useState<'ALL' | string>('ALL');
  const [publicationConfirmation, setPublicationConfirmation] = useState<ConfirmationAction | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Published' | 'Drafts' | 'Archived'>(
    'ALL'
  );

  // Category & Tag Management Panel state
  const [showTaxonomyManager, setShowTaxonomyManager] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState('');
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameTagValue, setRenameTagValue] = useState('');
  const [taxonomyBusy, setTaxonomyBusy] = useState(false);

  // Reader state
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

  // Composer / Editor state
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [composerTab, setComposerTab] = useState<'write' | 'preview'>('write');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<BlogPostCategory>('News');
  const [excerpt, setExcerpt] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageAlt, setCoverImageAlt] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<'Public Campus' | 'Club Members Only'>(
    'Public Campus'
  );
  const [featured, setFeatured] = useState(false);
  const [linkedEventId, setLinkedEventId] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  const canDraft =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD' ||
    effectiveRole === 'EDITOR' ||
    effectiveRole === 'CONTRIBUTOR';

  const canPublish =
    effectiveRole === 'SL_SUPER_ADMIN' ||
    effectiveRole === 'SL_ADMIN' ||
    effectiveRole === 'CLUB_LEAD' ||
    effectiveRole === 'EDITOR';

  const loadBlogPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ blogPosts: ClubBlogPost[]; taxonomy?: ClubBlogTaxonomy }>(
        `/api/clubs/${club.clubId}/blog-posts`
      );
      setPosts(res.blogPosts ?? []);
      if (res.taxonomy) {
        setTaxonomy(res.taxonomy);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load club blog articles.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, club.clubId]);

  useEffect(() => {
    setActivePostId(null);
    setComposerOpen(false);
    setEditingPostId(null);
    setCategoryFilter('ALL');
    setTagFilter('ALL');
    setShowTaxonomyManager(false);
    void loadBlogPosts();
  }, [loadBlogPosts]);

  const resetComposer = () => {
    setEditingPostId(null);
    setComposerTab('write');
    setTitle('');
    setSubtitle('');
    setCategory('News');
    setExcerpt('');
    setBodyMarkdown('');
    setCoverImageUrl('');
    setCoverImageAlt('');
    setTagsInput('');
    setVisibility('Public Campus');
    setFeatured(false);
    setLinkedEventId('');
  };

  const openNewComposer = () => {
    resetComposer();
    setError('');
    setNotice('');
    setComposerOpen(true);
    setActivePostId(null);
  };

  const openEditComposer = (post: ClubBlogPost) => {
    setEditingPostId(post.blogPostId);
    setComposerTab('write');
    setTitle(post.title);
    setSubtitle(post.subtitle ?? '');
    setCategory(post.category);
    setExcerpt(post.excerpt);
    setBodyMarkdown(post.bodyMarkdown);
    setCoverImageUrl(post.coverImageUrl ?? '');
    setCoverImageAlt(post.coverImageAlt ?? '');
    setTagsInput(post.tags.join(', '));
    setVisibility(post.visibility);
    setFeatured(post.featured);
    setLinkedEventId(post.linkedEventId ?? '');
    setError('');
    setNotice('');
    setComposerOpen(true);
    setActivePostId(null);
  };

  const insertMarkdownSnippet = (snippet: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBodyMarkdown((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
      return;
    }
    const start = textarea.selectionStart ?? bodyMarkdown.length;
    const end = textarea.selectionEnd ?? bodyMarkdown.length;
    const before = bodyMarkdown.slice(0, start);
    const after = bodyMarkdown.slice(end);
    const spacerBefore = before && !before.endsWith('\n') ? '\n\n' : '';
    const nextValue = `${before}${spacerBefore}${snippet}${after}`;
    setBodyMarkdown(nextValue);
    setTimeout(() => {
      textarea.focus();
    }, 20);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError('');
    try {
      const dataUrl = await readAndResizeBlogCoverFile(file, 1200, 675);
      setCoverImageUrl(dataUrl);
      if (!coverImageAlt) {
        setCoverImageAlt(`${club.name} blog article cover image`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process selected cover image.');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleSubmitArticle = async (targetStatus: BlogPostStatus, confirmed = false) => {
    if (targetStatus === 'Published' && !confirmed) {
      if (!title.trim() || !bodyMarkdown.trim()) { setError('Add an article title and body before publishing.'); return; }
      setPublicationConfirmation({ title: 'Confirm blog audience', description: `Audience: ${visibility}. ${visibility === 'Public Campus' ? 'Anyone visiting the public campus directory may read this article.' : 'This article is intended for signed-in members of this club.'}\nConfirm the audience and preview before publishing.`, preview: `${title}\n\n${excerpt || bodyMarkdown}`, confirmLabel: 'Confirm blog publication', onConfirm: () => { setPublicationConfirmation(null); void handleSubmitArticle(targetStatus, true); } });
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        category,
        excerpt: excerpt.trim(),
        bodyMarkdown: bodyMarkdown.trim(),
        coverImageUrl: coverImageUrl.trim(),
        coverImageAlt: coverImageAlt.trim(),
        tags: tagsInput,
        visibility,
        featured: canPublish ? featured : false,
        linkedEventId: linkedEventId || '',
        status: targetStatus,
      };

      let savedPost: ClubBlogPost;
      if (editingPostId) {
        const res = await apiFetch<{ blogPost: ClubBlogPost }>(
          `/api/clubs/${club.clubId}/blog-posts/${editingPostId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );
        savedPost = res.blogPost;
      } else {
        const res = await apiFetch<{ blogPost: ClubBlogPost }>(
          `/api/clubs/${club.clubId}/blog-posts`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        savedPost = res.blogPost;
      }

      setComposerOpen(false);
      resetComposer();
      setNotice(
        savedPost.status === 'Published'
          ? `Published "${savedPost.title}" to the ${club.shortCode} Club Blog.`
          : savedPost.status === 'In Review'
            ? `Submitted "${savedPost.title}" for officer review.`
            : `Saved draft "${savedPost.title}".`
      );
      await loadBlogPosts();
      if (onRefreshParent) await onRefreshParent();
      if (savedPost.status === 'Published') {
        setActivePostId(savedPost.blogPostId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save club blog article.');
    } finally {
      setSaving(false);
    }
  };

  const saveTaxonomyUpdate = async (
    payload: {
      categories?: string[];
      curatedTags?: string[];
      renameCategory?: { from: string; to: string };
      renameTag?: { from: string; to: string };
    },
    successMessage: string
  ) => {
    setTaxonomyBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch<{ taxonomy: ClubBlogTaxonomy; blogPosts: ClubBlogPost[] }>(
        `/api/clubs/${club.clubId}/blog-taxonomy`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );
      setTaxonomy(res.taxonomy);
      setPosts(res.blogPosts ?? []);
      setNotice(successMessage);
      if (onRefreshParent) await onRefreshParent();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update blog categories and tags.');
      return false;
    } finally {
      setTaxonomyBusy(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryInput.trim();
    if (clean.length < 2) {
      setError('Category name must be at least 2 characters.');
      return;
    }
    if (availableCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setError(`Category "${clean}" already exists.`);
      return;
    }
    const ok = await saveTaxonomyUpdate(
      { categories: [...availableCategories, clean] },
      `Added blog category "${clean}".`
    );
    if (ok) setNewCategoryInput('');
  };

  const handleRemoveCategory = async (catToRemove: string) => {
    if (CORE_BLOG_CATEGORIES.includes(catToRemove)) return;
    const nextCats = (taxonomy?.categories ?? availableCategories).filter((c) => c !== catToRemove);
    const ok = await saveTaxonomyUpdate(
      { categories: nextCats },
      `Removed custom category "${catToRemove}" (any existing posts were moved to News).`
    );
    if (ok && categoryFilter === catToRemove) {
      setCategoryFilter('ALL');
    }
    if (ok && category === catToRemove) {
      setCategory('News');
    }
  };

  const handleCommitRenameCategory = async (oldCat: string) => {
    const cleanTo = renameCategoryValue.trim();
    if (cleanTo.length < 2) {
      setError('Updated category name must be at least 2 characters.');
      return;
    }
    const ok = await saveTaxonomyUpdate(
      {
        categories: taxonomy?.categories ?? availableCategories,
        renameCategory: { from: oldCat, to: cleanTo },
      },
      `Renamed category "${oldCat}" to "${cleanTo}" across club blog posts.`
    );
    if (ok) {
      if (categoryFilter === oldCat) setCategoryFilter(cleanTo);
      if (category === oldCat) setCategory(cleanTo);
      setRenamingCategory(null);
      setRenameCategoryValue('');
    }
  };

  const handleAddCuratedTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeTagLabel(newTagInput);
    if (clean.length < 2) {
      setError('Topic tag must be at least 2 characters.');
      return;
    }
    if (availableTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setError(`Topic tag "#${clean}" is already in the club tag list.`);
      return;
    }
    const baseTags = taxonomy?.curatedTags ?? availableTags;
    const ok = await saveTaxonomyUpdate(
      { curatedTags: [...baseTags, clean] },
      `Added curated topic tag "#${clean}".`
    );
    if (ok) setNewTagInput('');
  };

  const handleRemoveCuratedTag = async (tagToRemove: string) => {
    const baseTags = taxonomy?.curatedTags ?? availableTags;
    const ok = await saveTaxonomyUpdate(
      { curatedTags: baseTags.filter((t) => t !== tagToRemove) },
      `Removed "#${tagToRemove}" from curated quick-select tags.`
    );
    if (ok && tagFilter === tagToRemove) {
      setTagFilter('ALL');
    }
  };

  const handleCommitRenameTag = async (oldTag: string) => {
    const cleanTo = normalizeTagLabel(renameTagValue);
    if (cleanTo.length < 2) {
      setError('Updated tag name must be at least 2 characters.');
      return;
    }
    const baseTags = taxonomy?.curatedTags ?? availableTags;
    const ok = await saveTaxonomyUpdate(
      {
        curatedTags: baseTags,
        renameTag: { from: oldTag, to: cleanTo },
      },
      `Renamed tag "#${oldTag}" to "#${cleanTo}" across club blog posts.`
    );
    if (ok) {
      if (tagFilter === oldTag) setTagFilter(cleanTo);
      setRenamingTag(null);
      setRenameTagValue('');
    }
  };

  const handleQuickCategoryChange = async (post: ClubBlogPost, nextCategory: BlogPostCategory) => {
    if (post.category === nextCategory) return;
    setBusyPostId(post.blogPostId);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch<{ blogPost: ClubBlogPost }>(
        `/api/clubs/${club.clubId}/blog-posts/${post.blogPostId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ category: nextCategory }),
        }
      );
      setPosts((prev) =>
        prev.map((item) => (item.blogPostId === post.blogPostId ? res.blogPost : item))
      );
      setNotice(`Labeled "${res.blogPost.title}" as ${res.blogPost.category}.`);
      if (onRefreshParent) await onRefreshParent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update post category label.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleQuickStatusChange = async (post: ClubBlogPost, nextStatus: BlogPostStatus, confirmed = false) => {
    if (nextStatus === 'Published' && !confirmed) {
      setPublicationConfirmation({ title: 'Confirm blog audience', description: `Audience: ${post.visibility}. ${post.visibility === 'Public Campus' ? 'Anyone visiting the public campus directory may read this article.' : 'This article is intended for signed-in members of this club.'}`, preview: `${post.title}\n\n${post.excerpt || post.bodyMarkdown}`, confirmLabel: 'Confirm blog publication', onConfirm: () => { setPublicationConfirmation(null); void handleQuickStatusChange(post, nextStatus, true); } });
      return;
    }
    setBusyPostId(post.blogPostId);
    setError('');
    setNotice('');
    try {
      const res = await apiFetch<{ blogPost: ClubBlogPost }>(
        `/api/clubs/${club.clubId}/blog-posts/${post.blogPostId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      setPosts((prev) =>
        prev.map((item) => (item.blogPostId === post.blogPostId ? res.blogPost : item))
      );
      setNotice(
        nextStatus === 'Published'
          ? `Published "${res.blogPost.title}" to the club blog.`
          : `Updated "${res.blogPost.title}" to ${nextStatus}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update article status.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleToggleFeatured = async (post: ClubBlogPost) => {
    setBusyPostId(post.blogPostId);
    setError('');
    try {
      const res = await apiFetch<{ blogPost: ClubBlogPost }>(
        `/api/clubs/${club.clubId}/blog-posts/${post.blogPostId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ featured: !post.featured }),
        }
      );
      setPosts((prev) =>
        prev.map((item) => (item.blogPostId === post.blogPostId ? res.blogPost : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update featured status.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleDeletePost = async (post: ClubBlogPost) => {
    setBusyPostId(post.blogPostId);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/clubs/${club.clubId}/blog-posts/${post.blogPostId}`, {
        method: 'DELETE',
      });
      setPosts((prev) => prev.filter((item) => item.blogPostId !== post.blogPostId));
      if (activePostId === post.blogPostId) setActivePostId(null);
      setNotice(`Removed "${post.title}" from the club blog.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete blog article.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleToggleLike = async (post: ClubBlogPost) => {
    try {
      const res = await apiFetch<{ blogPost: ClubBlogPost }>(
        `/api/clubs/${club.clubId}/blog-posts/${post.blogPostId}/like`,
        { method: 'POST' }
      );
      setPosts((prev) =>
        prev.map((item) => (item.blogPostId === post.blogPostId ? res.blogPost : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update reaction.');
    }
  };

  const handleAddComment = async (e: React.FormEvent, post: ClubBlogPost) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setCommentBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ blogPost: ClubBlogPost }>(
        `/api/clubs/${club.clubId}/blog-posts/${post.blogPostId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ body: commentInput.trim() }),
        }
      );
      setPosts((prev) =>
        prev.map((item) => (item.blogPostId === post.blogPostId ? res.blogPost : item))
      );
      setCommentInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post comment.');
    } finally {
      setCommentBusy(false);
    }
  };

  const availableCategories = useMemo(() => {
    const base = taxonomy?.categories ?? DEFAULT_BLOG_CATEGORIES;
    const fromPosts = posts.map((p) => p.category).filter(Boolean);
    const merged = Array.from(new Set([...CORE_BLOG_CATEGORIES, ...base, ...fromPosts]));
    return merged;
  }, [taxonomy?.categories, posts]);

  const availableTags = useMemo(() => {
    const curated = taxonomy?.curatedTags ?? [];
    const fromPosts = posts.flatMap((p) => p.tags ?? []).filter(Boolean);
    return Array.from(new Set([...curated, ...fromPosts])).sort((a, b) => a.localeCompare(b));
  }, [taxonomy?.curatedTags, posts]);

  const selectedComposerTags = useMemo(() => parseTagsList(tagsInput), [tagsInput]);

  const toggleComposerTag = (tagToToggle: string) => {
    const current = parseTagsList(tagsInput);
    const exists = current.some((t) => t.toLowerCase() === tagToToggle.toLowerCase());
    const next = exists
      ? current.filter((t) => t.toLowerCase() !== tagToToggle.toLowerCase())
      : [...current, tagToToggle].slice(0, 8);
    setTagsInput(next.join(', '));
  };

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (
        tagFilter !== 'ALL' &&
        !p.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      ) {
        return false;
      }
      if (statusFilter === 'Published' && p.status !== 'Published') return false;
      if (statusFilter === 'Drafts' && p.status !== 'Draft' && p.status !== 'In Review') {
        return false;
      }
      if (statusFilter === 'Archived' && p.status !== 'Archived') return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.subtitle ?? '').toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, searchQuery, categoryFilter, tagFilter, statusFilter]);

  const activePost = useMemo(
    () => (activePostId ? posts.find((p) => p.blogPostId === activePostId) ?? null : null),
    [posts, activePostId]
  );

  const publishedCount = posts.filter((p) => p.status === 'Published').length;
  const reviewCount = posts.filter((p) => p.status === 'Draft' || p.status === 'In Review').length;

  const canModifyPost = (post: ClubBlogPost) =>
    canPublish || (canDraft && post.authorUserId === session?.user.userId && post.status !== 'Published');

  return (
    <div className="space-y-6">
      <ActionConfirmation action={publicationConfirmation} onCancel={() => setPublicationConfirmation(null)} />
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <ClubLogoMark
            clubId={club.clubId}
            clubShortCode={club.shortCode}
            clubName={club.name}
            logoUrl={club.logoUrl}
            accentColor={club.accentColor}
            size="md"
          />
          <div className="min-w-0 space-y-1">
            <div className="text-xs font-medium text-slate-500">
              {club.shortCode} · Official Club Blog · {formatRoleLabel(effectiveRole)}
            </div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#004B87] shrink-0" />
              <span className="truncate">{club.name} — Blog &amp; Editorial Hub</span>
            </h1>
            <p className="text-xs text-slate-600">
              Publish event recaps, member spotlights, study guides, and club dispatches for{' '}
              <span className="font-mono-tabular font-semibold text-slate-800">
                {publishedCount}
              </span>{' '}
              published stories
              {canDraft && reviewCount > 0 ? (
                <>
                  {' '}
                  ·{' '}
                  <span className="font-mono-tabular font-semibold text-amber-700">
                    {reviewCount} in draft/review
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {clubOptions && clubOptions.length > 1 && onSelectClub && (
            <select
              value={club.clubId}
              onChange={(e) => onSelectClub(e.target.value)}
              aria-label="Select club blog workspace"
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
            >
              {clubOptions.map((opt) => (
                <option key={opt.clubId} value={opt.clubId}>
                  {opt.name} ({opt.shortCode})
                </option>
              ))}
            </select>
          )}
          {canPublish && (
            <button
              type="button"
              onClick={() => setShowTaxonomyManager((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer ${
                showTaxonomyManager
                  ? 'bg-sky-50 text-[#004B87] border-[#004B87]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Categories &amp; Tags</span>
            </button>
          )}
          {canDraft && (
            <button
              type="button"
              onClick={() => (composerOpen ? setComposerOpen(false) : openNewComposer())}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>{composerOpen ? 'Close Editor' : 'Write Blog Post'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {notice}
        </div>
      )}

      {/* Category & Tag Management Panel (Club Leads / Editors / Admins) */}
      {showTaxonomyManager && canPublish && (
        <section
          aria-label="Blog Category and Tag Management"
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#004B87]" />
                <span>Blog Category &amp; Tag Management · {club.shortCode}</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Organize club editorial labels around core categories (News, Event Recap, Member
                Spotlight), custom series, and curated topic tags. Renaming updates existing posts
                automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTaxonomyManager(false)}
              aria-label="Close category and tag manager"
              className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-300 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Categories Column */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Blog Categories ({availableCategories.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Core defaults: News · Event Recap · Member Spotlight
                </span>
              </div>

              <form onSubmit={(e) => void handleAddCategory(e)} className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Add custom category (e.g., Hackathon Dispatch)"
                  aria-label="New blog category name"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
                <button
                  type="submit"
                  disabled={taxonomyBusy || !newCategoryInput.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </form>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {availableCategories.map((cat) => {
                  const isCore = CORE_BLOG_CATEGORIES.includes(cat);
                  const count = posts.filter((p) => p.category === cat).length;
                  const isEditing = renamingCategory === cat;
                  return (
                    <div
                      key={cat}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs bg-white"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={renameCategoryValue}
                            onChange={(e) => setRenameCategoryValue(e.target.value)}
                            aria-label={`Rename category ${cat}`}
                            className="flex-1 px-2.5 py-1 text-xs border border-[#004B87] rounded focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={taxonomyBusy}
                            onClick={() => void handleCommitRenameCategory(cat)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-[#004B87] rounded cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingCategory(null);
                              setRenameCategoryValue('');
                            }}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-slate-900 truncate">{cat}</span>
                            <span className="text-[11px] font-mono-tabular text-slate-500">
                              {count} post{count === 1 ? '' : 's'}
                            </span>
                            {isCore && (
                              <span className="text-[11px] text-[#004B87] font-medium">
                                · Core label
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isCore && (
                              <>
                                <button
                                  type="button"
                                  disabled={taxonomyBusy}
                                  onClick={() => {
                                    setRenamingCategory(cat);
                                    setRenameCategoryValue(cat);
                                  }}
                                  className="text-[11px] font-medium text-slate-600 hover:text-[#004B87] cursor-pointer"
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  disabled={taxonomyBusy}
                                  onClick={() => void handleRemoveCategory(cat)}
                                  aria-label={`Remove category ${cat}`}
                                  className="text-slate-400 hover:text-red-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Curated Topic Tags Column */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  Topic Tags ({availableTags.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Quick-selectable by authors in the editor
                </span>
              </div>

              <form onSubmit={(e) => void handleAddCuratedTag(e)} className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Add topic tag (e.g., Spring Gala, AI Ethics)"
                  aria-label="New curated topic tag"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
                <button
                  type="submit"
                  disabled={taxonomyBusy || !newTagInput.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tag</span>
                </button>
              </form>

              {availableTags.length === 0 ? (
                <p className="text-xs text-slate-500 border border-dashed border-slate-200 rounded-md p-4">
                  No topic tags configured yet. Add tags above for fast tagging across posts.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md max-h-64 overflow-y-auto">
                  {availableTags.map((tag) => {
                    const count = posts.filter((p) =>
                      p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
                    ).length;
                    const isCurated = (taxonomy?.curatedTags ?? []).includes(tag);
                    const isEditing = renamingTag === tag;
                    return (
                      <div
                        key={tag}
                        className="px-3.5 py-2 flex items-center justify-between gap-2 text-xs bg-white"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={renameTagValue}
                              onChange={(e) => setRenameTagValue(e.target.value)}
                              aria-label={`Rename tag ${tag}`}
                              className="flex-1 px-2.5 py-1 text-xs border border-[#004B87] rounded focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={taxonomyBusy}
                              onClick={() => void handleCommitRenameTag(tag)}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-[#004B87] rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingTag(null);
                                setRenameTagValue('');
                              }}
                              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-medium text-slate-900 truncate">
                                #{tag}
                              </span>
                              <span className="text-[11px] font-mono-tabular text-slate-500">
                                {count} post{count === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={taxonomyBusy}
                                onClick={() => {
                                  setRenamingTag(tag);
                                  setRenameTagValue(tag);
                                }}
                                className="text-[11px] font-medium text-slate-600 hover:text-[#004B87] cursor-pointer"
                              >
                                Rename
                              </button>
                              {isCurated && (
                                <button
                                  type="button"
                                  disabled={taxonomyBusy}
                                  onClick={() => void handleRemoveCuratedTag(tag)}
                                  aria-label={`Remove curated tag ${tag}`}
                                  className="text-slate-400 hover:text-red-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Article Composer / Editor */}
      {composerOpen && canDraft && (
        <section
          aria-label="Club blog article composer"
          className="bg-white border border-[#004B87] rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-slate-200 bg-sky-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {editingPostId ? 'Edit Club Blog Article' : `Compose New Article · ${club.shortCode}`}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Contributors submit drafts for officer review; Club Leads and Editors can publish
                immediately to the club blog and Public Campus Directory.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-md">
                <button
                  type="button"
                  onClick={() => setComposerTab('write')}
                  className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                    composerTab === 'write'
                      ? 'bg-[#004B87] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setComposerTab('preview')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                    composerTab === 'preview'
                      ? 'bg-[#004B87] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  resetComposer();
                }}
                aria-label="Close blog editor"
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-300 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {composerTab === 'preview' ? (
            <div className="p-6 space-y-5">
              <BlogCoverVisual
                coverImageUrl={coverImageUrl || undefined}
                coverImageAlt={coverImageAlt || title}
                title={title || 'Untitled Club Article'}
                clubShortCode={club.shortCode}
                accentColor={club.accentColor}
              />
              <div className="space-y-2 max-w-3xl">
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#004B87]">{category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{visibility}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {Math.max(1, Math.round((bodyMarkdown.trim().split(/\s+/).filter(Boolean).length || 60) / 180))}{' '}
                    min read
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {title || 'Untitled Club Article'}
                </h3>
                {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
                {selectedComposerTags.length > 0 && (
                  <div className="text-xs font-mono text-slate-500">
                    {selectedComposerTags.map((t) => `#${t}`).join(' · ')}
                  </div>
                )}
                {excerpt && (
                  <p className="text-xs text-slate-500 border-b border-slate-100 pb-3">{excerpt}</p>
                )}
                <BlogMarkdownBody
                  content={bodyMarkdown || 'Start writing in the editor tab to see a live preview.'}
                />
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Article Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Highlights from Our Fall AI Club Meeting"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Subtitle / Standfirst (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="One-sentence deck summarizing the takeaway for CUNY SPS readers"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BlogPostCategory)}
                    aria-label="Blog article category"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Quick label:</span>
                    {CORE_BLOG_CATEGORIES.map((coreCat) => (
                      <button
                        key={coreCat}
                        type="button"
                        onClick={() => setCategory(coreCat)}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded border cursor-pointer transition-colors ${
                          category === coreCat
                            ? 'bg-[#004B87] text-white border-[#004B87]'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-[#004B87]'
                        }`}
                      >
                        {coreCat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Audience Visibility
                  </label>
                  <select
                    aria-label="Article audience"
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(e.target.value as 'Public Campus' | 'Club Members Only')
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  >
                    <option value="Public Campus">Public Campus (Visible in Campus Directory)</option>
                    <option value="Club Members Only">Club Members Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Link Related Club Event (Optional)
                  </label>
                  <select
                    value={linkedEventId}
                    onChange={(e) => setLinkedEventId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  >
                    <option value="">None</option>
                    {events.map((ev) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {ev.date} · {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Topic Tags (Comma-separated or click below · max 8)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="AI Ethics, Student Projects, Recap"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                  {availableTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {availableTags.map((tag) => {
                        const isSelected = selectedComposerTags.some(
                          (t) => t.toLowerCase() === tag.toLowerCase()
                        );
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleComposerTag(tag)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#004B87] text-white border-[#004B87]'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#004B87]'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Image Upload & URL */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <ImagePlus className="w-3.5 h-3.5 text-[#004B87]" />
                      <span>Article Cover Banner (Optional)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Upload a photo (resized cleanly to 16:9) or paste an HTTPS URL. Leave blank for
                      a club-branded editorial header.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => void handleCoverUpload(e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-slate-300 hover:border-[#004B87] rounded-md cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingCover ? 'Processing...' : 'Upload Photo'}</span>
                    </button>
                    {coverImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageUrl('');
                          setCoverImageAlt('');
                        }}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-red-700 bg-white border border-slate-300 rounded-md cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://... or /assets/... (or upload above)"
                    aria-label="Cover image URL"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                  <input
                    type="text"
                    value={coverImageAlt}
                    onChange={(e) => setCoverImageAlt(e.target.value)}
                    placeholder="Accessible image alt description (recommended)"
                    aria-label="Cover image alt text"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Summary / Excerpt (Optional — auto-generated from opening paragraph if blank)
                </label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="A concise 1-2 sentence summary shown in the blog feed..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Article Body (Supports `## Headings`, `- Bullet lists`, `&gt; Quotes`, and `**Bold**`)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet('## Section Heading')}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                    >
                      + Heading
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet('- Key takeaway point')}
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                    >
                      + Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertMarkdownSnippet('> "Member or speaker quote here." — Name, Role')
                      }
                      className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                    >
                      + Quote
                    </button>
                  </div>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  rows={9}
                  required
                  value={bodyMarkdown}
                  onChange={(e) => setBodyMarkdown(e.target.value)}
                  placeholder="Write your article here. Separate paragraphs with a blank line..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87] font-sans leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                {canPublish ? (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="rounded border-slate-300 text-[#004B87] focus:ring-[#004B87]"
                    />
                    <span>Pin as Featured Story on club blog</span>
                  </label>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Submissions go to Club Leads or Editors for final publishing sign-off.
                  </span>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerOpen(false);
                      resetComposer();
                    }}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSubmitArticle('Draft')}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md cursor-pointer"
                  >
                    Save Draft
                  </button>
                  {!canPublish ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSubmitArticle('In Review')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{saving ? 'Submitting...' : 'Submit for Review'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSubmitArticle('Published')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{saving ? 'Publishing...' : 'Publish to Club Blog'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Full Article Reader View */}
      {activePost ? (
        <article className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActivePostId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#004B87] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {club.shortCode} Blog</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <StatusText status={activePost.status} />
              {canPublish && (
                <select
                  value={activePost.category}
                  disabled={busyPostId === activePost.blogPostId}
                  onChange={(e) => void handleQuickCategoryChange(activePost, e.target.value)}
                  aria-label="Label article category"
                  className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#004B87]"
                >
                  {Array.from(new Set([...availableCategories, activePost.category])).map((cat) => (
                    <option key={cat} value={cat}>
                      Label: {cat}
                    </option>
                  ))}
                </select>
              )}
              {onShareToSocialStudio && activePost.status === 'Published' && canPublish && (
                <button
                  type="button"
                  onClick={() => onShareToSocialStudio(activePost)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004B87] bg-white border border-[#004B87] hover:bg-sky-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Promote to Social Post</span>
                </button>
              )}
              {canModifyPost(activePost) && (
                <button
                  type="button"
                  onClick={() => openEditComposer(activePost)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>

          <BlogCoverVisual
            coverImageUrl={activePost.coverImageUrl}
            coverImageAlt={activePost.coverImageAlt}
            title={activePost.title}
            clubShortCode={activePost.clubShortCode}
            accentColor={activePost.clubAccentColor}
          />

          <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            <header className="space-y-3 border-b border-slate-100 pb-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter(activePost.category);
                    setActivePostId(null);
                  }}
                  className="font-semibold text-[#004B87] hover:underline cursor-pointer"
                >
                  {activePost.category}
                </button>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{activePost.readingTimeMinutes} min read</span>
                <span aria-hidden="true">·</span>
                <span>{activePost.visibility}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  {new Date(activePost.publishedAt ?? activePost.updatedAt).toLocaleDateString()}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {activePost.title}
              </h2>
              {activePost.subtitle && (
                <p className="text-base text-slate-600">{activePost.subtitle}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <ClubLogoMark
                    clubId={activePost.clubId}
                    clubShortCode={activePost.clubShortCode}
                    clubName={activePost.clubName}
                    logoUrl={activePost.clubLogoUrl}
                    accentColor={activePost.clubAccentColor}
                    size="sm"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900">{activePost.authorName}</div>
                    <div className="text-slate-500">
                      {activePost.authorRoleLabel} · {activePost.clubName}
                    </div>
                  </div>
                </div>

                {activePost.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                    {activePost.tags.map((tag, idx) => (
                      <React.Fragment key={tag}>
                        {idx > 0 && <span aria-hidden="true">·</span>}
                        <button
                          type="button"
                          onClick={() => {
                            setTagFilter(tag);
                            setActivePostId(null);
                          }}
                          className="hover:text-[#004B87] hover:underline cursor-pointer"
                        >
                          #{tag}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </header>

            {activePost.linkedEventTitle && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-2.5 text-xs text-slate-700">
                <CalendarDays className="w-4 h-4 text-[#004B87] shrink-0" />
                <span>
                  Related Club Event:{' '}
                  <strong className="font-semibold text-slate-900">
                    {activePost.linkedEventTitle}
                  </strong>
                </span>
              </div>
            )}

            <BlogMarkdownBody content={activePost.bodyMarkdown} />

            {/* Reactions & Actions Bar */}
            <div className="pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleToggleLike(activePost)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors ${
                    session && activePost.likedByUserIds.includes(session.user.userId)
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      session && activePost.likedByUserIds.includes(session.user.userId)
                        ? 'fill-rose-600 text-rose-600'
                        : ''
                    }`}
                  />
                  <span className="font-mono-tabular">
                    {activePost.likedByUserIds.length} Appreciate
                  </span>
                </button>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono-tabular">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>
                    {activePost.comments.length} comment
                    {activePost.comments.length === 1 ? '' : 's'}
                  </span>
                </span>
              </div>

              {canPublish && activePost.status !== 'Published' && (
                <button
                  type="button"
                  disabled={busyPostId === activePost.blogPostId}
                  onClick={() => void handleQuickStatusChange(activePost, 'Published')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve &amp; Publish</span>
                </button>
              )}
            </div>

            {/* Member Discussion & Comments */}
            <section className="pt-4 border-t border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Club Member Discussion ({activePost.comments.length})
              </h3>

              <form
                onSubmit={(e) => void handleAddComment(e, activePost)}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Share a reflection, question, or follow-up resource with club members..."
                  aria-label="Add a comment to this club blog article"
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                />
                <button
                  type="submit"
                  disabled={commentBusy || !commentInput.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{commentBusy ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </form>

              {activePost.comments.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No member comments yet. Start the conversation above.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-slate-50/40">
                  {activePost.comments.map((cmt) => (
                    <div key={cmt.commentId} className="p-3.5 space-y-1 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-900">{cmt.authorName}</span>{' '}
                          <span className="text-slate-500">· {cmt.authorRoleLabel}</span>
                        </div>
                        <span className="font-mono-tabular text-[11px] text-slate-400">
                          {new Date(cmt.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{cmt.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </article>
      ) : (
        <>
          {/* Filter & Discoverability Toolbar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
                {(
                  [
                    { id: 'ALL', label: `All (${posts.length})` },
                    { id: 'Published', label: `Published (${publishedCount})` },
                    ...(canDraft
                      ? [
                          { id: 'Drafts' as const, label: `Drafts & Review (${reviewCount})` },
                          {
                            id: 'Archived' as const,
                            label: `Archived (${posts.filter((p) => p.status === 'Archived').length})`,
                          },
                        ]
                      : []),
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles, categories, tags..."
                    aria-label="Search club blog articles"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004B87]"
                  />
                </div>

                {(categoryFilter !== 'ALL' ||
                  tagFilter !== 'ALL' ||
                  searchQuery.trim() !== '' ||
                  statusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('ALL');
                      setTagFilter('ALL');
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="text-xs font-medium text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Category Filter Buttons */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 mr-1">Categories:</span>
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  categoryFilter === 'ALL'
                    ? 'bg-[#004B87] text-white border-[#004B87]'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-[#004B87]'
                }`}
              >
                All ({posts.length})
              </button>
              {availableCategories.map((cat) => {
                const count = posts.filter((p) => p.category === cat).length;
                if (!CORE_BLOG_CATEGORIES.includes(cat) && count === 0) return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#004B87] text-white border-[#004B87]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-[#004B87]'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Interactive Topic Tag Filter Strip */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 mr-1">Tags:</span>
                <button
                  type="button"
                  onClick={() => setTagFilter('ALL')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    tagFilter === 'ALL'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  All Tags
                </button>
                {availableTags.map((tag) => {
                  const isActive = tagFilter.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagFilter(isActive ? 'ALL' : tag)}
                      className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#004B87] text-white border-[#004B87]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#004B87]'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Blog Feed Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-800">
                No blog articles match your current view
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Start publishing News, Event Recaps, and Member Spotlights for {club.name}.
              </p>
              {canDraft && (
                <button
                  type="button"
                  onClick={openNewComposer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] rounded-md cursor-pointer"
                >
                  <PenSquare className="w-3.5 h-3.5" />
                  <span>Write First Blog Article</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPosts.map((post) => {
                const isBusy = busyPostId === post.blogPostId;
                const userLiked = Boolean(session && post.likedByUserIds.includes(session.user.userId));
                return (
                  <article
                    key={post.blogPostId}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => setActivePostId(post.blogPostId)}
                        className="block w-full text-left cursor-pointer"
                      >
                        <BlogCoverVisual
                          coverImageUrl={post.coverImageUrl}
                          coverImageAlt={post.coverImageAlt}
                          title={post.title}
                          clubShortCode={post.clubShortCode}
                          accentColor={post.clubAccentColor}
                          compact
                        />
                      </button>

                      <div className="p-5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCategoryFilter(post.category)}
                              className="font-semibold text-[#004B87] hover:underline cursor-pointer"
                            >
                              {post.category}
                            </button>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">{post.readingTimeMinutes} min read</span>
                            {post.featured && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  <span>Featured</span>
                                </span>
                              </>
                            )}
                          </div>
                          <StatusText status={post.status} />
                        </div>

                        <button
                          type="button"
                          onClick={() => setActivePostId(post.blogPostId)}
                          className="block text-left text-base font-bold text-slate-900 hover:text-[#004B87] leading-snug cursor-pointer"
                        >
                          {post.title}
                        </button>

                        {post.subtitle && (
                          <p className="text-xs font-medium text-slate-700">{post.subtitle}</p>
                        )}

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>

                        <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>By {post.authorName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {new Date(post.publishedAt ?? post.updatedAt).toLocaleDateString()}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{post.visibility}</span>
                        </div>

                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500">
                            {post.tags.slice(0, 4).map((tag, idx) => (
                              <React.Fragment key={tag}>
                                {idx > 0 && <span aria-hidden="true">·</span>}
                                <button
                                  type="button"
                                  onClick={() => setTagFilter(tag)}
                                  className="hover:text-[#004B87] hover:underline cursor-pointer"
                                >
                                  #{tag}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <button
                          type="button"
                          onClick={() => void handleToggleLike(post)}
                          className={`inline-flex items-center gap-1 font-mono-tabular cursor-pointer ${
                            userLiked ? 'text-rose-600 font-semibold' : 'hover:text-slate-900'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${userLiked ? 'fill-rose-600 text-rose-600' : ''}`}
                          />
                          <span>{post.likedByUserIds.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePostId(post.blogPostId)}
                          className="inline-flex items-center gap-1 font-mono-tabular hover:text-slate-900 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{post.comments.length}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePostId(post.blogPostId)}
                          className="text-xs font-semibold text-[#004B87] hover:underline whitespace-nowrap cursor-pointer"
                        >
                          Read Article →
                        </button>
                        {canPublish && post.status !== 'Published' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleQuickStatusChange(post, 'Published')}
                            className="text-xs font-medium text-emerald-700 hover:underline whitespace-nowrap cursor-pointer"
                          >
                            Publish
                          </button>
                        )}
                        {canPublish && post.status === 'Published' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleFeatured(post)}
                            className="text-xs font-medium text-slate-600 hover:text-[#004B87] whitespace-nowrap cursor-pointer"
                          >
                            {post.featured ? 'Unfeature' : 'Feature'}
                          </button>
                        )}
                        {canModifyPost(post) && (
                          <button
                            type="button"
                            onClick={() => openEditComposer(post)}
                            className="text-xs font-medium text-slate-600 hover:text-[#004B87] whitespace-nowrap cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        {(canPublish ||
                          (post.authorUserId === session?.user.userId && post.status !== 'Published')) && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeletePost(post)}
                            aria-label={`Delete ${post.title}`}
                            className="text-slate-400 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

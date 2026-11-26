import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Save, Upload, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Club } from '../../types';
import {
  CLUB_ACCENT_PRESETS,
  isAiClubEntity,
  isMsaClubEntity,
  readAndResizeClubLogoFile,
} from '../../utils/brandAssets';
import { ClubLogoMark } from '../BrandMarks';
import { StatusText } from '../StatusText';

interface ClubProfileEditorProps {
  club: Club;
  mode?: 'club' | 'admin';
  canEdit?: boolean;
  onSaved: (updatedClub: Club) => Promise<void> | void;
  onCancel?: () => void;
}

const CATEGORY_OPTIONS = [
  'Academic & Research',
  'Academic & STEM',
  'Arts, Media & Culture',
  'Business & Leadership',
  'Cultural & Identity',
  'Faith & Interfaith',
  'Health & Human Services',
  'Honor Societies',
  'Service & Advocacy',
  'Technology & Innovation',
  'Community & Culture',
];

export function ClubProfileEditor({
  club,
  mode = 'club',
  canEdit = true,
  onSaved,
  onCancel,
}: ClubProfileEditorProps) {
  const { apiFetch } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(club.name);
  const [shortCode, setShortCode] = useState(club.shortCode);
  const [category, setCategory] = useState(club.category);
  const [facultyAdvisor, setFacultyAdvisor] = useState(club.facultyAdvisor);
  const [tagline, setTagline] = useState(club.tagline ?? '');
  const [description, setDescription] = useState(club.description);
  const [meetingSchedule, setMeetingSchedule] = useState(club.meetingSchedule ?? '');
  const [contactEmail, setContactEmail] = useState(club.contactEmail ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(club.websiteUrl ?? '');
  const [logoUrl, setLogoUrl] = useState(club.logoUrl ?? '');
  const [accentColor, setAccentColor] = useState(club.accentColor ?? '#004B87');
  const [status, setStatus] = useState<Club['status']>(club.status);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setName(club.name);
    setShortCode(club.shortCode);
    setCategory(club.category);
    setFacultyAdvisor(club.facultyAdvisor);
    setTagline(club.tagline ?? '');
    setDescription(club.description);
    setMeetingSchedule(club.meetingSchedule ?? '');
    setContactEmail(club.contactEmail ?? '');
    setWebsiteUrl(club.websiteUrl ?? '');
    setLogoUrl(club.logoUrl ?? '');
    setAccentColor(club.accentColor ?? '#004B87');
    setStatus(club.status);
    setError('');
    setNotice('');
  }, [club]);

  const categoryChoices = CATEGORY_OPTIONS.includes(category)
    ? CATEGORY_OPTIONS
    : [category, ...CATEGORY_OPTIONS];

  const hasBuiltInEmblem =
    isAiClubEntity(club.clubId, club.shortCode, club.name) ||
    isMsaClubEntity(club.clubId, club.shortCode, club.name);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImage(true);
    setError('');
    setNotice('');
    try {
      const dataUrl = await readAndResizeClubLogoFile(file, 256);
      setLogoUrl(dataUrl);
      setNotice('Profile picture preview ready. Click "Save Club Profile" to apply across the Hub.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process selected image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const endpoint =
        mode === 'admin' ? `/api/admin/clubs/${club.clubId}` : `/api/clubs/${club.clubId}`;
      const bodyPayload: Record<string, unknown> = {
        name: name.trim(),
        shortCode: shortCode.trim(),
        category: category.trim(),
        facultyAdvisor: facultyAdvisor.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        meetingSchedule: meetingSchedule.trim(),
        contactEmail: contactEmail.trim(),
        websiteUrl: websiteUrl.trim(),
        logoUrl: logoUrl.trim(),
        accentColor,
      };
      if (mode === 'admin') {
        bodyPayload.status = status;
      }

      const res = await apiFetch<{ club: Club }>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(bodyPayload),
      });
      setNotice('Club profile picture and workspace details saved across the Hub.');
      await onSaved(res.club);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save club profile updates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ClubLogoMark
            clubId={club.clubId}
            clubShortCode={shortCode}
            clubName={name}
            logoUrl={logoUrl || undefined}
            accentColor={accentColor}
            size="md"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              Edit Club Profile Picture &amp; Workspace Components
            </h2>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono">{shortCode || club.shortCode}</span>
              <span aria-hidden="true">·</span>
              <StatusText status={mode === 'admin' ? status : club.status} />
            </div>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:text-slate-900 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
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

        {/* Section 1: Club Profile Picture & Theme Accent */}
        <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ClubLogoMark
                clubId={club.clubId}
                clubShortCode={shortCode}
                clubName={name}
                logoUrl={logoUrl || undefined}
                accentColor={accentColor}
                size="lg"
              />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-900">
                  Club Profile Picture / Emblem
                </div>
                <p className="text-[11px] text-slate-500">
                  Shown in the club workspace header, navigation bar, Student Life directory, and public event listings.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => void handleFileChange(e)}
                    className="hidden"
                    disabled={!canEdit}
                  />
                  <button
                    type="button"
                    disabled={!canEdit || uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? 'Processing...' : 'Upload Photo'}</span>
                  </button>
                  {(logoUrl || hasBuiltInEmblem) && (
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => {
                        setLogoUrl(hasBuiltInEmblem && logoUrl !== '__none__' ? '__none__' : '');
                        setNotice('');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {logoUrl && logoUrl !== '__none__'
                          ? hasBuiltInEmblem
                            ? 'Reset Default Emblem'
                            : 'Use Monogram Badge'
                          : hasBuiltInEmblem && logoUrl === '__none__'
                            ? 'Restore Official Seal'
                            : 'Use Monogram Badge'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Or Paste Profile Picture URL
              </label>
              <div className="relative">
                <ImagePlus className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  disabled={!canEdit}
                  value={logoUrl === '__none__' ? '' : logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... or /assets/..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-100 focus:outline-none focus:border-[#004B87]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Badge &amp; Monogram Accent Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {CLUB_ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    disabled={!canEdit}
                    title={preset.name}
                    aria-label={`Set club accent color to ${preset.name}`}
                    onClick={() => setAccentColor(preset.hex)}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer disabled:opacity-50 ${
                      accentColor.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-slate-900 scale-110'
                        : 'border-white ring-1 ring-slate-300'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  disabled={!canEdit}
                  aria-label="Custom club accent color"
                  value={/^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#004B87'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-7 h-7 p-0.5 bg-white border border-slate-300 rounded cursor-pointer disabled:opacity-50"
                />
                <span className="text-[11px] font-mono text-slate-500">{accentColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Editable Club Identity, Advisor & Schedule Components */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Official Organization Name
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Short Code
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                disabled={!canEdit}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
              >
                {categoryChoices.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tagline / Header Subtitle
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., Student-led workshops, open projects & campus fellowship"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Faculty / Staff Advisor
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={facultyAdvisor}
              onChange={(e) => setFacultyAdvisor(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Regular Meeting Schedule &amp; Location
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={meetingSchedule}
              onChange={(e) => setMeetingSchedule(e.target.value)}
              placeholder="e.g., Thursdays · 6:30 PM ET · Zoom & 119 W 31st St"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Club Contact Email
            </label>
            <input
              type="email"
              disabled={!canEdit}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="club@spsmail.cuny.edu"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
            />
          </div>

          <div className={mode === 'admin' ? '' : 'md:col-span-2'}>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Club Website / Link Hub URL
            </label>
            <input
              type="url"
              disabled={!canEdit}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://sps.cuny.edu/..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
            />
          </div>

          {mode === 'admin' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Workspace Governance Status
              </label>
              <select
                disabled={!canEdit}
                value={status}
                onChange={(e) => setStatus(e.target.value as Club['status'])}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
              >
                <option value="Active">Active</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Suspended">Suspended</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Organization Description &amp; Mission
            </label>
            <textarea
              rows={3}
              required
              disabled={!canEdit}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md disabled:bg-slate-50 focus:outline-none focus:border-[#004B87]"
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004B87] hover:bg-[#003865] disabled:opacity-50 rounded-md whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Profile...' : 'Save Club Profile'}</span>
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

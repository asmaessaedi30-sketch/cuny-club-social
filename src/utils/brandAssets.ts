export const STUDENT_LIFE_LOGO_URL = '/assets/aistudio/concept_idea_2_final-01_a0d17aff.png';
export const AI_CLUB_LOGO_URL = '/assets/aistudio/c40622e2-7fb5-4f17-b219-706c74628073_ba47136b.jpg';
export const MSA_CLUB_LOGO_URL = '/assets/aistudio/CUNY_SPS_MSA_Crescent_Badge_afa3c1dd.png';
export const HUB_LOGO_SHEET_URL = '/assets/aistudio/Club_Social_Hub_-_Logo_Sheet_352913ad.jpg';
export const HUB_MARK_SVG_URL = './club-social-hub-mark.svg';
export const HUB_LOCKUP_DARK_SVG_URL = './club-social-hub-lockup-dark.svg';
export const HUB_LOCKUP_LIGHT_SVG_URL = './club-social-hub-lockup-light.svg';

export const HUB_BRAND_PALETTE = [
  { name: 'Ink', hex: '#0B0B0F', role: 'Primary Dark Surface & Wordmark' },
  { name: 'Paper', hex: '#F4F4F2', role: 'Inverse Light Canvas' },
  { name: 'Signal Lime', hex: '#C4F500', role: 'Hub Node & Period Accent' },
  { name: 'CUNY Navy', hex: '#004B87', role: 'Institutional Governance Primary' },
] as const;

export const CLUB_ACCENT_PRESETS = [
  { name: 'CUNY Navy', hex: '#004B87' },
  { name: 'Slate Ink', hex: '#0F172A' },
  { name: 'Teal', hex: '#0F766E' },
  { name: 'Cobalt', hex: '#1D4ED8' },
  { name: 'Indigo', hex: '#6D28D9' },
  { name: 'Amber Gold', hex: '#B45309' },
  { name: 'Crimson', hex: '#BE123C' },
] as const;

export function isAiClubEntity(
  clubId?: string | null,
  clubShortCode?: string | null,
  clubName?: string | null
): boolean {
  if (clubId === 'club-ai') return true;
  const code = (clubShortCode ?? '').trim().toUpperCase();
  if (code === 'AI-SPS' || code === 'AI-CLUB' || code === 'AI CLUB' || code === 'AICLUB') return true;
  const name = (clubName ?? '').trim().toLowerCase();
  if (name.includes('ai club') || name.includes('artificial intelligence')) return true;
  return false;
}

export function isMsaClubEntity(
  clubId?: string | null,
  clubShortCode?: string | null,
  clubName?: string | null
): boolean {
  if (clubId === 'club-msa') return true;
  const code = (clubShortCode ?? '').trim().toUpperCase();
  if (code === 'MSA' || code === 'CUNY-MSA' || code === 'CUNY SPS MSA') return true;
  const name = (clubName ?? '').trim().toLowerCase();
  if (
    name === 'cuny sps msa' ||
    name.includes('muslim student association') ||
    name.includes('muslim students association') ||
    /\bmsa\b/.test(name)
  ) {
    return true;
  }
  return false;
}

export function getClubLogoUrl(
  clubId?: string | null,
  clubShortCode?: string | null,
  clubName?: string | null,
  customLogoUrl?: string | null
): string | null {
  const custom = (customLogoUrl ?? '').trim();
  if (custom === '__none__') return null;
  if (custom) return custom;
  if (isAiClubEntity(clubId, clubShortCode, clubName)) {
    return AI_CLUB_LOGO_URL;
  }
  if (isMsaClubEntity(clubId, clubShortCode, clubName)) {
    return MSA_CLUB_LOGO_URL;
  }
  return null;
}

export function readAndResizeClubLogoFile(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WebP, or SVG).'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image file must be 5 MB or smaller.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.onload = () => {
      const rawResult = typeof reader.result === 'string' ? reader.result : '';
      if (!rawResult) {
        reject(new Error('Empty image file.'));
        return;
      }
      if (file.type === 'image/svg+xml' && rawResult.length < 180_000) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Unable to decode selected image.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawResult);
          return;
        }
        ctx.clearRect(0, 0, maxSize, maxSize);
        const minSide = Math.min(img.width, img.height);
        const sx = Math.max(0, (img.width - minSide) / 2);
        const sy = Math.max(0, (img.height - minSide) / 2);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
        const output = canvas.toDataURL('image/png', 0.92);
        resolve(output);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}

export function readAndResizeBlogCoverFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 675
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WebP, or SVG).'));
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      reject(new Error('Cover image file must be 6 MB or smaller.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read cover image file.'));
    reader.onload = () => {
      const rawResult = typeof reader.result === 'string' ? reader.result : '';
      if (!rawResult) {
        reject(new Error('Empty cover image file.'));
        return;
      }
      if (file.type === 'image/svg+xml' && rawResult.length < 220_000) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Unable to decode selected cover image.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawResult);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const output = canvas.toDataURL('image/jpeg', 0.86);
        resolve(output);
      };
      img.src = rawResult;
    };
    reader.readAsDataURL(file);
  });
}

export function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

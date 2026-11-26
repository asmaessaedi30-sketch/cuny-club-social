import React from 'react';
import { getClubLogoUrl, isMsaClubEntity, STUDENT_LIFE_LOGO_URL } from '../utils/brandAssets';

interface StudentLifeLogoProps {
  className?: string;
}

export function StudentLifeLogo({ className = 'h-10 w-auto' }: StudentLifeLogoProps) {
  return (
    <img
      src={STUDENT_LIFE_LOGO_URL}
      alt="CUNY SPS Office of Student Life"
      className={`object-contain shrink-0 select-none ${className}`}
    />
  );
}

export type HubLogoDirection = 'open-c' | 'orbit' | 'stack';
export type HubLogoSurface = 'ink' | 'paper' | 'signal' | 'bare-dark' | 'bare-light';

interface HubLogoMarkProps {
  variant?: HubLogoDirection;
  surface?: HubLogoSurface;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const HUB_SIZE_MAP: Record<NonNullable<HubLogoMarkProps['size']>, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function HubLogoMark({
  variant = 'open-c',
  surface = 'ink',
  size = 'md',
  className = '',
}: HubLogoMarkProps) {
  const sizeClass = HUB_SIZE_MAP[size];
  const isDarkTile = surface === 'ink' || surface === 'bare-light';
  const strokeColor =
    surface === 'signal' ? '#0B0B0F' : isDarkTile ? '#FFFFFF' : '#0B0B0F';
  const accentColor =
    surface === 'signal'
      ? '#0B0B0F'
      : isDarkTile
        ? '#C4F500'
        : '#B4E600';
  const tileBg =
    surface === 'ink'
      ? '#0B0B0F'
      : surface === 'paper'
        ? '#F4F4F2'
        : surface === 'signal'
          ? '#C4F500'
          : 'none';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="CUNY SPS Club Social Hub logo"
      className={`${sizeClass} shrink-0 select-none ${className}`}
    >
      {tileBg !== 'none' && (
        <rect
          width="64"
          height="64"
          rx="14"
          fill={tileBg}
          stroke={surface === 'paper' ? '#CBD5E1' : undefined}
          strokeWidth={surface === 'paper' ? '1.5' : undefined}
        />
      )}

      {variant === 'open-c' && (
        <>
          <path
            d="M 46.2 21.5 A 17.5 17.5 0 1 0 46.2 42.5"
            stroke={strokeColor}
            strokeWidth="6.5"
            strokeLinecap="butt"
          />
          <rect x="26.5" y="26.5" width="11" height="11" fill={accentColor} />
        </>
      )}

      {variant === 'orbit' && (
        <>
          <path
            d="M 19.5 22.8 A 17.5 17.5 0 0 1 44.5 22.8"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="butt"
          />
          <path
            d="M 48.2 28.5 A 17.5 17.5 0 0 1 35.8 49.0"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="butt"
          />
          <path
            d="M 28.2 49.0 A 17.5 17.5 0 0 1 15.8 28.5"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="butt"
          />
          <rect x="26.5" y="26.5" width="11" height="11" fill={accentColor} />
        </>
      )}

      {variant === 'stack' && (
        <>
          <rect x="14" y="15" width="36" height="8" rx="1" fill={strokeColor} />
          <rect x="14" y="28" width="25" height="8" rx="1" fill={strokeColor} />
          <rect x="14" y="41" width="14" height="8" rx="1" fill={accentColor} />
        </>
      )}
    </svg>
  );
}

interface HubLogoLockupProps {
  variant?: HubLogoDirection;
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
}

export function HubLogoLockup({
  variant = 'open-c',
  theme = 'light',
  size = 'md',
  showSubtitle = false,
  subtitle = 'CUNY SPS · Office of Student Life',
}: HubLogoLockupProps) {
  const isDark = theme === 'dark';
  const markSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  const textSize =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  const dotSize = size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5';

  return (
    <div className="inline-flex items-center gap-3 min-w-0 select-none">
      <HubLogoMark
        variant={variant}
        surface={isDark ? 'bare-light' : 'ink'}
        size={markSize}
      />
      <div className="min-w-0">
        <div
          className={`font-brand font-extrabold tracking-tight leading-none flex items-baseline gap-0.5 whitespace-nowrap ${textSize} ${
            isDark ? 'text-white' : 'text-[#0B0B0F]'
          }`}
        >
          <span>Club Social Hub</span>
          <span
            aria-hidden="true"
            className={`inline-block ${dotSize} ${
              isDark ? 'bg-[#C4F500]' : 'bg-[#A6D600]'
            }`}
          />
        </div>
        {showSubtitle && (
          <div
            className={`text-[11px] mt-1 whitespace-nowrap truncate ${
              isDark ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

interface ClubLogoMarkProps {
  clubId?: string | null;
  clubShortCode?: string | null;
  clubName?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<ClubLogoMarkProps['size']>, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-11 h-11 text-xs',
  lg: 'w-14 h-14 text-sm',
};

export function ClubLogoMark({
  clubId,
  clubShortCode,
  clubName,
  logoUrl: customLogoUrl,
  accentColor,
  size = 'md',
}: ClubLogoMarkProps) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const logoUrl = getClubLogoUrl(clubId, clubShortCode, clubName, customLogoUrl);
  const sizeClass = SIZE_CLASSES[size];
  const isMsa = isMsaClubEntity(clubId, clubShortCode, clubName);

  React.useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={`${clubName ?? 'Club'} profile picture`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 ${
          customLogoUrl ? 'bg-white' : isMsa ? 'bg-white' : 'bg-slate-950'
        } shrink-0 select-none`}
      />
    );
  }

  const initials = (clubShortCode || clubName || 'SPS')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase();

  const resolvedAccent =
    accentColor && /^#[0-9a-fA-F]{3,8}$/.test(accentColor) ? accentColor : undefined;

  return (
    <div
      aria-hidden="true"
      style={
        resolvedAccent
          ? { backgroundColor: resolvedAccent, borderColor: resolvedAccent, color: '#FFFFFF' }
          : undefined
      }
      className={`${sizeClass} rounded-full border ${
        resolvedAccent ? '' : 'border-slate-200 bg-slate-100 text-[#004B87]'
      } font-mono font-bold flex items-center justify-center shrink-0 select-none`}
    >
      {initials || 'SPS'}
    </div>
  );
}

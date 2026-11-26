import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Users,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Clock,
  MapPin,
  Mail,
  Shield,
  Sparkles,
  Share2,
  CheckCircle2,
  Globe,
  Menu,
  X,
  Lock,
  ChevronRight,
  ChevronLeft,
  Filter,
  Check,
  Star,
  BookOpen,
  Newspaper,
  Compass,
  HelpCircle,
  Smartphone,
  Download,
  RefreshCw,
  Plus,
  CalendarCheck,
  CalendarPlus
} from 'lucide-react';
import {
  CLUBS_DATA,
  EVENTS_DATA,
  ALL_CATEGORIES,
  ClubDiscoveryItem,
  DiscoveryEvent,
  ClubChannel
} from '../data/clubDiscoveryData';
import { ClubLogoMark, StudentLifeLogo } from './BrandMarks';
import {
  CUNY_SPS_CALENDAR_LINKS,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadSingleEventIcs,
  downloadAllEventsIcs,
  isEventUpcoming,
  getEventDateBadge,
  loadCustomEvents,
  saveCustomEvent
} from '../utils/schoolCalendarSync';
import { campusDate, shiftCalendarDate } from '../utils/calendarDates';

// Recognizable Brand SVG Icons
function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.16C10.57 20.16 9.13 19.76 7.87 19.01L7.57 18.83L4.45 19.65L5.28 16.61L5.08 16.29C4.26 14.99 3.82 13.47 3.82 11.91C3.82 7.38 7.51 3.69 12.05 3.69C14.25 3.69 16.31 4.55 17.86 6.11C19.42 7.66 20.27 9.72 20.27 11.92C20.27 16.46 16.58 20.16 12.05 20.16ZM16.56 14.37C16.31 14.25 15.1 13.65 14.88 13.57C14.65 13.48 14.49 13.44 14.33 13.69C14.16 13.93 13.7 14.48 13.55 14.64C13.41 14.81 13.27 14.83 13.02 14.71C12.77 14.58 11.97 14.32 11.02 13.48C10.28 12.82 9.78 12.01 9.64 11.76C9.5 11.52 9.62 11.38 9.75 11.26C9.86 11.15 10 10.97 10.12 10.83C10.25 10.69 10.29 10.58 10.37 10.42C10.45 10.25 10.41 10.11 10.35 9.99C10.29 9.86 9.8 8.66 9.6 8.17C9.4 7.69 9.2 7.76 9.05 7.75C8.91 7.74 8.75 7.74 8.58 7.74C8.42 7.74 8.16 7.8 7.93 8.05C7.71 8.3 7.08 8.89 7.08 10.09C7.08 11.29 7.95 12.45 8.08 12.61C8.2 12.78 9.8 15.24 12.26 16.3C12.85 16.55 13.3 16.7 13.66 16.82C14.25 17.01 14.78 16.98 15.2 16.92C15.68 16.85 16.66 16.32 16.87 15.75C17.07 15.17 17.07 14.68 17.01 14.58C16.95 14.48 16.81 14.42 16.56 14.37Z" />
    </svg>
  );
}

function TikTokIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.11V9.36a6.34 6.34 0 0 0-.79-.05A6.33 6.33 0 0 0 3 15.64 6.33 6.33 0 0 0 9.33 22a6.33 6.33 0 0 0 6.33-6.33V9.08a8.28 8.28 0 0 0 4.88 1.58V7.2a4.83 4.83 0 0 1-.95-.51z" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function LinkedInIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

export function StudentDiscoveryApp() {
  // Navigation: 'home' | 'clubs' | 'events' | 'club-profile' | 'resources'
  const [currentTab, setCurrentTab] = useState<'home' | 'clubs' | 'events' | 'club-profile' | 'resources'>('home');
  const [selectedClubId, setSelectedClubId] = useState<string>('club-ai');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [eventSearch, setEventSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Live Campus Date & 11:59 PM Daily Rollover State
  const [currentCampusDate, setCurrentCampusDate] = useState<string>(() => campusDate());
  const [eventsFilter, setEventsFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [customEvents, setCustomEvents] = useState<DiscoveryEvent[]>(() => loadCustomEvents());
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Live');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [calendarToast, setCalendarToast] = useState<string | null>(null);

  // Event submission form inputs
  const [newEventClubId, setNewEventClubId] = useState<string>('club-ai');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(() => campusDate());
  const [newEventTime, setNewEventTime] = useState('7:00 PM');
  const [newEventFormat, setNewEventFormat] = useState('Virtual');
  const [newEventLocation, setNewEventLocation] = useState('Zoom (Virtual)');
  const [newEventUrl, setNewEventUrl] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  // PWA beforeinstallprompt handler & install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
      const isIos = /iphone|ipad|ipod/.test(userAgent);
      if (isIos) {
        setShowIosPrompt(true);
      } else {
        alert('To install CUNY SPS Club Social Hub:\n\n• On Chrome/Edge (Desktop): Click the Install icon in your browser address bar.\n• On Android: Tap menu (⋮) and select "Add to Home screen" or "Install app".\n• On iOS (Safari): Tap Share (⎋) and select "Add to Home Screen".');
      }
    }
  };

  // Automated 11:59 PM Rollover: Checks current date in America/New_York
  useEffect(() => {
    const checkRollover = () => {
      const today = campusDate();
      setCurrentCampusDate((prev) => (prev !== today ? today : prev));
    };

    // Check every 10 seconds to catch the exact moment 11:59:59 PM turns into 12:00:00 AM
    const interval = setInterval(checkRollover, 10000);

    // Also check on tab focus / wake
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkRollover();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', checkRollover);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', checkRollover);
      }
    };
  }, []);

  // Sync hash routing on mount
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('club/')) {
        const cid = hash.replace('club/', '');
        const found = CLUBS_DATA.find((c) => c.clubId === cid);
        if (found) {
          setSelectedClubId(cid);
          setCurrentTab('club-profile');
        }
      } else if (hash === 'clubs') {
        setCurrentTab('clubs');
      } else if (hash === 'events') {
        setCurrentTab('events');
      } else if (hash === 'resources') {
        setCurrentTab('resources');
      } else if (hash === 'home' || hash === '') {
        setCurrentTab('home');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = (tab: 'home' | 'clubs' | 'events' | 'club-profile' | 'resources', clubId?: string) => {
    if (tab === 'club-profile' && clubId) {
      setSelectedClubId(clubId);
      window.location.hash = `club/${clubId}`;
    } else {
      window.location.hash = tab;
    }
    setCurrentTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedClub = useMemo(() => {
    return CLUBS_DATA.find((c) => c.clubId === selectedClubId) || CLUBS_DATA[0];
  }, [selectedClubId]);

  // Filtered clubs for directory
  const filteredClubs = useMemo(() => {
    return CLUBS_DATA.filter((club) => {
      const matchesSearch =
        !searchQuery.trim() ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' || club.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  // Combined list of custom submitted events and base EVENTS_DATA
  const allEvents = useMemo(() => {
    const combined = [...customEvents, ...EVENTS_DATA];
    const seen = new Set<string>();
    return combined.filter((ev) => {
      if (seen.has(ev.eventId)) return false;
      seen.add(ev.eventId);
      return true;
    });
  }, [customEvents]);

  // Upcoming events: strictly on or after currentCampusDate (passed 11:59 PM are rolled off)
  const upcomingEvents = useMemo(() => {
    return allEvents
      .filter((ev) => isEventUpcoming(ev, currentCampusDate))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents, currentCampusDate]);

  // Past events: strictly before currentCampusDate
  const pastEvents = useMemo(() => {
    return allEvents
      .filter((ev) => !isEventUpcoming(ev, currentCampusDate))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allEvents, currentCampusDate]);

  // Filtered events based on active tab ('upcoming' | 'past' | 'all') and search
  const filteredEvents = useMemo(() => {
    let pool =
      eventsFilter === 'upcoming'
        ? upcomingEvents
        : eventsFilter === 'past'
        ? pastEvents
        : allEvents.slice().sort((a, b) => a.date.localeCompare(b.date));

    if (!eventSearch.trim()) return pool;
    const q = eventSearch.toLowerCase();
    return pool.filter((ev) => {
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.clubName.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.format.toLowerCase().includes(q)
      );
    });
  }, [eventsFilter, upcomingEvents, pastEvents, allEvents, eventSearch]);

  const clubEvents = useMemo(() => {
    return allEvents.filter((ev) => ev.clubId === selectedClub.clubId);
  }, [allEvents, selectedClub.clubId]);

  const featuredClubs = useMemo(() => {
    return CLUBS_DATA.filter((c) => c.isFeatured);
  }, []);

  const upcomingPreviewEvents = useMemo(() => {
    return upcomingEvents.slice(0, 3);
  }, [upcomingEvents]);

  // Dynamic upcoming event (Screen 2: Next Up on Campus)
  const liveNextEvent = useMemo(() => {
    return upcomingEvents[0] || allEvents[0] || null;
  }, [upcomingEvents, allEvents]);

  // Calendar Sync Action
  const handleSyncSchoolCalendar = () => {
    setCalendarSyncStatus('syncing');
    setTimeout(() => {
      const latestCustom = loadCustomEvents();
      setCustomEvents(latestCustom);
      const today = campusDate();
      setCurrentCampusDate(today);
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date());
      setLastSyncTime(`Just now (${timeStr} EST)`);
      setCalendarSyncStatus('synced');
      setCalendarToast('Synced with CUNY SPS School Calendar & OpenLab!');
      setTimeout(() => setCalendarToast(null), 3500);
      setTimeout(() => setCalendarSyncStatus('idle'), 2500);
    }, 600);
  };

  // Download all events as .ics
  const handleDownloadAllIcs = () => {
    const targetEvents = upcomingEvents.length > 0 ? upcomingEvents : allEvents;
    downloadAllEventsIcs(targetEvents);
    setCalendarToast(`Downloaded ${targetEvents.length} events (.ics) to your calendar!`);
    setTimeout(() => setCalendarToast(null), 3500);
  };

  // Download single event as .ics
  const handleDownloadSingleIcs = (ev: DiscoveryEvent) => {
    downloadSingleEventIcs(ev);
    setCalendarToast(`Calendar invite downloaded for "${ev.title}"!`);
    setTimeout(() => setCalendarToast(null), 3000);
  };

  // Submit and add a new event directly
  const handleAddNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) return;

    const matchedClub = CLUBS_DATA.find((c) => c.clubId === newEventClubId) || CLUBS_DATA[0];
    const newEvent: DiscoveryEvent = {
      eventId: `event-custom-${Date.now()}`,
      clubId: matchedClub.clubId,
      clubName: matchedClub.name,
      title: newEventTitle.trim(),
      description: newEventDescription.trim() || `Official meeting for ${matchedClub.name} on CUNY SPS Campus.`,
      date: newEventDate,
      time: newEventTime.trim() || '7:00 PM',
      format: newEventFormat,
      location: newEventLocation.trim() || 'Zoom (Virtual)',
      url: newEventUrl.trim() || CUNY_SPS_CALENDAR_LINKS.openlabStudentLife,
    };

    const updated = saveCustomEvent(newEvent);
    setCustomEvents(updated);
    setShowAddEventModal(false);

    // Reset inputs
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventUrl('');

    setCalendarToast(`Event "${newEvent.title}" added to calendar!`);
    setTimeout(() => setCalendarToast(null), 4000);
  };

  const handleShareClub = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-[#C4F500] selection:text-slate-950 overflow-x-hidden">
      {/* TOP HEADER NAVIGATION (Permanently visible and accessible across all screen sizes) */}
      <header
        className="fixed sm:sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Burger Menu Button & Brand Mark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="px-2.5 py-1.5 text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors font-bold text-xs"
              aria-label="Open navigation menu"
              title="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-slate-900" />
              <span className="text-xs font-bold text-slate-900 sm:hidden">Menu</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C4F500] rounded-lg p-1 min-w-0"
              aria-label="CUNY SPS Club Social Hub Home"
            >
              <img
                src="./club-social-hub-mark.svg"
                alt="Club Social Hub logo"
                className="w-9 h-9 rounded-xl shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                width="36"
                height="36"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                    Club Social Hub
                  </span>
                  <span className="w-2 h-2 rounded-xs bg-[#C4F500] shrink-0 inline-block" title="Official Hub" />
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate hidden sm:block">CUNY SPS Student Life</p>
              </div>
            </button>
          </div>

          {/* Center: Desktop Quick Navigation Tabs (Instant 1-click access without clutter) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60" aria-label="Quick Navigation">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'home'
                  ? 'bg-[#0B0B0F] text-[#C4F500] shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('clubs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'clubs' || currentTab === 'club-profile'
                  ? 'bg-[#0B0B0F] text-[#C4F500] shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <span>Explore Clubs</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                currentTab === 'clubs' || currentTab === 'club-profile'
                  ? 'bg-[#C4F500]/20 text-[#C4F500]'
                  : 'bg-slate-200 text-slate-700'
              }`}>34</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('events')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'events'
                  ? 'bg-[#0B0B0F] text-[#C4F500] shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <span>Campus Events</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                currentTab === 'events'
                  ? 'bg-[#C4F500]/20 text-[#C4F500]'
                  : 'bg-slate-200 text-slate-700'
              }`}>{EVENTS_DATA.length}</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('resources')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'resources'
                  ? 'bg-[#0B0B0F] text-[#C4F500] shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              OpenLab Resources
            </button>
          </nav>

          {/* Right: Search, Install App, and Student Networks */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('clubs')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold border border-slate-200/80 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Find Clubs</span>
            </button>

            {/* PWA Install Button */}
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0B0B0F] hover:bg-slate-800 text-[#C4F500] text-xs font-bold shadow-2xs transition-colors cursor-pointer border border-slate-800"
                title="Install Progressive Web App on Phone or Desktop"
                aria-label="Install App as PWA"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#C4F500]" />
                <span className="hidden xs:inline">Install App</span>
                <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#C4F500] text-slate-950">PWA</span>
              </button>
            )}



            {/* Official Student Networks on Desktop Header */}
            <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <a
                href="https://www.linkedin.com/school/cuny-school-of-professional-studies/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg text-[11px] font-semibold transition-colors"
                title="CUNY SPS Student LinkedIn"
              >
                <LinkedInIcon className="w-3.5 h-3.5 fill-white shrink-0" />
                <span className="truncate">Student LinkedIn</span>
              </a>
              <a
                href="https://www.facebook.com/cunysps/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1877F2] hover:bg-[#0d65d9] text-white rounded-lg text-[11px] font-semibold transition-colors"
                title="CUNY SPS Facebook"
              >
                <FacebookIcon className="w-3.5 h-3.5 fill-white shrink-0" />
                <span className="truncate">SPS Facebook</span>
              </a>
            </div>
          </div>
        </div>
      </header>

          {/* Main Content Area */}
          <main className="flex-1 pt-16 sm:pt-0 pb-20 lg:pb-12">
            {/* ========================================================================= */}
            {/* SCREEN 1: HOME                                                            */}
            {/* ========================================================================= */}
            {currentTab === 'home' && (
              <div className="space-y-12 pb-16">
                {/* Hero Section with Uploaded Authentic CUNY Student Community Photo */}
                <section
                  className="relative bg-cover bg-center bg-no-repeat text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[520px] flex items-center justify-center"
                  style={{ backgroundImage: "url('./img/hero-cuny-students.jpg')" }}
                >
                  {/* High-contrast gradient scrim ensuring text legibility and cinematic depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/70 to-slate-950/90 backdrop-blur-[0.5px]" />
                  <div className="absolute inset-0 bg-radial from-transparent via-slate-950/30 to-slate-950/70 pointer-events-none" />

                  {/* Ambient Golden & Violet Glow Orbs */}
                  <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
                  <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C4F500]/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />

                  <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0B0B0F]/80 border border-[#C4F500]/30 rounded-full text-xs font-semibold text-[#C4F500] backdrop-blur-md shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#C4F500] animate-ping" />
                      <span className="text-[#C4F500] font-bold">Club Social Hub</span>
                      <span className="text-slate-400">·</span>
                      <span>CUNY SPS Student Life Platform</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-50 to-amber-200 drop-shadow-md">
                      Find your next club at CUNY SPS
                    </h1>

                    <p className="text-base sm:text-xl font-bold text-[#C4F500] tracking-tight drop-shadow-sm">
                      Your student life, all in one place.
                    </p>

                    <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow-sm">
                      Connect with fellow online and hybrid students, join active WhatsApp groups, participate in civic tech builds, and find your community across 34 recognized organizations.
                    </p>

                    {/* Primary Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => navigateTo('clubs')}
                        className="w-full sm:w-auto px-7 py-3.5 min-h-[48px] bg-[#C4F500] hover:bg-[#b8e800] text-slate-950 font-extrabold text-base rounded-xl shadow-lg shadow-[#C4F500]/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 group border border-[#d4ff1a]"
                      >
                        <span>Explore clubs</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('events')}
                        className="w-full sm:w-auto px-6 py-3.5 min-h-[48px] bg-white/15 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/25 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Calendar className="w-4 h-4 text-white/80" />
                        <span>View upcoming events</span>
                      </button>
                    </div>

                    {/* Trust & Engagement Stats */}
                    <div className="pt-8 grid grid-cols-3 gap-2 border-t border-white/15 max-w-lg mx-auto text-center">
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white">34</div>
                        <div className="text-[11px] sm:text-xs text-slate-300 font-medium">Active Clubs</div>
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white">{upcomingEvents.length}</div>
                        <div className="text-[11px] sm:text-xs text-slate-300 font-medium">Upcoming Events</div>
                      </div>
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-[#C4F500]">100%</div>
                        <div className="text-[11px] sm:text-xs text-slate-300 font-medium">Online Friendly</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ========================================================================= */}
                {/* SCREENSHOT 2: AI CLUB SPOTLIGHT & NEXT UP ON CAMPUS                       */}
                {/* ========================================================================= */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  <h2 className="sr-only">Featured Student Clubs</h2>

                  {/* TILE 1: Spotlit Featured Organization: AI Club */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                            <img src="./club-logos/ai-club.jpg" alt="Artificial Intelligence Club logo" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B0B0F] text-[#C4F500] border border-black">
                                <Sparkles className="w-3 h-3 text-[#C4F500] animate-pulse" />
                                Spotlight Club
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active Verified
                              </span>
                              <img src="./img/ai-club-seal.jpg" alt="AI Club Seal" className="w-5 h-5 rounded-full border border-slate-200 shadow-2xs inline-block" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                              Artificial Intelligence Club
                            </h3>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600 shadow-2xs">
                          Academic &amp; Technology
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                        Student-led organization dedicated to helping CUNY SPS students of all backgrounds explore artificial intelligence, hands-on technical projects, and ethical innovation.
                      </p>

                      {/* Direct Social Channels on Bento Spotlight */}
                      <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <a
                          href="https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                          <span>Join WhatsApp</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                        <a
                          href="https://www.instagram.com/cuny_sps_ai_club/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                        >
                          <InstagramIcon className="w-3.5 h-3.5 fill-white" />
                          <span>Instagram (@cuny_sps_ai_club)</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                        <a
                          href="https://openlab.sps.cuny.edu/groups/ai-club/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-all cursor-pointer border border-slate-200 shadow-2xs"
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-600" />
                          <span>Visit OpenLab Hub</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-700" />
                        Welcomes all students · Zero prerequisites
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateTo('club-profile', 'club-ai')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0B0B0F] hover:bg-slate-800 px-4 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        <span>Explore AI Club Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* TILE 2: Live Upcoming Event Radar (Dynamic next event) */}
                  <div className="bg-gradient-to-br from-[#0B0B0F] via-[#14141C] to-[#0B0B0F] rounded-3xl border border-white/10 p-6 sm:p-7 text-white shadow-md relative overflow-hidden flex flex-col justify-between">

                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#C4F500]/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C4F500]/15 text-[#C4F500] border border-[#C4F500]/30">
                          <Clock className="w-3 h-3 text-[#C4F500]" />
                          Next Up on Campus
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          {liveNextEvent?.date || 'Upcoming'}
                        </span>
                      </div>

                      <h4 className="text-base sm:text-xl font-bold text-white leading-snug">
                        {liveNextEvent?.title || 'Campus Event'}
                      </h4>

                      <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-3xl">
                        Upcoming event hosted by {liveNextEvent?.clubName || 'CUNY SPS'} on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#C4F500] shrink-0" />
                          <span>{liveNextEvent?.time} EST · {liveNextEvent?.format}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#C4F500] shrink-0" />
                          <span className="truncate">{liveNextEvent?.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 relative z-10">
                      <button
                        type="button"
                        onClick={() => navigateTo('events')}
                        className="w-full py-2.5 px-3 bg-[#C4F500] hover:bg-[#b8e800] text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>View All {upcomingEvents.length} Upcoming Events</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </section>

                {/* ========================================================================= */}
                {/* SCREENSHOT 4: CALENDAR HIGHLIGHTS                                         */}
                {/* ========================================================================= */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-gradient-to-br from-[#0B0B0F] via-[#14141C] to-[#0B0B0F] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#C4F500]">
                          Calendar Highlights
                        </span>
                        <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">Upcoming Campus Events</h2>
                        <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                          Open to all enrolled students. Times shown in New York campus time (EST).
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => navigateTo('events')}
                          className="text-xs sm:text-sm font-semibold text-[#C4F500] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View all events ({upcomingEvents.length})</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <a
                          href="https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#C4F500]" />
                          <span>Student Life Calendar</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {upcomingPreviewEvents.map((ev) => (
                        <div
                          key={ev.eventId}
                          className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:bg-white/10 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs text-[#C4F500] mb-2 font-mono">
                              <span>{ev.date}</span>
                              <span>{ev.time} EST</span>
                            </div>
                            <h4 className="font-bold text-white text-sm sm:text-base leading-snug">{ev.title}</h4>
                            <p className="text-xs text-slate-300 mt-1">
                              Hosted by {ev.clubName}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2">
                              <MapPin className="w-3.5 h-3.5 text-[#C4F500] shrink-0" />
                              <span>{ev.format} · {ev.location}</span>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => navigateTo('club-profile', ev.clubId)}
                              className="text-xs font-semibold text-[#C4F500] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View {ev.clubName.split(' ')[0]} Profile</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ========================================================================= */}
                {/* SCREENSHOT 3: SCHOOL PORTALS (OPENLAB & STUDENT LIFE)                     */}
                {/* ========================================================================= */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  {/* Digital Student Commons Card */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B0B0F] text-[#C4F500] border border-black">
                          <Globe className="w-3 h-3 text-[#C4F500]" />
                          CUNY SPS OpenLab Hub
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">Official Student Platform</span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                        Digital Student Commons
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl">
                        Connect, collaborate, and share creative and academic work across degree programs on CUNY SPS OpenLab.
                      </p>

                      <div className="mt-5 space-y-2.5">
                        <a
                          href="https://openlab.sps.cuny.edu/groups/type/club/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                              <Compass className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-900">OpenLab Student Organizations</div>
                              <div className="text-[11px] sm:text-xs text-slate-500">Browse official club groups and member directories</div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                        </a>

                        <a
                          href="https://openlab.sps.cuny.edu/groups/the-kiosk/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                              <Newspaper className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-900">The Kiosk Student Publication</div>
                              <div className="text-[11px] sm:text-xs text-slate-500">Official student newspaper, creative articles &amp; essays</div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                        </a>

                        <a
                          href="https://openlab.sps.cuny.edu/sps-open-road/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-900">CUNY SPS Open Road</div>
                              <div className="text-[11px] sm:text-xs text-slate-500">Community news, spotlight stories &amp; updates</div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                        </a>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Hosted by CUNY SPS</span>
                      <a
                        href="https://openlab.sps.cuny.edu/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-slate-900 hover:text-black font-bold inline-flex items-center gap-1 group"
                      >
                        <span>Visit OpenLab Main Site</span>
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>

                  {/* Office of Student Life Card */}
                  <div className="bg-gradient-to-br from-[#0B0B0F] via-[#14141C] to-[#0B0B0F] rounded-3xl border border-white/10 p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#C4F500]/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C4F500]/15 text-[#C4F500] border border-[#C4F500]/30">
                          <Shield className="w-3 h-3 text-[#C4F500]" />
                          Office of Student Life
                        </span>
                        <span className="text-xs text-slate-400">Co-Curricular &amp; Leadership Hub</span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                        Accessible Leadership &amp; Community Engagement
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                        Providing our diverse student population with accessible co-curricular and academic enrichment opportunities to develop leadership skills and community beyond the classroom.
                      </p>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a
                          href="https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-[#C4F500]/15 text-[#C4F500] flex items-center justify-center shrink-0 border border-[#C4F500]/30">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-[#C4F500] flex items-center gap-1">
                              <span>Student Clubs &amp; Orgs Directory</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Official Student Life Recognized Orgs</div>
                          </div>
                        </a>

                        <a
                          href="https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-[#C4F500]/15 text-[#C4F500] flex items-center justify-center shrink-0 border border-[#C4F500]/30">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-[#C4F500] flex items-center gap-1">
                              <span>Student Life Calendar</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Official schedule of all student life events</div>
                          </div>
                        </a>

                        <a
                          href="mailto:studentlife@sps.cuny.edu"
                          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">
                              <span>Contact Student Life</span>
                              <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">studentlife@sps.cuny.edu</div>
                          </div>
                        </a>

                        <a
                          href="https://openlab.sps.cuny.edu/help-documentation/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-400/30">
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 flex items-center gap-1">
                              <span>Help &amp; Student Guides</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">OpenLab guides and FAQs</div>
                          </div>
                        </a>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 relative z-10">
                      <span>CUNY School of Professional Studies</span>
                      <a
                        href="https://sps.cuny.edu/student-services/student-life"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#C4F500] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Official Student Life Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 2: CLUB DIRECTORY                                                 */}
            {/* ========================================================================= */}
            {currentTab === 'clubs' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Page Header */}
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-[#0B0B0F] text-[#C4F500] border border-black rounded-full mb-2">
                    <span>Student Directory</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    CUNY SPS Student Organizations
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                    Browse all 34 recognized student clubs. Search by name, category, or interests to find your community and join their official communication channels.
                  </p>
                </div>

                {/* Fast Search & Category Chips */}
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search clubs by name, category, topic, or keyword..."
                      className="w-full pl-11 pr-10 py-3 text-sm bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0F] focus:border-transparent min-h-[44px]"
                      aria-label="Search clubs by name or keyword"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Category filters">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[36px] flex items-center gap-1 ${selectedCategory === cat
                          ? 'bg-[#0B0B0F] text-[#C4F500] font-bold shadow-xs border border-black'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-slate-900'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results Counter */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-3">
                  <span>
                    Showing <strong className="text-slate-900 font-semibold">{filteredClubs.length}</strong> of{' '}
                    {CLUBS_DATA.length} clubs
                  </span>
                  {(searchQuery || selectedCategory !== 'All') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                {/* Club Cards Grid */}
                {filteredClubs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClubs.map((club) => (
                      <article
                        key={club.clubId}
                        className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-400 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
                      >
                        <div>
                          {/* Top Header: Monogram/Logo, Name, ShortCode */}
                          <div className="flex items-start gap-3.5 mb-3">
                            {club.logoUrl ? (
                              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                <img
                                  src={club.logoUrl}
                                  alt={`${club.name} logo`}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                                style={{ backgroundColor: club.accentColor }}
                              >
                                {club.shortCode}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                                  {club.category}
                                </span>
                              </div>
                              <h2 className="font-bold text-slate-900 text-base leading-snug mt-1 truncate">
                                {club.name}
                              </h2>
                              <p className="text-[11px] text-slate-500 truncate">
                                {club.contactEmail}
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mt-2">
                            {club.description}
                          </p>

                          {/* Direct Verified Social & Group Channels */}
                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">
                                {club.channels.length > 0 ? 'Verified Channels' : 'Social Channels'}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                                Active Club
                              </span>
                            </div>

                            {club.channels.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {club.channels.map((ch, idx) => {
                                  const isWhatsApp = ch.platform === 'whatsapp';
                                  const isTikTok = ch.platform === 'tiktok';
                                  const isFacebook = ch.platform === 'facebook';
                                  const isInstagram = ch.platform === 'instagram';
                                  const isLinkedIn = ch.platform === 'linkedin';

                                  const badgeStyle = isWhatsApp
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : isTikTok
                                      ? 'bg-slate-900 hover:bg-black text-white'
                                      : isFacebook
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : isInstagram
                                          ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white'
                                          : isLinkedIn
                                            ? 'bg-sky-700 hover:bg-sky-800 text-white'
                                            : 'bg-slate-800 hover:bg-slate-900 text-white';

                                  return (
                                    <a
                                      key={idx}
                                      href={ch.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={`${ch.actionLabel} (${ch.badge}) - Opens external link`}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-102 focus-visible:outline-2 ${badgeStyle}`}
                                    >
                                      {isWhatsApp && <WhatsAppIcon className="w-3.5 h-3.5" />}
                                      {isTikTok && <TikTokIcon className="w-3 h-3" />}
                                      {isFacebook && <FacebookIcon className="w-3.5 h-3.5" />}
                                      {isInstagram && <InstagramIcon className="w-3.5 h-3.5" />}
                                      {isLinkedIn && <LinkedInIcon className="w-3.5 h-3.5" />}
                                      {!isWhatsApp && !isTikTok && !isFacebook && !isInstagram && !isLinkedIn && (
                                        <Globe className="w-3.5 h-3.5" />
                                      )}
                                      <span>{ch.actionLabel}</span>
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>No public links verified yet</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Primary "View club" Action */}
                        <div className="mt-5 pt-2">
                          <button
                            type="button"
                            onClick={() => navigateTo('club-profile', club.clubId)}
                            className="w-full min-h-[44px] py-2.5 px-4 bg-[#0B0B0F] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer group"
                          >
                            <span>View club</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
                    <Search className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-900 text-base">No clubs found</h3>
                    <p className="text-xs text-slate-500">
                      No clubs matched your search "{searchQuery}". Try selecting "All" categories or searching another term.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 3: CLUB PROFILE                                                    */}
            {/* ========================================================================= */}
            {currentTab === 'club-profile' && selectedClub && (
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Back Navigation Bar */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => navigateTo('clubs')}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 hover:text-black px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to club directory</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareClub}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedLink ? 'Link copied!' : 'Share profile'}</span>
                  </button>
                </div>

                {/* Club Hero Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {selectedClub.logoUrl ? (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                        <img
                          src={selectedClub.logoUrl}
                          alt={`${selectedClub.name} logo`}
                          className="w-full h-full object-contain"
                          loading="eager"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shrink-0 shadow-md"
                        style={{ backgroundColor: selectedClub.accentColor }}
                      >
                        {selectedClub.shortCode}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800">
                          {selectedClub.category}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Active Recognized Club
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        {selectedClub.name}
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>CUNY SPS Chartered Student Organization</span>
                        <span>·</span>
                        <a href="mailto:studentservices@sps.cuny.edu" className="text-slate-700 font-bold hover:underline">Office of Student Life</a>
                      </p>
                    </div>
                  </div>

                  {/* Who It Welcomes Callout (Required in Build Specs) */}
                  <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0B0B0F] text-[#C4F500] border border-[#C4F500]/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Who We Welcome</h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                          {selectedClub.whoItWelcomes}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* What the Club Does (About) */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                      About the Organization
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {selectedClub.description}
                    </p>
                  </div>
                </div>

                {/* PROMINENT CHANNELS SECTION (Core Goal of Redesign) */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Direct Communication Channels</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Connect & Join Our Online Groups
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Open direct external links to join student chats, watch video recaps, or follow official social pages.
                    </p>
                  </div>

                  {/* Action Buttons Grid */}
                  {selectedClub.channels && selectedClub.channels.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedClub.channels.map((ch, idx) => {
                        const isWhatsApp = ch.platform === 'whatsapp';
                        const isTikTok = ch.platform === 'tiktok';
                        const isFacebook = ch.platform === 'facebook';
                        const isInstagram = ch.platform === 'instagram';
                        const isLinkedIn = ch.platform === 'linkedin';

                        // Style configuration per platform
                        const buttonStyles = isWhatsApp
                          ? 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-200'
                          : isTikTok
                            ? 'bg-[#010101] hover:bg-[#1a1a1a] text-white shadow-slate-300'
                            : isFacebook
                              ? 'bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-blue-200'
                              : isInstagram
                                ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 text-white shadow-pink-200'
                                : isLinkedIn
                                  ? 'bg-[#0A66C2] hover:bg-[#095196] text-white shadow-sky-200'
                                  : 'bg-[#0B0B0F] hover:bg-slate-800 text-white shadow-slate-300';

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ch.badge === 'Verified Official Link'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                                    }`}
                                >
                                  {ch.badge}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 capitalize">
                                  {ch.platform}
                                </span>
                              </div>

                              <h4 className="font-bold text-slate-900 text-sm">
                                {ch.actionLabel}
                              </h4>
                              {ch.description && (
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                  {ch.description}
                                </p>
                              )}
                            </div>

                            {/* Direct External Link Button */}
                            <a
                              href={ch.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`w-full py-3 px-4 min-h-[48px] rounded-xl font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer ${buttonStyles}`}
                            >
                              {isWhatsApp && <WhatsAppIcon className="w-5 h-5" />}
                              {isTikTok && <TikTokIcon className="w-5 h-5" />}
                              {isFacebook && <FacebookIcon className="w-5 h-5" />}
                              {isInstagram && <InstagramIcon className="w-5 h-5" />}
                              {isLinkedIn && <LinkedInIcon className="w-5 h-5" />}
                              {!isWhatsApp && !isTikTok && !isFacebook && !isInstagram && !isLinkedIn && (
                                <Globe className="w-5 h-5" />
                              )}
                              <span>{ch.actionLabel}</span>
                              <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Privacy & Missing Links Handling */
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Channels Under Officer Setup</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                        This club's official WhatsApp and social media links are currently being verified by the faculty advisor and Student Life. In the meantime, you can connect directly with the officer team below.
                      </p>
                      <a
                        href={`mailto:${selectedClub.contactEmail}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>Email Club Officers ({selectedClub.contactEmail})</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Upcoming Events for This Club */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Upcoming Events ({clubEvents.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Events organized by {selectedClub.name}
                      </p>
                    </div>
                    <a
                      href="https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:text-black font-bold bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-700" />
                      <span>CUNY SPS Student Life Calendar</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  </div>

                  {clubEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clubEvents.map((ev) => (
                        <div
                          key={ev.eventId}
                          className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs font-mono text-slate-900 font-bold mb-1.5">
                              <span className="font-bold">{ev.date}</span>
                              <span>{ev.time} EST</span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">{ev.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ev.description}</p>
                            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{ev.format} · {ev.location}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                            <a
                              href={ev.url || "https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Student Life Calendar</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                            <a
                              href={getGoogleCalendarUrl(ev)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Add to Calendar</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                      No public events scheduled for this semester yet. Check back soon or join the WhatsApp group for informal meetups!
                    </div>
                  )}
                </div>

                {/* Official School Join & Inquiry Form */}
                <div className="bg-gradient-to-br from-[#0B0B0F] via-[#14141C] to-[#0B0B0F] rounded-3xl p-6 sm:p-8 text-white space-y-5 border border-white/10 shadow-xl relative overflow-hidden">
                  <div className="max-w-2xl space-y-2">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-[#C4F500] text-[11px] font-bold tracking-wide uppercase">
                      <Shield className="w-3.5 h-3.5 text-[#C4F500]" />
                      <span>Official School Form</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Have a question or want to join {selectedClub.name}?
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Submit your student inquiry or membership request directly through the official CUNY SPS Student Life form. Your submission is routed directly to the Office of Student Life and club leadership.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <a
                      href={selectedClub.joinUrl || "https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 bg-[#C4F500] hover:bg-[#b8e800] text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <span>Open Official {selectedClub.name} Form</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>

                    <a
                      href="https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-sky-300" />
                      <span>CUNY SPS Clubs &amp; Organizations Directory</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Club Email: <a href={`mailto:${selectedClub.contactEmail}`} className="text-sky-300 hover:underline">{selectedClub.contactEmail}</a></span>
                    </div>
                    <span>Office of Student Life · <a href="mailto:studentservices@sps.cuny.edu" className="text-sky-300 hover:underline">studentservices@sps.cuny.edu</a></span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 4: EVENTS                                                          */}
            {/* ========================================================================= */}
            {currentTab === 'events' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Campus Calendar</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Upcoming Club Events &amp; Workshops
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                      All club events are open to enrolled CUNY SPS students. Scan dates, add meetings directly to your school calendar, and explore official Student Life activities.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleDownloadAllIcs}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-800" />
                      <span>Subscribe All (.ics)</span>
                    </button>

                    <a
                      href="https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B0B0F] hover:bg-slate-800 text-[#C4F500] text-xs sm:text-sm font-bold rounded-xl border border-black shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
                    >
                      <Calendar className="w-4 h-4 text-[#FFB81C]" />
                      <span>Open Student Life Calendar</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  </div>
                </div>

                {/* Direct School Calendar Synchronization & Live Connection Card */}
                <div className="bg-gradient-to-br from-[#0B0B0F] via-[#14141C] to-[#0A0A0E] rounded-3xl p-6 sm:p-7 text-white border border-white/10 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#C4F500]/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Live Connection to CUNY SPS School Calendar
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          OpenLab &amp; Student Life
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                        Direct School Calendar Sync &amp; Subscriptions
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Events auto-update daily whenever the time passes <strong>11:59 PM EST</strong>. Synchronize with your <strong>CUNY Webmail (@spsmail.cuny.edu)</strong>, Google Calendar, or Apple Calendar with one tap.
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-400 flex-wrap">
                        <span>Status: <strong className="text-white">{lastSyncTime}</strong></span>
                        <span>·</span>
                        <span>Campus Date: <strong className="text-[#C4F500] font-mono">{currentCampusDate} (EST)</strong></span>
                        <span>·</span>
                        <span className="text-emerald-400">Auto 11:59 PM Rollover Active</span>
                      </div>
                    </div>

                    {/* Quick Sync & Subscription Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadAllIcs}
                        className="px-4 py-2.5 bg-[#C4F500] hover:bg-[#b8e800] text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CalendarCheck className="w-4 h-4 text-slate-950" />
                        <span>Subscribe to All Events (.ics)</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSyncSchoolCalendar}
                          disabled={calendarSyncStatus === 'syncing'}
                          className="flex-1 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-[#C4F500] ${calendarSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                          <span>{calendarSyncStatus === 'syncing' ? 'Syncing...' : 'Sync Calendar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowAddEventModal(true)}
                          className="flex-1 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-[#C4F500] font-bold text-xs rounded-xl border border-[#C4F500]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Event</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Search & Filter Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Search events by topic, club, or format..."
                      className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0F] min-h-[44px]"
                      aria-label="Search events"
                    />
                  </div>

                  {/* Filter Tabs: Upcoming vs Past Rollover */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl border border-slate-300/60 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setEventsFilter('upcoming')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        eventsFilter === 'upcoming'
                          ? 'bg-[#0B0B0F] text-[#C4F500] shadow-sm'
                          : 'text-slate-700 hover:text-black hover:bg-white/60'
                      }`}
                    >
                      <span>Upcoming</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${eventsFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
                        {upcomingEvents.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEventsFilter('past')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        eventsFilter === 'past'
                          ? 'bg-[#0B0B0F] text-[#C4F500] shadow-sm'
                          : 'text-slate-700 hover:text-black hover:bg-white/60'
                      }`}
                    >
                      <span>Past Archive</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${eventsFilter === 'past' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
                        {pastEvents.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEventsFilter('all')}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        eventsFilter === 'all'
                          ? 'bg-[#0B0B0F] text-[#C4F500] shadow-sm'
                          : 'text-slate-700 hover:text-black hover:bg-white/60'
                      }`}
                    >
                      <span>All</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${eventsFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
                        {allEvents.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Events List */}
                <div className="space-y-4">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map((ev, idx) => {
                      const isHero = idx === 0 && !eventSearch.trim() && eventsFilter === 'upcoming';
                      const dateBadge = getEventDateBadge(ev, currentCampusDate);

                      if (isHero) {
                        return (
                          <article
                            key={ev.eventId}
                            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col"
                          >
                            {/* Sleek Spotlight Banner */}
                            <div className="relative p-6 sm:p-8 bg-gradient-to-br from-[#0B0B0F] via-[#14141C] to-[#0A0A0E] text-white overflow-hidden border-b border-slate-200">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C4F500]/10 rounded-full blur-3xl pointer-events-none" />

                              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                {/* Date Block */}
                                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-center shadow-lg shrink-0">
                                  <span className="text-[10px] font-bold text-[#C4F500] uppercase tracking-wider">
                                    {new Date(ev.date + 'T12:00:00Z').toLocaleString('en-US', { month: 'short' })}
                                  </span>
                                  <span className="text-2xl font-extrabold text-white leading-none mt-0.5">
                                    {ev.date.split('-')[2]}
                                  </span>
                                </div>

                                {/* Top Right Badges */}
                                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${dateBadge.badgeStyle}`}>
                                    {dateBadge.label}
                                  </span>
                                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#C4F500] text-slate-950 shadow-sm">
                                    Spotlight Event
                                  </span>
                                </div>
                              </div>

                              {/* Header Info */}
                              <div className="relative z-10 text-white">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-[#C4F500] uppercase tracking-wider">
                                    {ev.clubName}
                                  </span>
                                  <span className="opacity-60">·</span>
                                  <span className="text-xs text-slate-300 font-mono">{ev.time} EST</span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight line-clamp-2">
                                  {ev.title}
                                </h2>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                              <div className="space-y-2 flex-1">
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                                  {ev.description}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                  <span className="inline-flex items-center gap-1 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-slate-700" />
                                    {ev.format} ({ev.location})
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => navigateTo('club-profile', ev.clubId)}
                                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                                >
                                  <span>Club Profile</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                                {ev.url && (
                                  <a
                                    href={ev.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 border border-slate-200"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-slate-700" />
                                    <span>Listing</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </a>
                                )}
                                <a
                                  href={getGoogleCalendarUrl(ev)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-2.5 bg-[#0B0B0F] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                                  title="Add to Google Calendar"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-[#C4F500]" />
                                  <span>Google Cal</span>
                                </a>
                                <a
                                  href={getOutlookCalendarUrl(ev)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-2.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                                  title="Add to CUNY Webmail Outlook Calendar"
                                >
                                  <span>CUNY Outlook</span>
                                  <ExternalLink className="w-3 h-3 opacity-80" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSingleIcs(ev)}
                                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
                                  title="Download Apple / iCal (.ics) file"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-700" />
                                  <span>.ics</span>
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      }

                      return (
                        <div
                          key={ev.eventId}
                          className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-400 p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                        >
                          <div className="flex items-start gap-4">
                            {/* Date Block */}
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                              <span className="text-[10px] font-bold text-slate-700 uppercase">
                                {new Date(ev.date + 'T12:00:00Z').toLocaleString('en-US', { month: 'short' })}
                              </span>
                              <span className="text-xl font-extrabold text-slate-950 leading-none mt-0.5">
                                {ev.date.split('-')[2]}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dateBadge.badgeStyle}`}>
                                  {dateBadge.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => navigateTo('club-profile', ev.clubId)}
                                  className="text-xs font-bold text-slate-900 hover:text-black hover:underline cursor-pointer"
                                >
                                  {ev.clubName}
                                </button>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs text-slate-500 font-mono">{ev.time} EST</span>
                              </div>

                              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                                {ev.title}
                              </h3>

                              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                                {ev.description}
                              </p>

                              <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {ev.format} ({ev.location})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto flex-wrap">
                            <button
                              type="button"
                              onClick={() => navigateTo('club-profile', ev.clubId)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[40px] flex items-center justify-center gap-1"
                            >
                              <span>Club</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            {ev.url && (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[40px] flex items-center justify-center gap-1 border border-slate-200"
                              >
                                <Calendar className="w-3.5 h-3.5 text-slate-700" />
                                <span>Listing</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </a>
                            )}
                            <a
                              href={getGoogleCalendarUrl(ev)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-[#0B0B0F] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer min-h-[40px] flex items-center justify-center gap-1"
                              title="Add to Google Calendar"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#C4F500]" />
                              <span>Google</span>
                            </a>
                            <a
                              href={getOutlookCalendarUrl(ev)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer min-h-[40px] flex items-center justify-center gap-1"
                              title="Add to CUNY Webmail Outlook Calendar"
                            >
                              <span>Outlook</span>
                              <ExternalLink className="w-3 h-3 opacity-80" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleIcs(ev)}
                              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
                              title="Download Apple / iCal (.ics) file"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-700" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center space-y-3">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                      <h3 className="font-bold text-slate-900 text-base">No events found</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No events matched your search or selected filter. You can add a new meeting or view the CUNY SPS Student Life Calendar.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEventSearch('');
                          setEventsFilter('upcoming');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* ========================================================================= */}
            {/* SCREEN 6: OPENLAB & RESOURCES                                            */}
            {/* ========================================================================= */}
            {currentTab === 'resources' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
                {/* Header */}
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-[#0B0B0F] text-[#C4F500] border border-black rounded-full mb-2">
                    <Globe className="w-3.5 h-3.5 text-[#C4F500]" />
                    <span>Campus Services &amp; Portals</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    CUNY SPS OpenLab &amp; Student Resources
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Connect directly with official school publications, student leadership groups, institutional portals, and student life services.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1: OpenLab Student Organizations Hub */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
                        <Globe className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">Student Organizations Hub</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        The central OpenLab space for recognized CUNY SPS student organizations, community discussions, and active club spaces.
                      </p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <a
                        href="https://openlab.sps.cuny.edu/groups/type/club/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-black"
                      >
                        <span>Visit Organizations Hub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href="https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        <span>Student Life Hub</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>
                  </div>

                  {/* Card 2: The Kiosk */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                        <Newspaper className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">The Kiosk (Student News)</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        The official student-run news publication of CUNY SPS, reporting on campus life, student achievements, and academic news.
                      </p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <a
                        href="https://openlab.sps.cuny.edu/groups/the-kiosk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        <span>Read The Kiosk</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href="https://www.instagram.com/cunyspskiosk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        <InstagramIcon className="w-3 h-3 fill-slate-600" />
                        <span>@cunyspskiosk</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    </div>
                  </div>

                  {/* Card 3: Open Road */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">Open Road Magazine</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        The student literary and arts magazine showcasing fiction, poetry, creative non-fiction, visual arts, and photography from students.
                      </p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-100">
                      <a
                        href="https://openlab.sps.cuny.edu/sps-open-road/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800"
                      >
                        <span>Read Open Road</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Card 4: Student Life Calendar */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">Student Life Calendar</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        View the centralized campus events schedule maintained by the CUNY SPS Office of Student Life on OpenLab.
                      </p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-100">
                      <a
                        href="https://openlab.sps.cuny.edu/groups/cuny-sps-student-life/events/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-800"
                      >
                        <span>Open Student Life Calendar</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Card 5: Official SPS Clubs Directory */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-[#0B0B0F]" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">CUNY SPS Clubs Directory</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Official CUNY SPS directory listing every recognized student club, leadership contact, faculty advisor, and constitution.
                      </p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-100">
                      <a
                        href="https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-black font-bold"
                      >
                        <span>View Official Directory</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Card 6: OpenLab Help */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-4">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">OpenLab Help &amp; Tutorials</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Guides, account creation help, and user documentation for students navigating the OpenLab ecosystem.
                      </p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-100">
                      <a
                        href="https://openlab.sps.cuny.edu/help/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
                      >
                        <span>OpenLab Support Desk</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Student Discovery Footer */}
          <footer className="bg-white border-t border-slate-200 mt-16 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src="./club-social-hub-mark.svg" alt="Club Social Hub logo" className="w-5 h-5 rounded-md" width="20" height="20" />
                <span className="font-bold text-slate-900">Club Social Hub</span>
                <span>·</span>
                <span>CUNY SPS Office of Student Life &amp; AI Club Project</span>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="https://www.linkedin.com/school/cuny-school-of-professional-studies/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-[#0A66C2] flex items-center gap-1 transition-colors"
                  title="Connect on LinkedIn"
                >
                  <LinkedInIcon className="w-3.5 h-3.5 fill-current" />
                  <span>Student LinkedIn</span>
                </a>
                <a
                  href="https://www.facebook.com/cunysps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-[#1877F2] flex items-center gap-1 transition-colors"
                  title="Follow on Facebook"
                >
                  <FacebookIcon className="w-3.5 h-3.5 fill-current" />
                  <span>SPS Facebook</span>
                </a>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('clubs')}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  All Clubs
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('events')}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  Events Calendar
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('resources')}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  Resources
                </button>
              </div>
            </div>
          </footer>

          {/* Closes Main Content Area */}

      {/* ROOT-LEVEL MOBILE & TABLET OFF-CANVAS SIDEBAR DRAWER (Free of any header/overflow bugs!) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Drawer */}
          <aside
            className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 overflow-y-auto animate-in slide-in-from-left duration-200"
            aria-label="Mobile Navigation Sidebar"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0B0F] text-white sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <img
                  src="./club-social-hub-mark.svg"
                  alt="Club Social Hub"
                  className="w-8 h-8 rounded-lg"
                />
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Club Social Hub</h2>
                  <p className="text-[11px] text-slate-400">CUNY SPS Student Life</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="p-4 space-y-6 flex-1">
              {/* Sections Group */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Campus Exploration
                </p>
                <button
                  type="button"
                  onClick={() => { navigateTo('home'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'home'
                    ? 'bg-slate-900 text-[#C4F500] font-bold border-l-4 border-[#C4F500] shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Compass className="w-4 h-4 text-[#C4F500]" />
                    <span>Home / Overview</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => { navigateTo('clubs'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'clubs' || currentTab === 'club-profile'
                    ? 'bg-slate-900 text-[#C4F500] font-bold border-l-4 border-[#C4F500] shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <div className="text-left">
                      <div>Explore Clubs</div>
                      <div className="text-[10px] text-slate-500 font-normal">All 34 Recognized Organizations</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-100 text-indigo-800 rounded-full">34</span>
                </button>

                <button
                  type="button"
                  onClick={() => { navigateTo('events'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'events'
                    ? 'bg-slate-900 text-[#C4F500] font-bold border-l-4 border-[#C4F500] shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#C4F500]" />
                    <div className="text-left">
                      <div>Campus Events</div>
                      <div className="text-[10px] text-slate-500 font-normal">Meetings &amp; Workshops</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#C4F500]/20 text-[#C4F500] rounded-full">{EVENTS_DATA.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { navigateTo('resources'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'resources'
                    ? 'bg-slate-900 text-[#C4F500] font-bold border-l-4 border-[#C4F500] shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-teal-600" />
                    <div className="text-left">
                      <div>OpenLab &amp; Resources</div>
                      <div className="text-[10px] text-slate-500 font-normal">Publications &amp; Services</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Campus & OpenLab Resources */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Campus &amp; OpenLab Resources
                </p>
                <a
                  href="https://openlab.sps.cuny.edu/help/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-teal-500" />
                    <span>OpenLab Help Desk</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <a
                  href="https://openlab.sps.cuny.edu/groups/the-kiosk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Newspaper className="w-4 h-4 text-emerald-600" />
                    <span>The Kiosk (Student News)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <a
                  href="https://openlab.sps.cuny.edu/sps-open-road/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Open Road Magazine</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>

              </div>

              {/* Student Networks */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Official Student Networks
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://www.linkedin.com/school/cuny-school-of-professional-studies/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <LinkedInIcon className="w-4 h-4 fill-white shrink-0" />
                    <span>Student LinkedIn</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                  <a
                    href="https://www.facebook.com/cunysps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1877F2] hover:bg-[#0d65d9] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <FacebookIcon className="w-4 h-4 fill-white shrink-0" />
                    <span>SPS Facebook</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                  <a
                    href="https://www.instagram.com/cunyspsstudentlife"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-opacity"
                  >
                    <InstagramIcon className="w-3.5 h-3.5 fill-white shrink-0" />
                    <span>Student Life Instagram (@cunyspsstudentlife)</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>

              {/* Install PWA Option */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); handleInstallClick(); }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0B0B0F] hover:bg-slate-800 text-[#C4F500] shadow-sm transition-all cursor-pointer group text-left border border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C4F500]/15 flex items-center justify-center text-[#C4F500] group-hover:scale-105 transition-transform">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{isInstalled ? 'App Installed (PWA)' : 'Install Club Hub App'}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#C4F500] text-slate-950">PWA</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {isInstalled ? 'Running standalone PWA' : 'Add to home screen for offline access'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* RESPONSIVE MOBILE BOTTOM TAB BAR */}
      <nav
        id="tabbar"
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-around"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))' }}
      >
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${currentTab === 'home' ? 'text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
        >
          <Compass className={`w-5 h-5 ${currentTab === 'home' ? 'text-slate-950' : 'text-slate-400'}`} />
          <span className="text-[10px] leading-tight">Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('clubs')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer relative ${currentTab === 'clubs' ? 'text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
        >
          <Users className={`w-5 h-5 ${currentTab === 'clubs' ? 'text-slate-950' : 'text-slate-400'}`} />
          <span className="text-[10px] leading-tight">Clubs</span>
          <span className="absolute -top-1 -right-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#0B0B0F] text-[#C4F500] border border-black">
            34
          </span>
        </button>

        {/* Elevated Center Action Tab */}
        <button
          type="button"
          onClick={() => navigateTo('events')}
          className="flex flex-col items-center justify-center -mt-5 group cursor-pointer"
          title="Browse Upcoming Events"
        >
          <div className={`w-12 h-10 rounded-2xl flex items-center justify-center shadow-md transition-all ${currentTab === 'events'
            ? 'bg-[#C4F500] text-slate-950 shadow-[#C4F500]/40 scale-105'
            : 'bg-[#0B0B0F] text-[#C4F500] border-2 border-[#C4F500]/50 shadow-md group-hover:scale-105'
            }`}>
            <Calendar className="w-5 h-5" />
          </div>
          <span className={`text-[10px] mt-1 font-bold ${currentTab === 'events' ? 'text-slate-950' : 'text-slate-600'
            }`}>
            Events
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('resources')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${currentTab === 'resources' ? 'text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
        >
          <Globe className={`w-5 h-5 ${currentTab === 'resources' ? 'text-slate-950' : 'text-slate-400'}`} />
          <span className="text-[10px] leading-tight">Resources</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-slate-800 hover:text-slate-950 font-bold transition-all cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-slate-900" />
          <span className="text-[10px] leading-tight font-bold text-slate-900">Menu</span>
        </button>
      </nav>

      {/* iOS PWA Installation Guide Modal */}
      {showIosPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B0B0F] flex items-center justify-center text-[#C4F500]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Install on iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-500">Add to Home Screen as PWA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosPrompt(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Close installation guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <p className="flex items-start gap-2">
                <span className="font-bold text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]">1</span>
                <span>Open this page in <strong>Safari</strong> on iOS.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]">2</span>
                <span>Tap the <strong>Share</strong> button at the bottom of the screen (the square icon with an arrow pointing up).</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]">3</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIosPrompt(false)}
              className="w-full py-2.5 bg-[#0B0B0F] hover:bg-slate-800 text-[#C4F500] font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD EVENT TO SCHOOL CALENDAR                                       */}
      {/* ========================================================================= */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B0B0F] text-[#C4F500] flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Add Event to School Calendar</h3>
                  <p className="text-[11px] text-slate-500">Live sync with CUNY SPS Student Life &amp; OpenLab</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Close add event dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hosting Organization</label>
                <select
                  value={newEventClubId}
                  onChange={(e) => setNewEventClubId(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                >
                  {CLUBS_DATA.map((c) => (
                    <option key={c.clubId} value={c.clubId}>
                      {c.name} ({c.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g., General Body Meeting &amp; Guest Speaker"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time (EST) *</label>
                  <input
                    type="text"
                    required
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="e.g., 7:00 PM"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format</label>
                  <select
                    value={newEventFormat}
                    onChange={(e) => setNewEventFormat(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                  >
                    <option value="Virtual">Virtual (Zoom / Teams)</option>
                    <option value="In-Person">In-Person</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location Details</label>
                  <input
                    type="text"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder="e.g., Zoom (Virtual) or Room 402"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">OpenLab / Event Link</label>
                <input
                  type="url"
                  value={newEventUrl}
                  onChange={(e) => setNewEventUrl(e.target.value)}
                  placeholder="https://openlab.sps.cuny.edu/events/event/..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  placeholder="Brief agenda or summary of what will take place..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B0B0F]"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Campus Calendar Notice:</strong> Events added here immediately appear in the app and generate 1-click Google, Outlook, and Apple calendar invites. For official university-wide newsletter publication, submit via the <a href={CUNY_SPS_CALENDAR_LINKS.openlabStudentLife} target="_blank" rel="noopener noreferrer" className="underline font-bold">Office of Student Life</a>.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0B0B0F] hover:bg-slate-800 text-[#C4F500] text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Save &amp; Add to Calendar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {calendarToast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B0B0F] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#C4F500]/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-[#C4F500] shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{calendarToast}</span>
          <button
            type="button"
            onClick={() => setCalendarToast(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

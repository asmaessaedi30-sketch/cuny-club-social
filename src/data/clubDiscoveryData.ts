/**
 * CUNY SPS Club Social Hub - Student Discovery Dataset
 * Preloaded catalog of all 34 recognized student clubs, verified & demo channels, and events.
 */

export interface ClubChannel {
  platform: 'whatsapp' | 'tiktok' | 'facebook' | 'instagram' | 'linkedin' | 'website';
  actionLabel: string;
  url: string;
  badge: 'Verified Official Link' | 'Sample Demo Link';
  description?: string;
  isPrivate?: boolean;
}

export interface ClubDiscoveryItem {
  clubId: string;
  name: string;
  shortCode: string;
  description: string;
  category: string;
  facultyAdvisor?: string;
  meetingSchedule?: string;
  contactEmail: string;
  whoItWelcomes: string;
  accentColor: string;
  isFeatured: boolean;
  channels: ClubChannel[];
  joinUrl?: string;
  logoUrl?: string;
  logoSource?: string;
}

export interface DiscoveryEvent {
  eventId: string;
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  date: string;
  time: string;
  format: string;
  location: string;
  url?: string;
  rsvps?: number;
}

export const CLUBS_DATA: ClubDiscoveryItem[] = [
  {
    "clubId": "club-anime",
    "name": "Anime Club",
    "shortCode": "ANIME",
    "description": "A welcoming, inclusive community where CUNY SPS students connect over anime, manga, watch parties, and creative fandom discussions.",
    "category": "Arts, Media & Creative",
    "contactEmail": "anime@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Anime Club activities and professional community.",
    "accentColor": "#DB2777",
    "joinUrl": "https://forms.office.com/r/jz9viSud7J",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/animeclubsps/",
        "badge": "Verified Official Link",
        "description": "Official Anime Club Instagram for watch party schedules, anime discussions, and creative fandom meetups."
      }
    ],
    "logoUrl": "./club-logos/anime-club.jpg",
    "logoSource": "Official Anime Club Instagram profile avatar (@animeclubsps)"
  },
  {
    "clubId": "club-ai",
    "name": "Artificial Intelligence Club",
    "shortCode": "AI-CLUB",
    "description": "Student-led organization dedicated to helping CUNY SPS students of all backgrounds explore artificial intelligence, hands-on technical projects, and ethical innovation.",
    "category": "Academic & Technology",
    "contactEmail": "ai-club@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all undergraduate, graduate, online, and hybrid students interested in artificial intelligence, machine learning, data ethics, coding, or civic technology\u2014from absolute beginners to experienced engineers.",
    "accentColor": "#7C3AED",
    "joinUrl": "https://forms.office.com/r/jSfyJUzCqG",
    "isFeatured": true,
    "channels": [
      {
        "platform": "whatsapp",
        "actionLabel": "Join WhatsApp",
        "url": "https://chat.whatsapp.com/LiEAv8DRlII7pMqN60PGj6",
        "badge": "Verified Official Link",
        "description": "Active student community chat for build night alerts, Zoom links, and peer project collaborations."
      },
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/cuny_sps_ai_club/",
        "badge": "Verified Official Link",
        "description": "Official CUNY SPS AI Club Instagram for workshop announcements, hackathon recaps, and AI project spotlights."
      },
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/ai-club/",
        "badge": "Verified Official Link",
        "description": "Official CUNY SPS OpenLab workspace for workshops, hackathons, and discussion forums."
      }
    ],
    "logoUrl": "./club-logos/ai-club.jpg",
    "logoSource": "Official AI Club Instagram profile avatar (@cuny_sps_ai_club)"
  },
  {
    "clubId": "club-arts-crafts",
    "name": "Arts and Crafts Club",
    "shortCode": "CRAFTS",
    "description": "Creative community for DIY workshops, sketching, fiber arts, digital illustration, and stress-relief craft socials.",
    "category": "Arts, Media & Creative",
    "contactEmail": "crafts@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Arts and Crafts Club activities and professional community.",
    "accentColor": "#F59E0B",
    "joinUrl": "https://forms.office.com/r/Eg44DmcrwA",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-bsu",
    "name": "Black Student Union",
    "shortCode": "BSU",
    "description": "Empowering Black and African diaspora students at CUNY SPS through leadership development, cultural celebration, mentorship, and advocacy.",
    "category": "Identity, Faith & Cultural",
    "contactEmail": "bsu@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes Black students and allies across all degree programs to celebrate Black culture, foster leadership, and build supportive academic and social networks.",
    "accentColor": "#D97706",
    "joinUrl": "https://forms.office.com/r/0Gsn6smjkk",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/bsu.sps/",
        "badge": "Verified Official Link",
        "description": "Official CUNY SPS Black Student Union Instagram for community gatherings, cultural celebrations, and leadership panels."
      }
    ],
    "logoUrl": "./club-logos/bsu.jpg",
    "logoSource": "Official Black Student Union Instagram profile avatar (@bsu.sps)"
  },
  {
    "clubId": "club-book",
    "name": "Book Club",
    "shortCode": "BOOK",
    "description": "Monthly virtual and hybrid reading discussions spanning contemporary fiction, memoirs, social sciences, and student recommendations.",
    "category": "Arts, Media & Creative",
    "contactEmail": "book@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Book Club activities and professional community.",
    "accentColor": "#059669",
    "joinUrl": "https://forms.office.com/r/0Mn4RgzeLr",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/sps.bookclub/",
        "badge": "Verified Official Link",
        "description": "Official SPS Book Club Instagram for monthly book selections, reading prompts, and discussion highlights."
      },
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/groups/sps-book-club/",
        "badge": "Verified Official Link",
        "description": "SPS Book Club reading lists and monthly book discussions."
      }
    ],
    "logoUrl": "./club-logos/book-club.jpg",
    "logoSource": "Official CUNY SPS OpenLab SPS Book Club group avatar"
  },
  {
    "clubId": "club-christian-fellowship",
    "name": "Christian Fellowship Club",
    "shortCode": "CFC",
    "description": "Fellowship, spiritual reflection, community service, and supportive dialogue welcoming CUNY SPS students of all backgrounds.",
    "category": "Identity, Faith & Cultural",
    "contactEmail": "cfc@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Christian Fellowship Club activities and professional community.",
    "accentColor": "#2563EB",
    "joinUrl": "https://forms.office.com/r/yxcsdVYFcM",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-cosplay",
    "name": "Cosplay Club",
    "shortCode": "COSPLAY",
    "description": "Design, prop fabrication, character costume craftsmanship, and convention community meetups for CUNY SPS creators.",
    "category": "Arts, Media & Creative",
    "contactEmail": "cosplay@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Cosplay Club activities and professional community.",
    "accentColor": "#8B5CF6",
    "joinUrl": "https://forms.office.com/r/PqEMUTSpbA",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-creative-writing",
    "name": "Creative Writing Club",
    "shortCode": "CWC",
    "description": "Peer critique circles, poetry slams, short-story prompts, and literary publishing workshops for aspiring writers.",
    "category": "Arts, Media & Creative",
    "contactEmail": "cwc@spsmail.cuny.edu",
    "whoItWelcomes": "Open to poets, novelists, essayists, playwrights, and casual writers eager to share drafts, receive peer feedback, and attend open mics.",
    "accentColor": "#BE185D",
    "joinUrl": "https://forms.office.com/r/P3CieH7HML",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/laps.sps/",
        "badge": "Verified Official Link",
        "description": "Official Literary Arts & Publishing Society (LAPS) Instagram for student publications, writing prompts, and poetry circles."
      },
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/creative-writing-club/",
        "badge": "Verified Official Link",
        "description": "Literary Arts & Publishing Society publications and writer workshops."
      }
    ],
    "logoUrl": "./club-logos/creative-writing.png",
    "logoSource": "Official CUNY SPS OpenLab Literary Arts & Publishing Society group avatar"
  },
  {
    "clubId": "club-delta-alpha-pi",
    "name": "Delta Alpha Pi Honor Society",
    "shortCode": "DAPi",
    "description": "International honor society recognizing high-achieving college students with disabilities while advancing leadership and campus accessibility.",
    "category": "Honor Societies",
    "contactEmail": "dapi@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Delta Alpha Pi Honor Society activities and professional community.",
    "accentColor": "#B45309",
    "joinUrl": "https://forms.office.com/r/28XzC0ZmQj",
    "isFeatured": false,
    "channels": [
      {
        "platform": "website",
        "actionLabel": "Visit Official Honor Society",
        "url": "https://deltaalphapihonorsociety.org",
        "badge": "Verified Official Link",
        "description": "Delta Alpha Pi International Honor Society official web resource."
      }
    ],
    "logoUrl": "./club-logos/delta-alpha-pi.jpg",
    "logoSource": "Delta Alpha Pi International Honor Society official insignia"
  },
  {
    "clubId": "club-disability-access",
    "name": "Disability and Access Coalition",
    "shortCode": "DAC",
    "description": "Student advocacy group championing universal design, assistive technology awareness, and inclusive student experiences at CUNY SPS.",
    "category": "Advocacy & Community",
    "contactEmail": "dac@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Disability and Access Coalition activities and professional community.",
    "accentColor": "#0284C7",
    "joinUrl": "https://forms.office.com/r/nsFmGQAeWB",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/dacsps/",
        "badge": "Verified Official Link",
        "description": "Official Disability and Access Coalition Instagram (@dacsps) for disability advocacy, universal design workshops, and accessibility updates."
      },
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/disability-access-coalition/",
        "badge": "Verified Official Link",
        "description": "Disability advocacy and accessibility resources on OpenLab."
      }
    ],
    "logoUrl": "./club-logos/disability-access.jpg",
    "logoSource": "Official Disability and Access Coalition Instagram profile avatar (@dacsps)"
  },
  {
    "clubId": "club-film-tv",
    "name": "Film & Television Club",
    "shortCode": "FILM",
    "description": "Screenings, cinematography breakdowns, screenwriting discussions, and media criticism for cinema and television enthusiasts.",
    "category": "Arts, Media & Creative",
    "contactEmail": "film@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes cinephiles, screenwriters, video creators, media studies majors, and anyone who loves discussing film, streaming, and television.",
    "accentColor": "#EA580C",
    "joinUrl": "https://forms.cloud.microsoft/pages/responsepage.aspx?id=s_BgbwZfCU6XFZiduozH2OUWoTTGNHdIl-sDDEQRP3xUQldKSEFGVlg2TlBKR1pHUjJYRlM2RTFPVi4u&route=shorturl",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-green",
    "name": "Green Club",
    "shortCode": "GREEN",
    "description": "Environmental sustainability, climate literacy, urban ecology initiatives, and NYC green-space volunteer events.",
    "category": "Advocacy & Community",
    "contactEmail": "green@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes sustainability advocates, climate thinkers, urban agriculture enthusiasts, and students committed to environmental stewardship.",
    "accentColor": "#16A34A",
    "joinUrl": "https://forms.office.com/r/uBPJvwXCGr",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-hian",
    "name": "Health Information and Administration Network (HIAN) Leadership",
    "shortCode": "HIAN",
    "description": "Professional network connecting Health Information Management and Health Services Administration students with healthcare leaders.",
    "category": "Academic & Professional",
    "contactEmail": "hian@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Health Information and Administration Network (HIAN) Leadership activities and professional community.",
    "accentColor": "#0D9488",
    "joinUrl": "https://forms.office.com/r/UiLqc7Xh0c",
    "isFeatured": false,
    "channels": [
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/groups/healthcare/",
        "badge": "Verified Official Link",
        "description": "Healthcare administration student community on OpenLab."
      }
    ],
    "logoUrl": "./club-logos/hian.jpg",
    "logoSource": "Official CUNY SPS OpenLab Healthcare community group avatar"
  },
  {
    "clubId": "club-human-relations-soc",
    "name": "Human Relations and Sociology Club",
    "shortCode": "HRSC",
    "description": "Exploring organizational dynamics, social research, workplace equity, and community sociology through panels and peer exchange.",
    "category": "Academic & Professional",
    "contactEmail": "hrsc@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Human Relations and Sociology Club activities and professional community.",
    "accentColor": "#D97706",
    "joinUrl": "https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-latinx",
    "name": "Latinx Student Union",
    "shortCode": "LSU",
    "description": "Celebrating Latinx heritage, academic persistence, cultural programming, and community solidarity across CUNY SPS.",
    "category": "Identity, Faith & Cultural",
    "contactEmail": "lsu@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Latinx Student Union activities and professional community.",
    "accentColor": "#E11D48",
    "joinUrl": "https://forms.office.com/r/ghQ1UyJjM5",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-makeup-beauty",
    "name": "Makeup and Beauty Club",
    "shortCode": "MBC",
    "description": "Creative expression, skincare education, artistry tutorials, and inclusive beauty industry conversations.",
    "category": "Social & Special Interest",
    "contactEmail": "mbc@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Makeup and Beauty Club activities and professional community.",
    "accentColor": "#EC4899",
    "joinUrl": "https://forms.office.com/r/trYh0JeWH3",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-melo",
    "name": "Management and Entrepreneur Leadership Organization (MELO)",
    "shortCode": "MELO",
    "description": "Business strategy, startup pitch nights, executive leadership workshops, and alumni mentorship for management students.",
    "category": "Academic & Professional",
    "contactEmail": "melo@spsmail.cuny.edu",
    "whoItWelcomes": "Open to students interested in leadership development, business administration, entrepreneurship, project management, and startup innovation.",
    "accentColor": "#2563EB",
    "joinUrl": "https://forms.office.com/r/ww39E3D5qg",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/cunymelo/",
        "badge": "Verified Official Link",
        "description": "Official CUNY MELO Instagram for executive speaker panels, startup pitch nights, and leadership workshops."
      },
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/spsmelo/",
        "badge": "Verified Official Link",
        "description": "MELO community hub on CUNY SPS OpenLab."
      }
    ],
    "logoUrl": "./club-logos/melo.png",
    "logoSource": "Official CUNY SPS OpenLab MELO group avatar"
  },
  {
    "clubId": "club-mental-health",
    "name": "Mental Health Club",
    "shortCode": "MHC",
    "description": "Destigmatizing mental wellness, mindfulness workshops, and peer support programming tailored for online and adult learners.",
    "category": "Wellness & Peer Support",
    "contactEmail": "mhc@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Mental Health Club activities and professional community.",
    "accentColor": "#10B981",
    "joinUrl": "https://forms.office.com/r/ZpHXtjfseb",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-museum-studies",
    "name": "Museum Studies Club",
    "shortCode": "MSC",
    "description": "Curatorial dialogue, museum accessibility, archival preservation, and cultural institution tours across New York City.",
    "category": "Academic & Professional",
    "contactEmail": "msc@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Museum Studies Club activities and professional community.",
    "accentColor": "#78716C",
    "joinUrl": "https://forms.office.com/r/kkBaWxfDUV",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/museumstudiesclubcunysps/",
        "badge": "Verified Official Link",
        "description": "Official Museum Studies Club Instagram for NYC museum walks, curatorial panels, and exhibition highlights."
      }
    ],
    "logoUrl": "./club-logos/museum-studies.jpg",
    "logoSource": "Official Museum Studies Club Instagram profile avatar (@museumstudiesclubcunysps)"
  },
  {
    "clubId": "club-msa",
    "name": "Muslim Student Association (MSA)",
    "shortCode": "MSA",
    "description": "CUNY SPS Muslim Student Association fostering spiritual fellowship, cultural dialogue, community service, and inclusive campus events for Muslim students and allies.",
    "category": "Identity, Faith & Cultural",
    "contactEmail": "msa@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes Muslim students, spiritual seekers, and allies of all academic disciplines across CUNY SPS for fellowship, mutual aid, cultural discussion, and community service.",
    "accentColor": "#0D9488",
    "joinUrl": "https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations",
    "isFeatured": true,
    "channels": [
      {
        "platform": "whatsapp",
        "actionLabel": "Join WhatsApp",
        "url": "https://chat.whatsapp.com/F8DqIiNLEv27IY9vXE09UZ",
        "badge": "Verified Official Link",
        "description": "Official CUNY SPS MSA student community WhatsApp group."
      },
      {
        "platform": "website",
        "actionLabel": "Visit MSA Website",
        "url": "https://cuny-msa-hub.pages.dev/",
        "badge": "Verified Official Link",
        "description": "CUNY SPS Muslim Student Association Centralized Community Hub."
      }
    ],
    "logoUrl": "./club-logos/msa-club.png",
    "logoSource": "Official CUNY SPS MSA Crescent Badge team repository asset"
  },
  {
    "clubId": "club-neurodiversity",
    "name": "Neurodiversity Club",
    "shortCode": "NEURO",
    "description": "Peer community celebrating neurodivergent learners through sensory-friendly study spaces, executive-function tools, and advocacy.",
    "category": "Wellness & Peer Support",
    "contactEmail": "neuro@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Neurodiversity Club activities and professional community.",
    "accentColor": "#6366F1",
    "joinUrl": "https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-parent",
    "name": "Parent Club",
    "shortCode": "PARENT",
    "description": "Supporting parenting students and family caregivers at CUNY SPS with peer resource sharing, family-friendly meetups, and advocacy.",
    "category": "Advocacy & Community",
    "contactEmail": "parent@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Parent Club activities and professional community.",
    "accentColor": "#F97316",
    "joinUrl": "https://forms.office.com/pages/responsepage.aspx?id=s_BgbwZfCU6XFZiduozH2OUWoTTGNHdIl-sDDEQRP3xUOEozT1lGUlM3RzdJQUVMWTY5T0xHTVdOOC4u",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-photography",
    "name": "Photography Club",
    "shortCode": "PHOTO",
    "description": "Visual storytelling, photo walks across NYC, lighting critiques, and digital editing workshops for all experience levels.",
    "category": "Arts, Media & Creative",
    "contactEmail": "photo@spsmail.cuny.edu",
    "whoItWelcomes": "Open to photographers of all skill levels\u2014from smartphone snappers to DSLR enthusiasts\u2014interested in visual storytelling and photo walks.",
    "accentColor": "#9333EA",
    "joinUrl": "https://forms.office.com/r/dexbfyZRVD",
    "isFeatured": false,
    "channels": [
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/photography-club/",
        "badge": "Verified Official Link",
        "description": "Photography Club official showcase and virtual critique meetups."
      }
    ],
    "logoUrl": "./club-logos/photography-club.jpg",
    "logoSource": "Official CUNY SPS OpenLab Photography Club group avatar"
  },
  {
    "clubId": "club-pride",
    "name": "Pride Club",
    "shortCode": "PRIDE",
    "description": "LGBTQIA+ student community promoting belonging, campus education, intersectional solidarity, and celebratory pride programming.",
    "category": "Identity, Faith & Cultural",
    "contactEmail": "pride@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Pride Club activities and professional community.",
    "accentColor": "#A855F7",
    "joinUrl": "https://forms.office.com/r/NbbPW6jLWQ",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/sps_prideclub/",
        "badge": "Verified Official Link",
        "description": "Official CUNY SPS Pride Club Instagram for community events, discussions, and LGBTQIA+ advocacy."
      },
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/pride-club/",
        "badge": "Verified Official Link",
        "description": "Pride Club community space for events and LGBTQIA+ advocacy."
      }
    ],
    "logoUrl": "./club-logos/pride-club.jpg",
    "logoSource": "Official CUNY SPS OpenLab Pride Club group avatar"
  },
  {
    "clubId": "club-psychology",
    "name": "Psychology Club",
    "shortCode": "PSYCH",
    "description": "Academic colloquia, graduate school preparation, behavioral research spotlights, and community mental health initiatives.",
    "category": "Academic & Professional",
    "contactEmail": "psych@spsmail.cuny.edu",
    "whoItWelcomes": "Open to BA in Psychology students, graduate researchers, and anyone curious about human behavior, mental wellness, and research methodology.",
    "accentColor": "#4F46E5",
    "joinUrl": "https://forms.office.com/Pages/ResponsePage.aspx?id=s_BgbwZfCU6XFZiduozH2OUWoTTGNHdIl-sDDEQRP3xUMUYxN1FKR01SQkZVSEZUMDJETDFWR1I1Si4u",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/psychologyclubsps/",
        "badge": "Verified Official Link",
        "description": "Official CUNY SPS Psychology Club Instagram for research spotlights, academic colloquia, and psychology meetups."
      },
      {
        "platform": "website",
        "actionLabel": "Visit OpenLab Hub",
        "url": "https://openlab.sps.cuny.edu/groups/psychology-club/",
        "badge": "Verified Official Link",
        "description": "Psychology Club community hub, meeting agendas, and discussion boards on OpenLab."
      },
      {
        "platform": "website",
        "actionLabel": "Visit Club Site",
        "url": "https://openlab.sps.cuny.edu/psychologyclub/",
        "badge": "Verified Official Link",
        "description": "Official Psychology Club site for academic announcements and resources."
      }
    ],
    "logoUrl": "./club-logos/psychology-club.png",
    "logoSource": "Official CUNY SPS OpenLab Psychology Club group avatar"
  },
  {
    "clubId": "club-retail-therapy",
    "name": "Retail Therapy Roundtable Club",
    "shortCode": "RTRC",
    "description": "Exploring consumer trends, merchandising, e-commerce strategy, and personal style in relaxed roundtable conversations.",
    "category": "Social & Special Interest",
    "contactEmail": "rtrc@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Retail Therapy Roundtable Club activities and professional community.",
    "accentColor": "#F43F5E",
    "joinUrl": "https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-shrm",
    "name": "SHRM Student Chapter",
    "shortCode": "SHRM",
    "description": "Society for Human Resource Management student chapter offering HR certification prep, talent strategy panels, and career networking.",
    "category": "Academic & Professional",
    "contactEmail": "shrm@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in SHRM Student Chapter activities and professional community.",
    "accentColor": "#1D4ED8",
    "joinUrl": "https://forms.cloud.microsoft/pages/responsepage.aspx?id=s_BgbwZfCU6XFZiduozH2OUWoTTGNHdIl-sDDEQRP3xUNVEwTTI3VU8wS0FVQVQwUlI2QTdDT1lBSSQlQCNjPTEu&route=shorturl",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-sigma-beta-delta",
    "name": "Sigma Beta Delta Honor Society",
    "shortCode": "SBD",
    "description": "International honor society recognizing academic excellence among undergraduate and graduate business, management, and administration students.",
    "category": "Honor Societies",
    "contactEmail": "sbd@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Sigma Beta Delta Honor Society activities and professional community.",
    "accentColor": "#CA8A04",
    "joinUrl": "https://forms.office.com/r/qTfpA224du",
    "isFeatured": false,
    "channels": [
      {
        "platform": "website",
        "actionLabel": "Visit Official Honor Society",
        "url": "https://sigmabetadelta.org",
        "badge": "Verified Official Link",
        "description": "Sigma Beta Delta International Honor Society official portal."
      }
    ],
    "logoUrl": "./club-logos/sigma-beta-delta.webp",
    "logoSource": "Sigma Beta Delta International Honor Society official key emblem"
  },
  {
    "clubId": "club-social-impact",
    "name": "Social Impact & Activism Club",
    "shortCode": "SIAC",
    "description": "Driving civic awareness, housing and disability justice dialogue, environmental advocacy, and changemaker workshops across CUNY.",
    "category": "Advocacy & Community",
    "contactEmail": "siac@spsmail.cuny.edu",
    "whoItWelcomes": "Open to changemakers, student advocates, and community organizers passionate about housing justice, environmental action, disability rights, and civic advocacy.",
    "accentColor": "#DC2626",
    "joinUrl": "https://forms.office.com/r/PWFMnEazyw",
    "isFeatured": true,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-sasu",
    "name": "South Asian Student Union",
    "shortCode": "SASU",
    "description": "Building community among South Asian students and allies through cultural showcases, chai chats, and peer mentorship.",
    "category": "Identity, Faith & Cultural",
    "contactEmail": "sasu@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in South Asian Student Union activities and professional community.",
    "accentColor": "#EA580C",
    "joinUrl": "https://forms.office.com/r/sJ04BVU3U5",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-svo",
    "name": "Student Veterans Organization",
    "shortCode": "SVO",
    "description": "Peer support, academic transition resources, career advocacy, and camaraderie for military-connected and veteran CUNY SPS students.",
    "category": "Advocacy & Community",
    "contactEmail": "svo@spsmail.cuny.edu",
    "whoItWelcomes": "Dedicated to student veterans, active duty service members, reservists, military spouses, and civilian allies navigating academic and civilian transitions.",
    "accentColor": "#4B5563",
    "joinUrl": "https://forms.office.com/r/4EeeUD7LX2",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/cunyspsveterans/",
        "badge": "Verified Official Link",
        "description": "Official CUNY SPS Student Veterans Organization Instagram for military-connected student fellowship and community resources."
      }
    ],
    "logoUrl": "./club-logos/veterans.jpg",
    "logoSource": "Official Student Veterans Organization Instagram profile avatar (@cunyspsveterans)"
  },
  {
    "clubId": "club-study-lounge",
    "name": "Study Lounge Club",
    "shortCode": "LOUNGE",
    "description": "Co-working Pomodoro sessions, finals accountability circles, and cross-major peer study meetups for online students.",
    "category": "Social & Special Interest",
    "contactEmail": "lounge@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Study Lounge Club activities and professional community.",
    "accentColor": "#64748B",
    "joinUrl": "https://sps.cuny.edu/student-success/student-life/student-clubs-and-organizations",
    "isFeatured": false,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-women-stem",
    "name": "Women in STEM Club",
    "shortCode": "WSTEM",
    "description": "Advancing women and non-binary scholars in computing, data, health informatics, and quantitative sciences via mentorship and build nights.",
    "category": "Academic & Technology",
    "contactEmail": "wstem@spsmail.cuny.edu",
    "whoItWelcomes": "Open to all women, non-binary students, and allies pursuing or interested in science, technology, engineering, mathematics, data analytics, and tech career pathways.",
    "accentColor": "#7C3AED",
    "joinUrl": "https://forms.office.com/Pages/ResponsePage.aspx?id=s_BgbwZfCU6XFZiduozH2OUWoTTGNHdIl-sDDEQRP3xUQTgyMjQ3RVBJWEozUjZCMDI4TlVHVURLTSQlQCNjPTEu",
    "isFeatured": true,
    "channels": [],
    "logoSource": "Initials fallback displayed; awaiting official club logo submission"
  },
  {
    "clubId": "club-youth-studies",
    "name": "Youth Studies Club",
    "shortCode": "YSC",
    "description": "Connecting Youth Studies and Education scholars around youth advocacy, community programming, and research colloquia.",
    "category": "Academic & Professional",
    "contactEmail": "ysc@spsmail.cuny.edu",
    "whoItWelcomes": "Welcomes all CUNY SPS undergraduate and graduate students, alumni, and community members interested in Youth Studies Club activities and professional community.",
    "accentColor": "#0284C7",
    "joinUrl": "https://forms.office.com/pages/responsepage.aspx?id=s_BgbwZfCU6XFZiduozH2OUWoTTGNHdIl-sDDEQRP3xUNDgwSTVMSkVKRVMwS0s1WTlSQkQ1M0E0NC4u",
    "isFeatured": false,
    "channels": [
      {
        "platform": "instagram",
        "actionLabel": "Follow on Instagram",
        "url": "https://www.instagram.com/cunysps_youthstudies/",
        "badge": "Verified Official Link",
        "description": "Official Youth Studies Club Instagram for youth advocacy initiatives, research colloquia, and student community events."
      }
    ],
    "logoUrl": "./club-logos/youth-studies.jpg",
    "logoSource": "Official Youth Studies Club Instagram profile avatar (@cunysps_youthstudies)"
  }
];

export const EVENTS_DATA: DiscoveryEvent[] = [
  {
    "clubId": "club-film-tv",
    "clubName": "Film & Television Club",
    "title": "Film Club Meeting",
    "description": "Upcoming event hosted by Film & Television Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-11-25",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/film-club-meeting-2/",
    "eventId": "evt-film-tv-20261125-3"
  },
  {
    "clubId": "club-arts-crafts",
    "clubName": "Arts and Crafts Club",
    "title": "Arts and Crafts Club Meeting",
    "description": "Upcoming event hosted by Arts and Crafts Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-01",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/arts-and-crafts-club-meeting-5/",
    "eventId": "evt-arts-crafts-20261201-4"
  },
  {
    "clubId": "club-anime",
    "clubName": "Anime Club",
    "title": "Anime Club Meeting",
    "description": "Upcoming event hosted by Anime Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-01",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/anime-club-meeting-17/",
    "eventId": "evt-anime-20261201-5"
  },
  {
    "clubId": "club-ai",
    "clubName": "Artificial Intelligence Club",
    "title": "AI Club Meeting",
    "description": "Upcoming event hosted by Artificial Intelligence Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-01",
    "time": "7:30 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/ai-club-meeting-4/",
    "eventId": "evt-ai-20261201-6"
  },
  {
    "clubId": "club-museum-studies",
    "clubName": "Museum Studies Club",
    "title": "Museum Studies Club Meeting",
    "description": "Upcoming event hosted by Museum Studies Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-02",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/museum-studies-club-meeting-20/",
    "eventId": "evt-museum-studies-20261202-7"
  },
  {
    "clubId": "club-psychology",
    "clubName": "Psychology Club",
    "title": "Psychology Club Meeting",
    "description": "Upcoming event hosted by Psychology Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-02",
    "time": "6:30 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/psychology-club-meeting-19/",
    "eventId": "evt-psychology-20261202-8"
  },
  {
    "clubId": "club-parent",
    "clubName": "Parent Club",
    "title": "Parent Club Meeting",
    "description": "Upcoming event hosted by Parent Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-02",
    "time": "7:30 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/parent-club-meeting-14/",
    "eventId": "evt-parent-20261202-9"
  },
  {
    "clubId": "club-book",
    "clubName": "Book Club",
    "title": "Book Club Meeting",
    "description": "Upcoming event hosted by Book Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-03",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/book-club-meeting-19/",
    "eventId": "evt-book-20261203-10"
  },
  {
    "clubId": "club-film-tv",
    "clubName": "Film & Television Club",
    "title": "Film Club Movie Night: The Muppet Christmas Carol",
    "description": "Upcoming event hosted by Film & Television Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-07",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/film-club-movie-night-the-muppet-christmas-carol/",
    "eventId": "evt-film-tv-20261207-11"
  },
  {
    "clubId": "club-human-relations-soc",
    "clubName": "Human Relations and Sociology Club",
    "title": "Human Relations and Sociology Club Meeting",
    "description": "Upcoming event hosted by Human Relations and Sociology Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-08",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/human-relations-and-sociology-club-meeting-4/",
    "eventId": "evt-human-relations-soc-20261208-12"
  },
  {
    "clubId": "club-melo",
    "clubName": "Management and Entrepreneur Leadership Organization (MELO)",
    "title": "Leading Forward: Vision, Legacy & Sustainable Impact (mid-afternoon session)",
    "description": "Upcoming event hosted by Management and Entrepreneur Leadership Organization (MELO) on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-09",
    "time": "12:30 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/leading-forward-vision-legacy-sustainable-impact-mid-afternoon-session/",
    "eventId": "evt-melo-20261209-13"
  },
  {
    "clubId": "club-christian-fellowship",
    "clubName": "Christian Fellowship Club",
    "title": "Christian Fellowship Club",
    "description": "Upcoming event hosted by Christian Fellowship Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-09",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/christian-fellowship-club-5/",
    "eventId": "evt-christian-fellowship-20261209-14"
  },
  {
    "clubId": "club-social-impact",
    "clubName": "Social Impact & Activism Club",
    "title": "Animal Advocacy Club Meeting",
    "description": "Upcoming event hosted by Social Impact & Activism Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-09",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/animal-advocacy-club-meeting-2/",
    "eventId": "evt-social-impact-20261209-15"
  },
  {
    "clubId": "club-film-tv",
    "clubName": "Film & Television Club",
    "title": "Film Club Meeting",
    "description": "Upcoming event hosted by Film & Television Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-09",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/film-club-meeting-3/",
    "eventId": "evt-film-tv-20261209-16"
  },
  {
    "clubId": "club-melo",
    "clubName": "Management and Entrepreneur Leadership Organization (MELO)",
    "title": "Leading Forward: Vision, Legacy & Sustainable Impact (evening session)",
    "description": "Upcoming event hosted by Management and Entrepreneur Leadership Organization (MELO) on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-09",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/leading-forward-vision-legacy-sustainable-impact-evening-session/",
    "eventId": "evt-melo-20261209-17"
  },
  {
    "clubId": "club-creative-writing",
    "clubName": "Creative Writing Club",
    "title": "Literacy Arts and Publishing Society",
    "description": "Upcoming event hosted by Creative Writing Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-10",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/literacy-arts-and-publishing-society-3/",
    "eventId": "evt-creative-writing-20261210-18"
  },
  {
    "clubId": "club-makeup-beauty",
    "clubName": "Makeup and Beauty Club",
    "title": "Makeup and Beauty Club Meeting",
    "description": "Upcoming event hosted by Makeup and Beauty Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-14",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/makeup-beauty-club-meeting/",
    "eventId": "evt-makeup-beauty-20261214-19"
  },
  {
    "clubId": "club-photography",
    "clubName": "Photography Club",
    "title": "Photography Club Meeting",
    "description": "Upcoming event hosted by Photography Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-14",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/photography-club-meeting-7/",
    "eventId": "evt-photography-20261214-20"
  },
  {
    "clubId": "club-hian",
    "clubName": "Health Information and Administration Network (HIAN) Leadership",
    "title": "Health Information and Administration Network (HIAN)",
    "description": "Upcoming event hosted by Health Information and Administration Network (HIAN) Leadership on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-15",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/health-information-and-administration-network-hian-5/",
    "eventId": "evt-hian-20261215-21"
  },
  {
    "clubId": "club-pride",
    "clubName": "Pride Club",
    "title": "Pride Club Meeting",
    "description": "Upcoming event hosted by Pride Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-15",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/pride-club-meeting-14/",
    "eventId": "evt-pride-20261215-22"
  },
  {
    "clubId": "club-sasu",
    "clubName": "South Asian Student Union",
    "title": "South Asian Student Union",
    "description": "Upcoming event hosted by South Asian Student Union on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-16",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/south-asian-student-union/",
    "eventId": "evt-sasu-20261216-23"
  },
  {
    "clubId": "club-study-lounge",
    "clubName": "Study Lounge Club",
    "title": "Jewish Student Union",
    "description": "Upcoming event hosted by Study Lounge Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-16",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/jewish-student-union/",
    "eventId": "evt-study-lounge-20261216-24"
  },
  {
    "clubId": "club-melo",
    "clubName": "Management and Entrepreneur Leadership Organization (MELO)",
    "title": "Stock Market and Investors Club",
    "description": "Upcoming event hosted by Management and Entrepreneur Leadership Organization (MELO) on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-17",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/stock-market-and-investors-club-3/",
    "eventId": "evt-melo-20261217-25"
  },
  {
    "clubId": "club-disability-access",
    "clubName": "Disability and Access Coalition",
    "title": "Disability and Access Coalition Meeting",
    "description": "Upcoming event hosted by Disability and Access Coalition on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-17",
    "time": "6:30 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/disability-and-access-coalition-meeting-5/",
    "eventId": "evt-disability-access-20261217-26"
  },
  {
    "clubId": "club-melo",
    "clubName": "Management and Entrepreneur Leadership Organization (MELO)",
    "title": "MELO Club Meeting",
    "description": "Upcoming event hosted by Management and Entrepreneur Leadership Organization (MELO) on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-17",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/melo-club-meeting-2/",
    "eventId": "evt-melo-20261217-27"
  },
  {
    "clubId": "club-sigma-beta-delta",
    "clubName": "Sigma Beta Delta Honor Society",
    "title": "Sigma Beta Delta Meeting",
    "description": "Upcoming event hosted by Sigma Beta Delta Honor Society on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2026-12-22",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/sigma-beta-delta-meeting-3/",
    "eventId": "evt-sigma-beta-delta-20261222-28"
  },
  {
    "clubId": "club-ai",
    "clubName": "Artificial Intelligence Club",
    "title": "AI Club Meeting",
    "description": "Monthly general meeting and technical walkthrough. Open to all CUNY SPS students interested in artificial intelligence, machine learning, and data ethics.",
    "date": "2027-02-02",
    "time": "7:30 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/ai-club-meeting-4/",
    "eventId": "evt-ai-20270202-spring"
  },
  {
    "clubId": "club-ai",
    "clubName": "Artificial Intelligence Club",
    "title": "AI Club Meeting",
    "description": "Monthly project showcase and collaborative coding session for CUNY SPS AI Club members and prospective students.",
    "date": "2027-03-02",
    "time": "7:30 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/ai-club-meeting/",
    "eventId": "evt-ai-20270302-spring"
  },
  {
    "clubId": "club-pride",
    "clubName": "Pride Club",
    "title": "LGBTQ Conference",
    "description": "Upcoming event hosted by Pride Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2027-04-02",
    "time": "9:00 AM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/lgbtq-conference/",
    "eventId": "evt-pride-20270402-29"
  },
  {
    "clubId": "club-ai",
    "clubName": "Artificial Intelligence Club",
    "title": "AI Club Meeting",
    "description": "Spring semester AI tools presentation, student project reviews, and open Q&A with peer mentors.",
    "date": "2027-04-06",
    "time": "7:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/ai-club-meeting-2/",
    "eventId": "evt-ai-20270406-spring"
  },
  {
    "clubId": "club-melo",
    "clubName": "Management and Entrepreneur Leadership Organization (MELO)",
    "title": "Student Leadership Conference",
    "description": "Upcoming event hosted by Management and Entrepreneur Leadership Organization (MELO) on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2027-04-12",
    "time": "12:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/student-leadership-conference-3/",
    "eventId": "evt-melo-20270412-30"
  },
  {
    "clubId": "club-melo",
    "clubName": "Management and Entrepreneur Leadership Organization (MELO)",
    "title": "Student Leadership Conference",
    "description": "Upcoming event hosted by Management and Entrepreneur Leadership Organization (MELO) on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2027-04-12",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/student-leadership-conference-4/",
    "eventId": "evt-melo-20270412-31"
  },
  {
    "clubId": "club-pride",
    "clubName": "Pride Club",
    "title": "Lavender Graduation Ceremony",
    "description": "Upcoming event hosted by Pride Club on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2027-05-06",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/lavender-graduation-ceremony-2/",
    "eventId": "evt-pride-20270506-32"
  },
  {
    "clubId": "club-bsu",
    "clubName": "Black Student Union",
    "title": "Black Student Graduation Ceremony",
    "description": "Upcoming event hosted by Black Student Union on CUNY SPS OpenLab. Join online or check the event link for full agenda and meeting details.",
    "date": "2027-05-13",
    "time": "6:00 PM",
    "format": "Virtual",
    "location": "Zoom (Virtual)",
    "url": "https://openlab.sps.cuny.edu/events/event/black-student-graduation-ceremony/",
    "eventId": "evt-bsu-20270513-33"
  }
];

export const ALL_CATEGORIES = [
  'All',
  'Academic & Technology',
  'Academic & Professional',
  'Advocacy & Community',
  'Arts, Media & Creative',
  'Identity, Faith & Cultural',
  'Wellness & Peer Support',
  'Honor Societies',
  'Social & Special Interest'
] as const;

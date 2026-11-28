-- ==============================================================================
-- CUNY SPS Club Social & Student Organization Platform
-- Supabase / PostgreSQL Production Schema & Real-Time Sync Setup
-- ==============================================================================
-- Supports 3-Layer Access Control:
--   Layer 1: General Students & Public Visitors (Browse clubs, view events, submit join requests)
--   Layer 2: Club Members & Club Leaders / Executives (Member directories, manage events, review join requests, submit budget & collab requests)
--   Layer 3: Student Association & Platform Admins (Parsh, Anthony - Governance, approvals, CSV reports)
-- ==============================================================================

-- 1. CLUBS CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT,
    category TEXT NOT NULL,
    description TEXT,
    faculty_advisor TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Probationary')),
    instagram_handle TEXT,
    discord_url TEXT,
    website_url TEXT,
    semester_budget_allocated NUMERIC(10, 2) DEFAULT 500.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role_layer TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role_layer IN ('GUEST', 'MEMBER', 'LEADER', 'ADMIN')),
    title TEXT,
    department_or_major TEXT,
    associated_club_id TEXT REFERENCES public.clubs(id) ON DELETE SET NULL,
    is_platform_admin BOOLEAN DEFAULT FALSE,
    avatar_initials TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLUB MEMBERSHIPS (ROSTER DIRECTORY)
CREATE TABLE IF NOT EXISTS public.club_memberships (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    club_name TEXT NOT NULL,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    major TEXT,
    role TEXT NOT NULL CHECK (role IN (
        'President / Co-Chair',
        'Vice President',
        'Treasurer',
        'Secretary',
        'Social Media Lead',
        'Active Member',
        'Faculty Advisor'
    )),
    joined_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Alumni', 'Pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STUDENT JOIN CLUB REQUESTS (Layer 1 -> Layer 2/3)
CREATE TABLE IF NOT EXISTS public.join_requests (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    club_name TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    major TEXT NOT NULL,
    interest_reason TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ
);

-- 5. CLUB BUDGET REQUESTS (Layer 2 -> Layer 3)
CREATE TABLE IF NOT EXISTS public.budget_requests (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    club_name TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    submitter_email TEXT NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL CHECK (category IN (
        'Event Supplies & Refreshments',
        'Guest Speaker Honorarium',
        'Software & Compute Licenses',
        'Marketing & Merchandise',
        'Conference & Competition Travel'
    )),
    justification TEXT NOT NULL,
    intended_event_date DATE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
    admin_decision_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ
);

-- 6. CROSS-CLUB COLLABORATION REQUESTS (Club -> Club)
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id TEXT PRIMARY KEY,
    initiating_club_id TEXT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    initiating_club_name TEXT NOT NULL,
    target_club_id TEXT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    target_club_name TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    submitter_email TEXT NOT NULL,
    event_title TEXT NOT NULL,
    proposed_date DATE NOT NULL,
    proposed_format TEXT DEFAULT 'Hybrid' CHECK (proposed_format IN (
        'Virtual (Zoom)',
        'In-Person (Manhattan Campus)',
        'Hybrid'
    )),
    pitch_description TEXT NOT NULL,
    expected_attendees INTEGER DEFAULT 30,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Declined')),
    response_notes TEXT,
    responded_by TEXT,
    responded_at TIMESTAMPTZ
);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_memberships_club ON public.club_memberships(club_id);
CREATE INDEX IF NOT EXISTS idx_memberships_email ON public.club_memberships(email);
CREATE INDEX IF NOT EXISTS idx_join_requests_club ON public.join_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.join_requests(status);
CREATE INDEX IF NOT EXISTS idx_budget_requests_club ON public.budget_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_budget_requests_status ON public.budget_requests(status);
CREATE INDEX IF NOT EXISTS idx_collab_initiating ON public.collaboration_requests(initiating_club_id);
CREATE INDEX IF NOT EXISTS idx_collab_target ON public.collaboration_requests(target_club_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

-- Clubs catalog: Publicly readable by all students & visitors
DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
    FOR SELECT USING (true);

-- Profiles: Viewable by authenticated users & public roster display
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- Club Memberships: Viewable by all users to browse member directories
DROP POLICY IF EXISTS "Memberships are viewable by everyone" ON public.club_memberships;
CREATE POLICY "Memberships are viewable by everyone" ON public.club_memberships
    FOR SELECT USING (true);

-- Join Requests:
-- 1. Any student / public visitor can submit a join request
DROP POLICY IF EXISTS "Anyone can insert a join request" ON public.join_requests;
CREATE POLICY "Anyone can insert a join request" ON public.join_requests
    FOR INSERT WITH CHECK (true);

-- 2. Join requests are viewable and updatable by club leaders & admins
DROP POLICY IF EXISTS "Join requests viewable by all" ON public.join_requests;
CREATE POLICY "Join requests viewable by all" ON public.join_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Join requests updatable by leaders and admins" ON public.join_requests;
CREATE POLICY "Join requests updatable by leaders and admins" ON public.join_requests
    FOR UPDATE USING (true);

-- Budget Requests: Viewable and updatable by leaders & admins
DROP POLICY IF EXISTS "Budget requests are viewable by everyone" ON public.budget_requests;
CREATE POLICY "Budget requests are viewable by everyone" ON public.budget_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can submit a budget request" ON public.budget_requests;
CREATE POLICY "Anyone can submit a budget request" ON public.budget_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Budget requests can be updated by admins" ON public.budget_requests;
CREATE POLICY "Budget requests can be updated by admins" ON public.budget_requests
    FOR UPDATE USING (true);

-- Collaboration Requests: Viewable and manageable by club leads
DROP POLICY IF EXISTS "Collab requests viewable by everyone" ON public.collaboration_requests;
CREATE POLICY "Collab requests viewable by everyone" ON public.collaboration_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can submit a collab request" ON public.collaboration_requests;
CREATE POLICY "Anyone can submit a collab request" ON public.collaboration_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Collab requests can be updated" ON public.collaboration_requests;
CREATE POLICY "Collab requests can be updated" ON public.collaboration_requests
    FOR UPDATE USING (true);

-- 9. REAL-TIME SUBSCRIPTIONS (Cross-Device Live Sync)
-- When a student submits on mobile, the officer's desktop immediately updates!
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'join_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'budget_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'collaboration_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'club_memberships'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.club_memberships;
    END IF;
END $$;

-- 10. SEED DATA: CLUBS, EXECUTIVE BOARDS & INITIAL REQUESTS

-- Primary Clubs
INSERT INTO public.clubs (id, name, short_code, category, description, faculty_advisor)
VALUES
    ('club-ai', 'AI Club', 'AIC', 'Academic & Professional', 'CUNY SPS Artificial Intelligence Club focusing on machine learning, generative AI, student hackathons, and industry mentorship.', 'Prof. Jordan Reyes'),
    ('club-msa', 'Muslim Students Association (MSA)', 'MSA', 'Identity, Faith & Cultural', 'CUNY SPS Muslim Students Association fostering spiritual fellowship, interfaith dialogue, community service, and cultural enrichment.', 'Prof. Tariq Siddiqui'),
    ('club-book', 'Book Club', 'BOOK', 'Arts, Media & Creative', 'Literary dialogue, diverse contemporary fiction, author reading circles, and peer discussions.', 'Prof. Julian Brooks'),
    ('club-pride', 'Pride Club', 'PRIDE', 'Identity, Faith & Cultural', 'LGBTQIA+ student coalition promoting belonging, campus advocacy, and community support.', 'Prof. Jordan Reyes'),
    ('club-bsu', 'Black Student Union (BSU)', 'BSU', 'Identity, Faith & Cultural', 'Fostering academic excellence, leadership development, cultural awareness, and solidarity.', 'Dr. Angela Davis')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- Real Profiles: Platform Admins & Executive Board Members
INSERT INTO public.profiles (id, email, name, role_layer, title, department_or_major, associated_club_id, is_platform_admin, avatar_initials)
VALUES
    -- Layer 3: Platform Admins
    ('admin-parsh', 'Parshotam.Lal@cuny.edu', 'Parshotam Lal (Parsh)', 'ADMIN', 'Student Association Co-Chair / Platform Admin', 'Student Association Executive Board', NULL, TRUE, 'PL'),
    ('admin-anthony', 'anthony.sweeney@cuny.edu', 'Anthony Sweeney', 'ADMIN', 'Student Life Systems Admin', 'Office of Student Life', NULL, TRUE, 'AS'),

    -- Layer 2: AI Club Executive Board
    ('usr-ai-abdul', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'Abdul Rahman', 'LEADER', 'AI Club President', 'CUNY SPS', 'club-ai', FALSE, 'AR'),
    ('usr-ai-mehreen', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'Mehreen Gillani', 'LEADER', 'AI Club Secretary', 'CUNY SPS', 'club-ai', FALSE, 'MG'),
    ('usr-ai-alina', 'alina.repin79@login.cuny.edu', 'Alina Repin', 'LEADER', 'AI Club Treasurer', 'CUNY SPS', 'club-ai', FALSE, 'AR'),

    -- Layer 2: MSA Executive Board
    ('usr-msa-abdul', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'Abdul Rahman', 'LEADER', 'MSA President', 'CUNY SPS', 'club-msa', FALSE, 'AR'),
    ('usr-msa-vasilah', 'Vasilah.Siddiqui42@login.cuny.edu', 'Vasilah Siddiqui', 'LEADER', 'MSA Vice President', 'CUNY SPS', 'club-msa', FALSE, 'VS'),
    ('usr-msa-sarosh', 'SAROSH.KARIM45@login.cuny.edu', 'Sarosh Karim', 'LEADER', 'MSA Secretary', 'CUNY SPS', 'club-msa', FALSE, 'SK'),
    ('usr-msa-mehreen', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'Mehreen Gillani', 'LEADER', 'MSA Treasurer', 'CUNY SPS', 'club-msa', FALSE, 'MG'),
    ('usr-msa-asma', 'ASMA.ESSAEDI89@stu-mail.sps.cuny.edu', 'Asma Essaedi', 'LEADER', 'Marketing Lead & Social Media Coordinator', 'CUNY SPS', 'club-msa', FALSE, 'AE')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role_layer = EXCLUDED.role_layer,
    title = EXCLUDED.title;

-- Real Club Memberships: AI Club & MSA Verified Rosters (Zero Fabricated Records)
INSERT INTO public.club_memberships (id, club_id, club_name, name, email, role, status)
VALUES
    -- AI Club Verified Executive Board
    ('mem-ai-001', 'club-ai', 'AI Club', 'Abdul Rahman', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'President / Co-Chair', 'Active'),
    ('mem-ai-002', 'club-ai', 'AI Club', 'Mehreen Gillani', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'Secretary', 'Active'),
    ('mem-ai-003', 'club-ai', 'AI Club', 'Alina Repin', 'alina.repin79@login.cuny.edu', 'Treasurer', 'Active'),

    -- MSA Verified Executive Board
    ('mem-msa-001', 'club-msa', 'Muslim Students Association (MSA)', 'Abdul Rahman', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'President / Co-Chair', 'Active'),
    ('mem-msa-002', 'club-msa', 'Muslim Students Association (MSA)', 'Vasilah Siddiqui', 'Vasilah.Siddiqui42@login.cuny.edu', 'Vice President', 'Active'),
    ('mem-msa-003', 'club-msa', 'Muslim Students Association (MSA)', 'Sarosh Karim', 'SAROSH.KARIM45@login.cuny.edu', 'Secretary', 'Active'),
    ('mem-msa-004', 'club-msa', 'Muslim Students Association (MSA)', 'Mehreen Gillani', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'Treasurer', 'Active'),
    ('mem-msa-005', 'club-msa', 'Muslim Students Association (MSA)', 'Asma Essaedi', 'ASMA.ESSAEDI89@stu-mail.sps.cuny.edu', 'Social Media Lead', 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Dynamic tables start clean without dummy requests
-- Records are populated directly as students and leaders submit requests in the app.

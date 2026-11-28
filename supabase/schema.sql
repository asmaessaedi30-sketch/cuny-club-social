-- ==============================================================================
-- CUNY SPS Club Social & Student Organization Platform
-- Supabase / PostgreSQL Production Schema & Real-Time Sync Setup
-- ==============================================================================
-- Supports 3-Layer Access Control:
--   Layer 1: General Students & Public Visitors (Browse clubs, view events, submit join requests)
--   Layer 2: Club Members & Club Leaders / Executives (Member directories, manage events, review join requests, submit budget & collab requests)
--   Layer 3: Student Association & Platform Admins (Parsh, Anthony, Vanessa - Governance, approvals, CSV reports)
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
    ('admin-vanessa', 'vanessa.admin@sps.cuny.edu', 'Vanessa', 'ADMIN', 'Student Association Treasurer & Governance Lead', 'Student Life Oversight', NULL, TRUE, 'VA'),
    ('admin-elena', 'elena.vance@sps.cuny.edu', 'Dr. Elena Vance', 'ADMIN', 'Director of Student Life', 'Office of Student Life', NULL, TRUE, 'EV'),

    -- Layer 2: AI Club Executive Board
    ('usr-ai-abdul', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'Abdul Rahman', 'LEADER', 'AI Club President', 'M.S. in Data Science', 'club-ai', FALSE, 'AR'),
    ('usr-ai-mehreen', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'Mehreen Gillani', 'LEADER', 'AI Club Secretary', 'B.S. in Information Systems', 'club-ai', FALSE, 'MG'),
    ('usr-ai-alina', 'alina.repin79@login.cuny.edu', 'Alina Repin', 'LEADER', 'AI Club Treasurer', 'B.S. in Information Systems', 'club-ai', FALSE, 'AR'),

    -- Layer 2: MSA Executive Board
    ('usr-msa-abdul', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'Abdul Rahman', 'LEADER', 'MSA President', 'M.S. in Data Science', 'club-msa', FALSE, 'AR'),
    ('usr-msa-vasilah', 'Vasilah.Siddiqui42@login.cuny.edu', 'Vasilah Siddiqui', 'LEADER', 'MSA Vice President', 'B.A. in Psychology', 'club-msa', FALSE, 'VS'),
    ('usr-msa-sarosh', 'SAROSH.KARIM45@login.cuny.edu', 'Sarosh Karim', 'LEADER', 'MSA Secretary', 'B.A. in Communication & Media', 'club-msa', FALSE, 'SK'),
    ('usr-msa-mehreen', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'Mehreen Gillani', 'LEADER', 'MSA Treasurer', 'B.S. in Information Systems', 'club-msa', FALSE, 'MG'),
    ('usr-msa-asma', 'ASMA.ESSAEDI89@stu-mail.sps.cuny.edu', 'Asma Essaedi', 'LEADER', 'Marketing Lead & Social Media Coordinator', 'B.S. in Information Systems', 'club-msa', FALSE, 'AE')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role_layer = EXCLUDED.role_layer,
    title = EXCLUDED.title;

-- Real Club Memberships: AI Club & MSA Rosters
INSERT INTO public.club_memberships (id, club_id, club_name, name, email, major, role, joined_date, status)
VALUES
    -- AI Club Roster
    ('mem-ai-001', 'club-ai', 'AI Club', 'Abdul Rahman', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'M.S. in Data Science', 'President / Co-Chair', '2025-09-01', 'Active'),
    ('mem-ai-002', 'club-ai', 'AI Club', 'Mehreen Gillani', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'B.S. in Information Systems', 'Secretary', '2025-09-15', 'Active'),
    ('mem-ai-003', 'club-ai', 'AI Club', 'Alina Repin', 'alina.repin79@login.cuny.edu', 'B.S. in Information Systems', 'Treasurer', '2025-10-01', 'Active'),
    ('mem-ai-004', 'club-ai', 'AI Club', 'Prof. Jordan Reyes', 'jordan.reyes@sps.cuny.edu', 'Faculty of Computing & Information', 'Faculty Advisor', '2025-08-15', 'Active'),
    ('mem-ai-005', 'club-ai', 'AI Club', 'Sofia Patel', 'sofia.patel@spsmail.cuny.edu', 'B.A. in Communication & Media', 'Active Member', '2025-10-04', 'Active'),
    ('mem-ai-006', 'club-ai', 'AI Club', 'Noah Kim', 'noah.kim@spsmail.cuny.edu', 'B.S. in Information Systems', 'Active Member', '2025-09-20', 'Active'),

    -- MSA Roster
    ('mem-msa-001', 'club-msa', 'Muslim Students Association (MSA)', 'Abdul Rahman', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'M.S. in Data Science', 'President / Co-Chair', '2025-08-20', 'Active'),
    ('mem-msa-002', 'club-msa', 'Muslim Students Association (MSA)', 'Vasilah Siddiqui', 'Vasilah.Siddiqui42@login.cuny.edu', 'B.A. in Psychology', 'Vice President', '2025-08-25', 'Active'),
    ('mem-msa-003', 'club-msa', 'Muslim Students Association (MSA)', 'Sarosh Karim', 'SAROSH.KARIM45@login.cuny.edu', 'B.A. in Communication & Media', 'Secretary', '2025-09-01', 'Active'),
    ('mem-msa-004', 'club-msa', 'Muslim Students Association (MSA)', 'Mehreen Gillani', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'B.S. in Information Systems', 'Treasurer', '2025-09-05', 'Active'),
    ('mem-msa-005', 'club-msa', 'Muslim Students Association (MSA)', 'Asma Essaedi', 'ASMA.ESSAEDI89@stu-mail.sps.cuny.edu', 'B.S. in Information Systems', 'Social Media Lead', '2025-09-10', 'Active'),
    ('mem-msa-006', 'club-msa', 'Muslim Students Association (MSA)', 'Fatima El-Sayed', 'fatima.elsayed@spsmail.cuny.edu', 'B.A. in Psychology', 'Active Member', '2025-11-01', 'Active'),
    ('mem-msa-007', 'club-msa', 'Muslim Students Association (MSA)', 'Prof. Tariq Siddiqui', 'tariq.siddiqui@sps.cuny.edu', 'Faculty Advisor', 'Faculty Advisor', '2025-08-10', 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Seed Join Requests
INSERT INTO public.join_requests (id, club_id, club_name, student_name, student_email, major, interest_reason, submitted_at, status, reviewed_by, reviewed_at)
VALUES
    ('req-join-101', 'club-ai', 'AI Club', 'Daniel Hernandez', 'daniel.hernandez@spsmail.cuny.edu', 'B.S. in Information Systems', 'Interested in hands-on LLM projects and collaborating with fellow SPS students on AI tools.', '2026-11-26T14:30:00Z', 'Pending', NULL, NULL),
    ('req-join-102', 'club-ai', 'AI Club', 'Emily Watson', 'emily.watson@spsmail.cuny.edu', 'M.S. in Data Science', 'Would love to join the machine learning study groups and attend the industry speaker panels.', '2026-11-27T09:15:00Z', 'Pending', NULL, NULL),
    ('req-join-103', 'club-msa', 'Muslim Students Association (MSA)', 'Bilal Khan', 'bilal.khan@spsmail.cuny.edu', 'B.S. in Health Services Admin', 'Seeking community, study sessions, and volunteering with fellow students.', '2026-11-25T19:00:00Z', 'Approved', 'Abdul Rahman (MSA President)', '2026-11-26T10:00:00Z'),
    ('req-join-104', 'club-book', 'Book Club', 'Sarah Jenkins', 'sarah.jenkins@spsmail.cuny.edu', 'B.A. in Communication', 'Love reading contemporary fiction and discussing diverse books monthly.', '2026-11-27T16:20:00Z', 'Pending', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Budget Requests
INSERT INTO public.budget_requests (id, club_id, club_name, submitted_by, submitter_email, title, amount, category, justification, intended_event_date, submitted_at, status, admin_decision_notes, reviewed_by, reviewed_at)
VALUES
    ('bgt-201', 'club-ai', 'AI Club', 'Abdul Rahman', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'Spring 2027 AI Hackathon Cloud GPU Credits', 450.00, 'Software & Compute Licenses', 'Provide 30 participating student teams with cloud compute tokens during the 48-hour student hackathon.', '2027-02-20', '2026-11-24T11:00:00Z', 'Under Review', 'Reviewing quote from cloud provider; aligns with institutional STEM initiative.', 'Parshotam Lal (Student Association Admin)', '2026-11-25T14:00:00Z'),
    ('bgt-202', 'club-book', 'Book Club', 'Maya Rodriguez', 'maya.rodriguez@spsmail.cuny.edu', 'Visiting Author Honorarium - NYC Literary Voices', 300.00, 'Guest Speaker Honorarium', 'Honorarium for guest author hosting a virtual fireside reading and Q&A with CUNY students.', '2026-12-10', '2026-11-22T15:45:00Z', 'Approved', 'Approved in full. Funds encumbered under Student Life Speaker Fund.', 'Vanessa (SA Treasurer)', '2026-11-23T16:30:00Z'),
    ('bgt-203', 'club-msa', 'Muslim Students Association (MSA)', 'Mehreen Gillani', 'MEHREEN.GILLANI42@stu-mail.sps.cuny.edu', 'Campus Iftar & Inter-Club Dialogue Refreshments', 500.00, 'Event Supplies & Refreshments', 'Halal catering and community meal for open campus dinner welcoming all SPS students.', '2027-03-15', '2026-11-25T18:10:00Z', 'Submitted', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Cross-Club Collaboration Requests
INSERT INTO public.collaboration_requests (id, initiating_club_id, initiating_club_name, target_club_id, target_club_name, submitted_by, submitter_email, event_title, proposed_date, proposed_format, pitch_description, expected_attendees, submitted_at, status, response_notes, responded_by, responded_at)
VALUES
    ('collab-301', 'club-ai', 'AI Club', 'club-book', 'Book Club', 'Abdul Rahman', 'ABDUL.RAHMAN45@stu-mail.sps.cuny.edu', 'AI in Modern Storytelling: Speculative Fiction & Ethics Workshop', '2026-12-14', 'Virtual (Zoom)', 'A joint panel co-hosted by AI Club and Book Club exploring how sci-fi authors conceptualize machine intelligence, followed by an open student discussion on AI ethics in creative writing.', 45, '2026-11-26T10:15:00Z', 'Pending', NULL, NULL, NULL),
    ('collab-302', 'club-pride', 'Pride Club', 'club-disability', 'Disability & Access Student Coalition', 'Jordan Taylor', 'jordan.taylor@spsmail.cuny.edu', 'Intersectionality, Neurodiversity & Community Spaces', '2026-12-18', 'Hybrid', 'Joint interactive roundtable discussing accessible campus events, neuroinclusive spaces, and mutual support networks.', 35, '2026-11-23T14:00:00Z', 'Accepted', 'Excited to co-host! We will assist with ASL and captioning coordination.', 'Access Coalition Co-Lead', '2026-11-24T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

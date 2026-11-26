import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { renderToString } from 'react-dom/server';
import { StudentDiscoveryApp } from '../src/components/StudentDiscoveryApp';
import { CLUBS_DATA, EVENTS_DATA } from '../src/data/clubDiscoveryData';

test('Screen 1 (Home) renders required hero, CTA, featured clubs, and events', () => {
  const html = renderToString(React.createElement(StudentDiscoveryApp));

  // 1. Hero text and primary CTA
  assert.match(html, /Find your next club at CUNY SPS/i, 'Must contain required hero title');
  assert.match(html, /Explore clubs/i, 'Must contain primary Explore clubs CTA');

  // 2. Featured clubs & upcoming events
  assert.match(html, /Featured Student Clubs/i, 'Must contain Featured Clubs section');
  assert.match(html, /Upcoming Campus Events/i, 'Must contain Upcoming Events section');
  assert.match(html, /Artificial Intelligence Club/i, 'Must show featured AI club');

  // 3. Mobile responsiveness safeguards
  assert.match(html, /overflow-x-hidden/i, 'Root container must guard against sideways scrolling');
  assert.match(html, /w-full/i, 'Containers must be fluidly responsive');

  // 4. Top utility bar social networks (LinkedIn & Facebook)
  assert.match(html, /https:\/\/www\.linkedin\.com\/school\/cuny-school-of-professional-studies\//i, 'Top header must feature student LinkedIn link');
  assert.match(html, /https:\/\/www\.facebook\.com\/cunysps\//i, 'Top header must feature SPS Facebook link');
  assert.match(html, /Student LinkedIn/i, 'Must have Student LinkedIn action label');
  assert.match(html, /SPS Facebook/i, 'Must have SPS Facebook action label');

  // 5. Removed external demo
  assert.doesNotMatch(html, /missme2026/i, 'Companion mobile demo link must be removed');
  assert.doesNotMatch(html, /Interactive Mobile Demo/i, 'Interactive mobile demo button must be removed');
});

test('Screen 2 (Directory Dataset) contains all 34 recognized clubs and metadata', () => {
  assert.equal(CLUBS_DATA.length, 34, 'Must catalog all 34 recognized CUNY SPS student clubs');
  
  const aiClub = CLUBS_DATA.find((c) => c.clubId === 'club-ai');
  assert.ok(aiClub, 'AI Club must exist');
  assert.equal(aiClub.name, 'Artificial Intelligence Club');
  assert.ok(aiClub.whoItWelcomes.length > 20, 'Who It Welcomes must be informative');
  assert.ok(aiClub.channels.length >= 3, 'Must have WhatsApp, Instagram, and OpenLab Hub channels');
});

test('Screen 3 (Club Profile & Channels) includes verified direct action links and omits unverified channels', () => {
  const aiClub = CLUBS_DATA.find((c) => c.clubId === 'club-ai');
  assert.ok(aiClub);

  const whatsapp = aiClub.channels.find((ch) => ch.platform === 'whatsapp');
  assert.ok(whatsapp, 'WhatsApp channel must exist');
  assert.equal(whatsapp.actionLabel, 'Join WhatsApp');
  assert.match(whatsapp.url, /^https:\/\/chat\.whatsapp\.com\//);

  assert.ok(aiClub.logoUrl, 'AI club must have verified logoUrl');
  assert.equal(aiClub.logoUrl, './club-logos/ai-club.jpg');

  const instagram = aiClub.channels.find((ch) => ch.platform === 'instagram');
  assert.ok(instagram, 'Instagram channel must exist');
  assert.equal(instagram.url, 'https://www.instagram.com/cuny_sps_ai_club/');

  const website = aiClub.channels.find((ch) => ch.platform === 'website');
  assert.ok(website, 'OpenLab website channel must exist');
  assert.match(website.url, /^https:\/\/openlab\.sps\.cuny\.edu\//);

  // Facebook and LinkedIn are institutional CUNY SPS channels not affiliated directly to AI club and are omitted
  const facebook = aiClub.channels.find((ch) => ch.platform === 'facebook');
  assert.equal(facebook, undefined, 'Institutional Facebook must be omitted from AI club profile');

  const linkedin = aiClub.channels.find((ch) => ch.platform === 'linkedin');
  assert.equal(linkedin, undefined, 'Institutional LinkedIn must be omitted from AI club profile');

  // TikTok is unverified on official sources and must be omitted per privacy guidelines
  const tiktok = aiClub.channels.find((ch) => ch.platform === 'tiktok');
  assert.equal(tiktok, undefined, 'Unverified TikTok link must be omitted from site');

  // Verify all channels present on AI club have Verified badge
  for (const ch of aiClub.channels) {
    assert.equal(ch.badge, 'Verified Official Link');
  }

  // Verify Disability and Access Coalition has verified Instagram and logo
  const dacClub = CLUBS_DATA.find((c) => c.clubId === 'club-disability-access');
  assert.ok(dacClub, 'Disability and Access Coalition must exist');
  const dacInstagram = dacClub.channels.find((ch) => ch.platform === 'instagram');
  assert.ok(dacInstagram, 'DAC Instagram channel must exist');
  assert.equal(dacInstagram.url, 'https://www.instagram.com/dacsps/');
  assert.equal(dacClub.logoUrl, './club-logos/disability-access.jpg');
});

test('Screen 4 (Events) contains event schedule and club linkage with 12-hour formatted times', () => {
  assert.ok(EVENTS_DATA.length >= 10, 'Must catalog upcoming campus events from student life and clubs');

  // Verify prototype event titles are completely removed
  const autonomousMeeting = EVENTS_DATA.find(e => e.title.includes('Autonomous ML Agents'));
  assert.equal(autonomousMeeting, undefined, 'Prototype meeting "Autonomous ML Agents" must not exist');

  const buildNight = EVENTS_DATA.find(e => e.title.includes('Civic Tech Build Night'));
  assert.equal(buildNight, undefined, 'Prototype meeting "Civic Tech Build Night" must not exist');

  // Verify authentic AI club meetings from OpenLab exist
  const aiMeetings = EVENTS_DATA.filter(e => e.clubId === 'club-ai');
  assert.ok(aiMeetings.length >= 3, 'Must catalog authentic AI club meetings from calendar');
  for (const aim of aiMeetings) {
    assert.match(aim.title, /(AI Club Meeting|Artificial Intelligence Club Meeting)/i);
  }
  assert.ok(EVENTS_DATA.length >= 10, 'Must catalog upcoming campus events from student life and clubs');
  for (const ev of EVENTS_DATA) {
    assert.ok(ev.clubId, 'Every event must link to a valid clubId');
    assert.ok(ev.title, 'Every event must have a title');
    assert.ok(ev.date, 'Every event must have a date');
    // Ensure time is in 12-hour format with AM or PM, not military 24 hours
    assert.match(ev.time, /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i, `Event "${ev.title}" time must be in 12-hour format (e.g. 7:00 PM), got: ${ev.time}`);
    const matchedClub = CLUBS_DATA.find((c) => c.clubId === ev.clubId);
    assert.ok(matchedClub, `Event "${ev.title}" must link to an existing club`);
    // Verify that passed events (September, October, Nov 24 past events, etc.) are excluded
    assert.ok(ev.date >= '2026-11-25', `Passed event "${ev.title}" on ${ev.date} must not be included`);
  }

  // Explicitly verify passed event from 2026-11-24 is removed
  const passedEvent = EVENTS_DATA.find((e) => e.eventId === 'evt-sigma-beta-delta-20261124-2' || e.date < '2026-11-25');
  assert.equal(passedEvent, undefined, 'Passed event from 2026-11-24 must be removed from catalog');
});

test('Screen 5 (Official School Forms) maps all 34 clubs to official CUNY SPS join forms and directory', () => {
  assert.equal(CLUBS_DATA.length, 34);
  for (const club of CLUBS_DATA) {
    assert.ok(club.joinUrl, `Club ${club.name} (${club.clubId}) must have an official joinUrl`);
    assert.match(
      club.joinUrl,
      /^(https:\/\/(forms\.office\.com|forms\.cloud\.microsoft)\/|https:\/\/sps\.cuny\.edu\/student-success\/student-life\/student-clubs-and-organizations)/,
      `Club ${club.name} joinUrl must point to Microsoft Forms or CUNY SPS directory`
    );
  }

  const aiClub = CLUBS_DATA.find((c) => c.clubId === 'club-ai');
  assert.ok(aiClub);
  assert.equal(aiClub.joinUrl, 'https://forms.office.com/r/jSfyJUzCqG', 'AI Club must link directly to its official Microsoft Join Form');
});

test('Screen 6 (Public Safety) verifies Officer Portal and Officer Login are completely removed', () => {
  const html = renderToString(React.createElement(StudentDiscoveryApp));
  assert.doesNotMatch(html, /Officer Portal/i, 'Officer Portal button must not exist in public UI');
  assert.doesNotMatch(html, /Officer Login/i, 'Officer Login button must not exist in public UI');
  assert.doesNotMatch(html, /Club Officer & Management Portal/i, 'Management Portal button must not exist in public UI');
});

test('Screen 7 (Event Accuracy) verifies RSVP counts are completely removed and Student Life Calendar is linked', () => {
  const html = renderToString(React.createElement(StudentDiscoveryApp));
  assert.doesNotMatch(html, /RSVPs registered/i, 'Inaccurate RSVP registered counts must not exist in UI');
  assert.doesNotMatch(html, /Students Registered/i, 'Students Registered counts must not exist in UI');
  assert.match(
    html,
    /https:\/\/openlab\.sps\.cuny\.edu\/groups\/cuny-sps-student-life\/events\//i,
    'Must provide direct link to official Student Life Calendar'
  );

  const psychClub = CLUBS_DATA.find((c) => c.clubId === 'club-psychology');
  assert.ok(psychClub);
  const openlabHub = psychClub.channels.find((ch) => ch.url === 'https://openlab.sps.cuny.edu/groups/psychology-club/');
  assert.ok(openlabHub, 'Psychology Club must link to OpenLab Hub');
});

test('Screen 8 (Prototype Removal) verifies prototype Faculty Advisors and Meeting Formats are completely removed', () => {
  const html = renderToString(React.createElement(StudentDiscoveryApp));
  assert.doesNotMatch(html, /Faculty Advisor:/i, 'Prototype Faculty Advisor label must not exist in public UI');
  assert.doesNotMatch(html, /Prof\. Claire Bennett/i, 'Prototype advisor Prof. Claire Bennett must not exist');
  assert.doesNotMatch(html, /Prof\. Jordan Reyes/i, 'Prototype advisor Prof. Jordan Reyes must not exist');
  assert.doesNotMatch(html, /Meeting Format:/i, 'Prototype Meeting Format label must not exist in public UI');
  assert.doesNotMatch(html, /Bi-Weekly Online Gatherings/i, 'Prototype Bi-Weekly Online Gatherings must not exist in public UI');

  for (const club of CLUBS_DATA) {
    assert.equal(club.facultyAdvisor, undefined, `Club ${club.name} must not contain prototype facultyAdvisor`);
    assert.equal(club.meetingSchedule, undefined, `Club ${club.name} must not contain prototype meetingSchedule`);
  }
});

test('Screen 9 (Progressive Web App - PWA) validates manifest, service worker, icons, and install UI', () => {
  const rootDir = path.resolve(__dirname, '..');

  // 1. Web App Manifest
  const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public directory');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'CUNY SPS Club Social Hub');
  assert.equal(manifest.short_name, 'ClubSocialHub');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#0B0B0F');
  assert.equal(manifest.background_color, '#0B0B0F');
  assert.ok(manifest.icons && manifest.icons.length >= 3, 'Must contain at least 192x192, 512x512, and maskable icons');

  // 2. Icon files exist on disk
  for (const icon of manifest.icons) {
    const cleanSrc = icon.src.replace(/^\.\//, '');
    const iconFilePath = path.join(rootDir, 'public', cleanSrc);
    assert.ok(fs.existsSync(iconFilePath), `Icon file ${icon.src} must exist at ${iconFilePath}`);
    const stat = fs.statSync(iconFilePath);
    assert.ok(stat.size > 500, `Icon file ${icon.src} must have valid non-empty byte size`);
  }

  // 3. Apple Touch Icon exists
  const appleIconPath = path.join(rootDir, 'public', 'apple-touch-icon.png');
  assert.ok(fs.existsSync(appleIconPath), 'apple-touch-icon.png must exist in public directory');

  // 4. Service Worker script
  const swPath = path.join(rootDir, 'public', 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist in public directory');
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert.match(swContent, /addEventListener\(['"]install['"]/i, 'sw.js must handle install event');
  assert.match(swContent, /addEventListener\(['"]activate['"]/i, 'sw.js must handle activate event');
  assert.match(swContent, /addEventListener\(['"]fetch['"]/i, 'sw.js must handle fetch event for offline support');

  // 5. HTML Entry Points
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.match(indexHtml, /<link\s+rel=["']manifest["']\s+href=["']\.\/manifest\.webmanifest["']/i, 'index.html must link to manifest.webmanifest');
  assert.match(indexHtml, /<meta\s+name=["']theme-color["']\s+content=["']#0B0B0F["']/i, 'index.html must set theme-color to #0B0B0F');
  assert.match(indexHtml, /<link\s+rel=["']apple-touch-icon["']/i, 'index.html must set apple-touch-icon');
  assert.match(indexHtml, /navigator\.serviceWorker\.register/i, 'index.html must register service worker');

  // 6. Component Install Prompt UI
  const appHtml = renderToString(React.createElement(StudentDiscoveryApp));
  assert.match(appHtml, /Install App/i, 'StudentDiscoveryApp must render install action');
  assert.match(appHtml, /PWA/i, 'Must display PWA badge');
});

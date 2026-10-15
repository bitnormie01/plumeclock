# Resource pack — IEEE ClimateChain Global Hackathon (Devpost challenge 29114)

Built by Step 0a (resource-extractor), fetch date **2026-10-15 (IST)**, headless run (Grok Bot executor). Tools: **WebFetch**, **WebSearch**, **curl** (public pages only, from the bot box — the sanctioned fallback for fetch-provider-blocked public pages), **bs4 text extraction of curl'd HTML**. No browser session was driven; no login, form, registration or wallet action was taken. No secrets in this pack.

## Contents
| File | What |
|---|---|
| `event.md` | Deadline (abs + IST), schedule, eligibility, submission format, judging criteria verbatim, prizes |
| `tracks.md` | 4 tracks (Devpost version + organizer-page version) |
| `sponsors/*.md` | One file per organizer body + `_unlisted-logos.md` |
| `prior-art.md` | Past winners/showcases, caveats, learning-session topics |
| `INDEX.md` | This file: provenance + Known conflicts |

## Provenance (every source)
Primary = the event's own Devpost pages or the organizer's own site. Secondary = third-party pages / user posts / search summaries. Confidence: H = fetched and read in full; M = fetched but partial/derived; L = snippet or unverified.

| # | URL | Fetched | Tool | P/S | Confidence / gap |
|---|---|---|---|---|---|
| 1 | https://ieee-climatechain-hack.devpost.com/ | 2026-10-15 | WebFetch + curl(HTML) | P | H. Sponsor logos are images (alt text only). "Session 2 coming up next" widget is stale. |
| 2 | https://ieee-climatechain-hack.devpost.com/rules | 2026-10-15 | WebFetch + curl | P | H. Contains `Prizes TBD` (WebFetch dropped it; seen in raw HTML). No tracks, no prize amounts, no country list. |
| 3 | https://ieee-climatechain-hack.devpost.com/details/dates | 2026-10-15 | WebFetch + curl | P | H. |
| 4 | https://ieee-climatechain-hack.devpost.com/updates (+ 6 posts: /updates/45893-…, 46083-…, 46300-…, 46435-…, 46814-…, 46860-…) | 2026-10-15 | WebFetch (list), curl (full posts) | P | H. Posts say "about 2 months ago … 7 days ago" (relative). |
| 5 | https://ieee-climatechain-hack.devpost.com/forum_topics and /forum_topics/45102-session-1-recording-and-clarification-on-submission-window | 2026-10-15 | WebFetch + curl | S (participant posts, on the primary site) | M. One topic, 1 participant comment + the opening post; **no organizer reply**. Participant claims unverified. |
| 6 | https://ieee-climatechain-hack.devpost.com/project-gallery | 2026-10-15 | WebFetch + curl | P | H. Gallery unpublished → empty. |
| 7 | https://ieee-climatechain-hack.devpost.com/resources | 2026-10-15 | WebFetch + curl | P | H. Page has no content (not a real tab; header only). |
| 8 | https://ieee-climatechain-hack.devpost.com/participants | 2026-10-15 | curl | P | `Please log in to browse this hackathon's participants.` — **gated, gap**. |
| 9 | https://cmte.ieee.org/turkiye-blockchain/hackatlon/ | 2026-10-15 | WebFetch (curl got Cloudflare 403) | P (organizer) | H. **Disagrees with Devpost** (see conflicts). Not linked from Devpost; found via WebSearch. |
| 10 | https://cmte.ieee.org/turkiye-blockchain | 2026-10-15 | WebFetch | P | H. |
| 11 | https://blockchain.ieee.org/about/ | 2026-10-15 | WebFetch (curl 403) | P (sponsor body) | H. |
| 12 | https://r6.ieee.org/ocs/engineering-in-medicine-and-biology-society/ | 2026-10-15 | WebFetch (curl 403) | P | M. 2024 officer list; page old. |
| 13 | https://www.ieee.org.tr/about-ieee-turkiye/ | 2026-10-15 | WebFetch | P | M. Member count dated May 2016. |
| 14 | https://www.ito.org.tr/en/about-icoc/about-us | 2026-10-15 | WebFetch | P | H (general; no hackathon content). |
| 15 | https://yapayzekaekosistemi.org.tr/ | 2026-10-15 | WebFetch | P | H (Turkish; my translation labeled). |
| 16 | https://events.vtools.ieee.org/m/574108 , /m/571960 | 2026-10-15 | curl | P | M. vTools pages partially login-timeouted; 574108 is now titled Session 3. |
| 17 | Devpost galleries/projects: sbsboston, dlt-climate-hackathon, climatehackathon galleries; ~20 /software/* pages (listed in prior-art.md) | 2026-10-15 | curl + bs4; WebSearch for discovery | S | H for fields quoted; winner status per Devpost badges/announcement posts. |
| 18 | ETHGlobal showcase pages (5, listed in prior-art.md) | 2026-10-15 | curl + WebSearch | S | H. |
| 19 | https://www.refiturkiye.com/en/2024/07/24/akbank-refi-hackathon-2/ ; https://blokzincir.bilgem.tubitak.gov.tr/en/…-istanbul-blockchain-week-2023-hackathon/ | 2026-10-15 | WebSearch snippet + curl 200 | S | M. Akbank page date ambiguity. |
| 20 | https://drive.google.com/file/d/1UZhCKErxrOssnk0Kaw_oC3mUs9H2BZkE/view (Recording 1) ; …/1e5QNi4gWUegeFRatQQxi73hAv4Nt4JY0/view (Recording 2) | 2026-10-15 | curl status only | P | Rec 1 → 200; **Rec 2 → 401 (unverified)**. Recordings not watched/transcribed — **gap**. |
| 21 | WebSearch queries: "IEEE Blockchain Türkiye hackathon winners previous edition"; "Devpost climate blockchain hackathon winners…"; "IEEE ClimateChain Global Hackathon 2026"; ETHGlobal carbon/ReFi; P2P energy; DPP supply chain; IoT climate; IEEE blockchain hackathon | 2026-10-15 | WebSearch | S | L (discovery only; every cited item re-fetched). |

## Gaps
- **Not fetched / gated:** Devpost submission form (login), participants list (login), event-specific Official Rules/Terms (none linked), recordings' content, excluded-country list (not published anywhere found), judge bios beyond Devpost titles.
- **Needs a real browser (JS/auth or blocked):** none of the public Devpost pages were empty shells (all rendered via WebFetch/curl). The only candidates for a browser pass: (1) https://ieee-climatechain-hack.devpost.com/forum_topics — organizer replies/other topics may be loaded dynamically (only 1 topic visible in raw HTML); (2) the two Drive recordings (Recording 2 needs auth); (3) the Devpost submit flow (login — **do not automate**); (4) https://cmte.ieee.org/turkiye-blockchain/* subpages returned Cloudflare 403 to curl (WebFetch worked for the hackathon page; other subpages — awards/history/working-groups — not read).

## Known conflicts (both versions recorded; NOT resolved)

| ID | Topic | Version A (source) | Version B (source) |
|---|---|---|---|
| (a) | Deadline vs. "start time" | `Deadline: Oct 25, 2026 @ 5:00pm MSK` (https://ieee-climatechain-hack.devpost.com/ , /details/dates: `October 25 at 5:00pm MSK`); overview also `October 25 at 10:00am EDT to deadline` (= same instant 14:00 UTC [computed]) | Rules: `Dont submit before official start time which 8 AM PT on October 25.` (https://ieee-climatechain-hack.devpost.com/rules). 8 AM PT = 15:00 UTC = 18:00 MSK = 20:30 IST, i.e. **after** the 5pm MSK (19:30 IST) deadline. A participant raised the same inconsistency (forum 45102); no organizer reply seen. Submissions-open per dates page: Oct 5 7:00am MSK. |
| (b) | Eligibility | Overview: `Students only`; `Companies/professional organizations excluded from participation` | Rules: students, `Academic researchers and faculty`, `Independent developers and startups`, `Environmental professionals and climate scientists`, `International participants (with country restrictions noted)` |
| (c) | Tracks | Overview "What to Build": 4 named tracks | Rules page: no tracks at all (and IEEE page names them differently — see (k)) |
| (d) | Prizes | Overview: `$ 3,000+ in prizes + other prizes`; `1st Prize TBD` / `$ 1,500 in cash`; 2nd `$ 1,000`; Third `$ 500`; header `$ 3,000 in cash` | Rules: `Prizes TBD`. (Overview itself also carries the label "1st Prize TBD".) IEEE page: no prizes. |
| (e) | Judging weights | Devpost (overview + rules): 5 criteria, **weights: not published** | IEEE page publishes weights: `70% Technical Innovation & Blockchain Implementation / 20% Climate Impact & Environmental Benefit / 10% Scalability & Real-World Implementation Potential` AND a 6-criterion list `Climate Impact & Environmental Benefit (30%) … Technical Innovation & Blockchain Implementation (30%) … Feasibility & Implementation Quality (10%) … Data Security & Transparency (10%) … User Experience & Design (10%) … Scalability & Sustainability (10%)` (https://cmte.ieee.org/turkiye-blockchain/hackatlon/). Criteria *names* also differ from Devpost's five. |
| (f) | Country restrictions | Overview: `Specific countries/territories excluded`; Rules: `International participants (with country restrictions noted)` | **No country is listed on any page.** |
| (g) | Submission deadline instant | Devpost: Oct 25 17:00 MSK (14:00 UTC; 19:30 IST) | IEEE page: `October 25, 2026 (11:59 PM UTC)` (= Oct 26 05:29 IST [computed]) |
| (h) | Judging end / winners | Devpost dates: judging ends Nov 08 5:00pm MSK; winners Nov 20 9:00am MSK | IEEE page: judging `October 26 – November 6, 2026`; winners `November 10-21, 2026 (at UN COP 31 Conference)` |
| (i) | Demo video length | Devpost overview + rules: `Demo Video (3–5 mins)` | IEEE page: `3-minute video demonstration` |
| (j) | Minimum age | Overview: `Above legal age of majority in country of residence` | IEEE page: restriction `Anyone age of below 18`; rules page: no age rule |
| (k) | Track names/examples | Devpost: Carbon Markets & Emissions Transparency · Renewable Energy & Energy Trading · Sustainable Supply Chains · Climate Data & Environmental Monitoring | IEEE page: Carbon Markets & Emissions Trading · Renewable Energy & Grid Management · Supply Chain Transparency & Circular Economy · Climate Data & Environmental Monitoring (different examples; e.g. "Satellite data integration for deforestation and land use tracking") |
| (l) | Learning sessions | Rules: S1 Aug 18; S2 Sep 8; **S3 Sep 15 "Blockchain and AI for Climate Change"**; S4 Sep 22 "Ethics and Responsibility…"; S5 Oct 5 "Good Practices…" | Updates: S1 **Aug 21**; S2 Sep 8; "Recording 1: Blockchain and AI for Climate Change"; Oct 4 "unable to conduct our previously planned … Session"; **S3 = Oct 9 "Ethics, Responsibility & Good Practices for Climate Innovation"** (merges rules' S4+S5 topics). Overview widget still says `Coming Up Next: Session 2 … September 08`. vTools link m/574108 was used for Session 2 posts (Sep) but the page is now titled Session 3. |
| (m) | Required submission items | Overview "What to Submit": also `Project Description`, `public GitHub`, `Prototype / Demo` | Rules page: Track Alignment, Demo Video, Code Repository (no "public"), Deadline only. IEEE page adds architecture diagram, spec, security & data-integrity assessment doc, ≤2-page problem statement, climate impact assessment, adoption strategy, roadmap, user-testing results; `deployed on test net acceptable`. |
| (n) | Criterion #5 name & wording | Overview: `Presentation & Communication`; "Technical Execution": `Does the project function as intend?` (typo, shorter) | Rules: `Presentation & Storytelling`; Technical Execution has an extra sentence (`well-implemented, technically sound, and appropriate for the proposed solution`) |
| (o) | Organizer list | Devpost: IEEE Blockchain Technical Group, IEEE Orange County EMBS, IEEE Orange County Section, IEEE Orange County Chapter, IEEE Türkiye Section, Istanbul Chamber of Commerce, AI Ecosystem Association of Türkiye; logos additionally show ISO, IEEE Southern California Council, IEEE Technology Sustainability | IEEE page: IEEE Blockchain Technical Committee, **IEEE Computer Society** Orange County Chapter/Section, IEEE Türkiye Section, Istanbul Chamber of Commerce, AI Ecosystem Association of Türkiye (intro also mentions IEEE Student Branches, Sections/Regions) |
| (p) | Scope: AI | Devpost: `leverage blockchain and AI technology`, title "AI and BLOCKCHAIN" | IEEE page: `blockchain technology` only (no AI) |
| (q) | Internal duration | IEEE page: `Hackathon Duration: October 5 – October 25, 2026 (2 weeks)` | Oct 5→Oct 25 is ~3 weeks [computed]; similarly judging Oct 26–Nov 6 labelled "(2 weeks)" |
| (r) | Submission form details | Neither Devpost page mentions a track selector or file upload | Participant post (unverified): `no dedicated track selector and requires a file upload (35 MB maximum)` (forum 45102) |

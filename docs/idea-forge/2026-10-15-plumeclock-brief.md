# Idea Forge Brief — PlumeClock: an on-chain accountability clock for satellite-detected methane super-emitters

> Working title "PlumeClock" is provisional — the builder may rename. This brief is the single source of
> truth handed to the architect (Step 1). It is a brief, not a spec: it fixes *what* and *why*, not *how*.

## Event + constraints

- **Date written:** 2026-10-15
- **Hackathon:** IEEE ClimateChain Global Hackathon (Devpost challenge 29114) — online; organized by the
  IEEE Blockchain Türkiye Group with IEEE and Türkiye partners, to "support the goals of UN COP 31".
  - Overview: https://ieee-climatechain-hack.devpost.com/
  - Rules: https://ieee-climatechain-hack.devpost.com/rules
  - Organizer page (disagrees with Devpost in places): https://cmte.ieee.org/turkiye-blockchain/hackatlon/
  - Resource pack: `docs/resources/2026-10-15-ieee-climatechain-hack/` — its `INDEX.md` lists the known
    conflicts by ID; this brief honours them and resolves none.
- **Hard deadline (inert calendar fact — builder-supplied; idea-forge does not gate on it):**
  **Oct 25, 2026, 17:00 MSK** = 14:00 UTC = 19:30 IST (Devpost overview + dates page). Recorded, not
  resolved: the rules page's "Dont submit before official start time which 8 AM PT on October 25"
  (= 20:30 IST, after that deadline) and the organizer page's "October 25, 2026 (11:59 PM UTC)" — pack
  INDEX (a), (g).
- **Platform:** testnet only. The organizer page says "deployed on test net acceptable"; Devpost is silent.
  No mainnet, no real funds.
- **Team:** solo + AI build pipeline (architect → executor pool → reviewer).
- **Builder skills:** all stacks (Solidity/EVM, TypeScript/React, Python/data/ML, Sui Move) — the stack
  follows the idea.
- **Risk posture:** novel-wow.
- **Required tech:** none mandated; no sponsor SDKs or bounties exist. Judges expect blockchain and/or AI
  applied to a real climate problem.
- **Buildability constraint:** the demo runs end-to-end on testnet + public/open datasets or simulated
  feeds — no IoT hardware, no partner data access, no mainnet, no real funds.
- **Deliverables (Devpost "What to Submit"):** track-alignment statement; project description (problem,
  solution, target users, scalability, adoption); demo video (3–5 min); public GitHub repo with source and
  documentation; working prototype / proof-of-concept. The organizer page lists a different set (adds an
  architecture diagram + technical specification, a "3-minute video demonstration", a security and
  data-integrity assessment, a ≤2-page problem statement, a climate impact assessment, an adoption
  strategy, a scalability roadmap, user-testing results) — pack INDEX (i), (m), recorded, not resolved.
  A video of about 3:00 sits inside both stated lengths.

## Problem

Satellites now spot methane super-emitters from orbit, and UNEP's Methane Alert and Response System
(MARS) notifies the government — and OGMP 2.0 member operators — about each one; yet UNEP's 2025 report
found "nearly 90 per cent of MARS alerts ignored". The notices travel privately, the public sees a coarse
status 30 days later, and nothing happens when an alert goes unanswered — while methane from human
sources drives about 30% of today's global warming (UNEP).

## Solution (one line)

PlumeClock: every satellite-detected methane super-emitter opens an on-chain ticket with a public
response clock — signed repair attestations and re-observation close it; ignored leaks auto-slash a
pledged bond to a mitigation fund.

## Must-have demo features (the minimum that makes the money shot land)

1. **Verifiable plume tickets (data → chain).** A pinned snapshot of UNEP IMEO's public MARS
   detected-plumes dataset is grouped by source; a feeder key posts the snapshot's Merkle root on-chain,
   and each ticket opens from a record anyone can check against that root. A ticket carries detection
   date, emission rate, sector, persistency, IMEO's published feedback status, a CO2e estimate, and a
   response deadline.
2. **The accountability state machine (Solidity — the security-sensitive core).** OPEN → RESPONDED (an
   operator's signed attestation: cause, action taken, evidence hash) → RESOLVED once replayed
   re-observations at that source show no plume. If the deadline passes with no response, anyone can call
   `slash()` and the operator's pledged bond moves to a mitigation fund. A DISPUTED path covers
   misattribution. Response flows use simulated operators only.
3. **Public map dashboard with an AI plume analyst.** A map of open / answered / slashed tickets with live
   countdowns, per-source history, the country response-rate overlay from IMEO's dataset, and an explorer
   link on every state change. An AI layer drafts each ticket's plain-language notice and a triage
   priority (impact × persistence × response history). It is not on the money shot's critical path and
   must degrade gracefully with no API key.

## Target sponsor track(s)

- **Climate Data & Environmental Monitoring** — one track; prizes are overall, not per track. Devpost
  framing: challenge "Enable reliable and accessible climate data systems"; problem "Environmental data is
  fragmented and difficult to verify"; build examples include "Climate data verification platforms" and
  "Tools for research and insights". The organizer-page version of this track adds satellite data
  integration (pack INDEX (k)).
- **Track-alignment statement (draft for the submission):** "Track: Climate Data & Environmental
  Monitoring. PlumeClock turns satellite methane detections — fragmented, published with a lag, and easy
  to ignore — into a verifiable public record with a response clock: every UNEP MARS plume becomes an
  on-chain ticket that anyone can check against the source data, and that closes only on a signed
  response plus satellite re-observation."

## Judging criteria (published)

**Devpost (overview + rules): five criteria, weights not published** — weighted equally here (builder
instruction; no weights invented):

1. **Climate Impact** — how effectively it addresses a real climate or environmental challenge
   (sustainability, environmental transparency, carbon tracking, renewable energy adoption, ecosystem
   protection).
2. **Innovation & Creativity** — fresh, innovative, exciting; a unique approach to applying blockchain or
   emerging technologies within the chosen track.
3. **Technical Execution** — does it function as intended; effective, technically sound use of blockchain,
   smart contracts, AI, data platforms, or environmental data integration.
4. **Practical Usefulness** — practical and scalable; realistically usable by organizations, communities,
   policymakers, or businesses.
5. **Presentation & Communication** (rules page: "Presentation & Storytelling") — a clear, engaging demo
   that communicates the climate problem, how the solution works, and the real-world environmental impact.

**Organizer page — recorded verbatim, NOT resolved (pack INDEX (e)):** "70% Technical Innovation &
Blockchain Implementation / 20% Climate Impact & Environmental Benefit / 10% Scalability & Real-World
Implementation Potential", and a second list: "Climate Impact & Environmental Benefit (30%) · Technical
Innovation & Blockchain Implementation (30%) · Feasibility & Implementation Quality (10%) · Data Security
& Transparency (10%) · User Experience & Design (10%) · Scalability & Sustainability (10%)". Downstream
stages should not optimize one version at the other's expense.

## Why it wins

Unlike the monitoring and verification projects in the prior-art set — ForestWatch (Filecoin Green SBS
Boston, "Public verifiability in sustainability" bonus), Omnii (ETHAmsterdam, Toucan 1st) and CarbonZ
(Chainlink Spring 2023 winner), which all verify carbon claims — PlumeClock targets the methane alerts
nobody answers (UNEP: MARS response rate 1% in 2024, 12% in 2025) and acts when a finding is ignored.
Against ForestWatch and Omnii it wins on Innovation & Creativity (the only one that enforces a response
deadline with an automatic, on-chain consequence — a live testnet `slash()`) and on Climate Impact
(methane drives about 30% of today's warming, per UNEP), ties on Technical Execution (we consume IMEO's
detections rather than run our own retrievals), and loses on no criterion.

## Demo money shot (~15 seconds)

A real super-emitter from UNEP's public MARS data drops onto the map, and PlumeClock opens an on-chain
ticket — "≈ N t CO2e/yr if it persists" — with a 30-day response clock (time-warped for the demo).
Operator A signs a repair attestation; the next replayed satellite pass shows no plume, and the ticket
turns green. Operator B stays silent: the clock hits zero, one `slash()` moves B's bond to the mitigation
fund, and the explorer shows the tx — accountability with consequences, on-chain, in one breath.

## Out of scope (explicit — keeps the build focused on the money shot)

- **No satellite retrievals or plume-detection models of our own** — PlumeClock consumes IMEO MARS
  detections (Carbon Mapper is an optional second source, not core).
- **No real notifications to, or onboarding / identity verification of, real operators or governments.**
  Response flows use simulated operators; real sources keep IMEO's published feedback status verbatim.
  Never portray a real operator as non-responsive beyond what IMEO itself publishes.
- **No mainnet, no real funds, no project or governance token, no methane credits or offsets.**
- **No IoT hardware, ground sensors, or live satellite tasking**, and no live-feed dependency in the demo
  (pinned snapshot only).
- **No multi-chain, no custom oracle network** (one feeder key posts snapshot roots), **no mobile app.**
- **Evidence archival to IPFS / Walrus is a stretch goal**, not required for the money shot.

## Target users, scale, adoption (for the submission's project description)

- **Users:** UNEP IMEO and national MARS focal points (a public, programmable accountability layer over
  data they already publish); gas buyers, lenders and insurers (a supplier's response record as a
  procurement or risk input); NGOs, journalists and researchers (a verifiable public record); operators
  (a credible way to prove they responded and fixed the leak).
- **Scale:** UNEP had sent 3,500+ alerts across 33 countries by its 2025 report — comfortably within one
  low-cost contract; MARS expanded alerts to coal and waste in 2026, so the same tickets extend beyond
  oil and gas.
- **Adoption:** starts with zero integration — it reads IMEO's public, regularly updated datasets;
  operators opt in by posting a bond (for example under a buyer's procurement terms or a voluntary
  pledge).

## Feasibility notes for the architect (primitives, not design)

No sponsor SDK applies; these are the data and platform facts the plan rests on, verified 2026-10-15
unless stated.

- **Primary data — UNEP IMEO "Eye on Methane // GLOBAL" (public; no login; HTTP 200 on 2026-10-15):**
  - Detected plumes, CSV:
    `https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip`
    (10.8 MB; Last-Modified 2026-10-15 03:06 GMT — refreshed frequently)
  - Detected plumes, GeoJSON:
    `https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_geojson.zip`
    (55.5 MB)
  - MARS response rate by country:
    `https://methanedata.unep.org/downloads/response_rate/unep_methanedata_responserate.zip`
    (37.7 KB; Last-Modified 2026-09-17)
  - Top-50 sources:
    `https://methanedata.unep.org/downloads/top50_emitters/latest/unep_methanedata_topemitter_sources.zip`
    (250 KB; Last-Modified 2026-09-16)
  - Listing page https://methanedata.unep.org/download-dataset · data dictionaries via
    https://methanedata.unep.org/story-MARS-snapshot · FAQ
    https://methanedata.unep.org/frequently-asked-questions
- **What a record carries (IMEO FAQ):** per source — detection date and emission flux rate, sector, oil
  and gas basin, persistency status, and a plume history (newest first) with feedback status. Feedback
  values named in the FAQ: "Notified, no response received", "Government responded", "Operator
  responded", "Government and operator responded". Inspect the CSV schema on day 1 — do not assume
  column names.
- **Publication lag:** detections become public 30 days after detection (or 30 days after notification,
  if one was issued). The public record is lagged; the demo replays it on a time-warped clock.
- **Coverage:** MARS began with oil and gas; UNEP announced alerts for the coal and waste sectors in 2026
  (UNEP item dated 4 May 2026).
- **License:** CC BY-NC-SA 4.0 — credit "UNEP's International Methane Emissions Observatory" with a link
  to Eye on Methane // GLOBAL; non-commercial use only (a hackathon PoC qualifies); ShareAlike applies to
  any adapted data the repo redistributes, so the fixture and derived files carry the same license
  notice. Commit an attributed fixture subset if size matters (the CSV zip is 10.8 MB).
- **IMEO caveats to design around:** "Confirming mitigation requires both satellite observations and
  complementary, on-the-ground information", and low response rates "may not necessarily signal
  indifference" (capacity and institutional barriers). So a ticket closes on attestation +
  re-observation, and a slash keys off *no response by the deadline*, never off a detection alone.
- **Problem-statement figures (quote with source):** UNEP Eye on Methane 2025 report — response rate 1%
  (2024) → 12% (2025), "nearly 90 per cent of MARS alerts ignored", 3,500+ alerts across 33 countries,
  25 documented mitigation cases in ten countries since 2022. A separate UNEP technical highlight gives
  ~10% (conflicting; quote whichever is used, with its source). UNEP FAQ: methane from human sources
  drives "about 30 per cent of today's global warming".
- **CO2e conversion:** IPCC AR6 GWP100 for fossil CH4 = 29.8 (GWP20 = 82.5). State the GWP and the
  persistence assumption next to every CO2e figure.
- **Optional second source:** Carbon Mapper data portal — its API needs a free account; data under a
  modified CC BY-SA 4.0, non-commercial. Not needed for the money shot.
- **Chain:** any EVM public testnet (Base Sepolia or Ethereum Sepolia). The kit's faucet library
  (`references/faucets/`) has no entries yet — the gate-concierge discovers and records one. A faucet that
  demands a mainnet balance is out (no real funds).
- **Local machine (tollgate, 2026-10-15):** Node v22.21.0 / npm 10.9.4; Python 3.12.13 and 3.11.15 via
  uv; ffmpeg 8.1.1; MetaMask present in Chrome. Foundry is not probed yet — the architect appends it as a
  stack row.
- **Secrets:** env-var names only — `DEPLOYER_PRIVATE_KEY`, `FEEDER_PRIVATE_KEY`,
  `OPERATOR_A_PRIVATE_KEY`, `OPERATOR_B_PRIVATE_KEY`, `RPC_URL`, `LLM_API_KEY` (optional; the AI analyst
  falls back to template text).
- **Day-1 external dependency:** testnet gas from a faucet (gate-concierge). The data needs no request —
  pin the snapshot and record its Last-Modified date.
- **Longest pole:** the ticket state machine + bond escrow + permissionless deadline enforcement (it moves
  funds, depends on time, and verifies signatures) — give it the highest reasoning effort and the most
  review. Second: the ingest pipeline (CSV → per-source records → Merkle root + proofs) that every
  ticket's verifiability rests on.

## Rubric mapping (why this won, for the record)

Weights mirror Devpost's five equally weighted criteria, with intrinsic buildability kept the highest
single weight (kit invariant): Technical Execution → buildability; Climate Impact + Practical Usefulness →
impact & usefulness fit (two of the five); Innovation & Creativity → Novelty; Presentation → Demo WOW.
Base 40 / 30 / 15 / 15, then `novel-wow` moves 5 points from buildability to Novelty: **Intrinsic
buildability 35 · Impact & usefulness 30 · Novelty 20 · Demo WOW + story 15.** From a field of 27
candidates plus 8 bolder rewrites (7 further variants knocked out at the buildability gate for external
blockers — licences, partner data, paid imagery, mainnet funds, registry approvals, IoT hardware),
PlumeClock scored **485** (5 · 4.5 · 5 · 5), ahead of a CBAM embedded-emissions passport (450) and an
EUDR plot prover (445); the EUDR idea also lost the judge's-eye head-to-head on Innovation (both halves
already exist in the prior-art set). Sensitivity: under the organizer page's blockchain-heavy weights
(recorded, not resolved), the CBAM passport's zero-knowledge depth would narrow the gap — so keep
PlumeClock's on-chain mechanics deep and visible (Merkle-proved data provenance, signed attestations,
permissionless deadline enforcement, a dispute path).

# Submission draft — PlumeClock · IEEE ClimateChain Global Hackathon (Devpost)

> Written by the architect (Step 1) on 2026-10-15, from the brief, the approved spec and the
> resource pack (`docs/resources/2026-10-15-ieee-climatechain-hack/`). The `TBD-post-build:` lines
> are facts that exist only after the build. `demo-studio` fills the demo-video URL, and the
> gate-concierge's closing pass fills the rest. It then pastes this draft into the form; filling the
> form and pressing Submit are two separate consent gates. Pack conflicts are cited by INDEX ID and
> are not resolved here.

## Deadline and form facts

- **Deadline:** Oct 25, 2026, 17:00 MSK = 14:00 UTC = **19:30 IST** (Devpost overview and dates
  page). Treat it as the hard deadline.
  - Also recorded, not resolved: the rules page's "8 AM PT on October 25" start-time line, which
    falls after that deadline (INDEX (a)).
  - Also recorded, not resolved: the organizer page's "October 25, 2026 (11:59 PM UTC)" (INDEX (g)).
- **Form:** the Devpost submission form is login-gated, so its exact fields are unverified.
  - A participant post (unverified, no organizer reply) says the form has **no track selector** and
    requires **a file upload (35 MB maximum)** (INDEX (r)). The track is therefore stated in the
    description below, and a PDF bundle is listed for upload.
- **Eligibility:** the overview says "Students only", while the rules also admit independent
  developers, researchers and professionals (INDEX (b)). The user confirms their own category before
  the Submit gate. This is not a build output.
- **Video length:** Devpost asks for 3–5 minutes; the organizer page asks for a 3-minute video
  (INDEX (i)). Aim for about 3:00, which satisfies both.

## Devpost "What to Submit" (verbatim checklist → where it is answered)

- [ ] `Track Alignment: Clearly state the track you've chosen and how your project addresses the challenge.` → **Track alignment** below
- [ ] `Project Description: Explain the problem, your solution, target users, how it can scale and how easily it can be adopted.` → **Project description** below
- [ ] `Demo Video (3–5 mins): Showcase your project in action, highlighting key features and functionality.` → **Links**: demo video
- [ ] `Code Repository: Provide a public GitHub (or equivalent) link with source code and documentation.` → **Links**: repository
- [ ] `Prototype / Demo: Share a working prototype, mockup, or proof-of-concept.` → **Links**: live dashboard and Base Sepolia contracts
- [ ] `Submission Deadline: Ensure your project is submitted before the official deadline to be eligible for judging.` → **Deadline** above

## Project name

PlumeClock

## Elevator pitch (tagline)

Every satellite-detected methane super-emitter gets an on-chain ticket and a public response clock;
ignored leaks slash a bond.

## Track alignment

**Track: Climate Data & Environmental Monitoring.**

PlumeClock is a climate-data verification platform for satellite detections of methane
super-emitters.

- **Verified data.** It pins UNEP IMEO's public *Eye on Methane* data byte-for-byte with SHA-256
  provenance. It commits every MARS-notified oil and gas source to a blockchain as one Merkle root.
  Anyone can then open a verifiable ticket for a source and check its record in the browser.
- **Accountability on top.** It adds what IMEO's response-rate data shows is missing: a public
  response clock with a consequence.

This answers the track's challenge ("Enable reliable and accessible climate data systems") and its
stated problem ("Environmental data is fragmented and difficult to verify").

## Project description

**Problem.** Methane from human activities drives about 30 per cent of today's global warming (IMEO
FAQ).

- UNEP's Methane Alert and Response System (MARS) notifies governments and OGMP 2.0 companies when
  satellites detect a super-emitter.
- Nearly 90 per cent of MARS alerts went unanswered (UNEP, *An Eye on Methane*, 2025).
- IMEO's country table for August 2025 – July 2026 shows feedback for only 199 of 1,105 notified
  sources.
- Notices travel privately, and the public sees a coarse status about 30 days later.
- Nothing happens when an alert is ignored.

**Solution.** PlumeClock gives every MARS alert a public, verifiable response clock with
consequences:

1. **Verifiable ticket.** A feeder posts IMEO's snapshot as a Merkle root on Base Sepolia. Anyone
   opens a ticket by proving a record against that root. The ticket shows:
   - the detection and the emission rate;
   - IMEO's published feedback status, verbatim;
   - the CO2e at stake if the emission persists for a year.
2. **Accountable answer.** Operators who opt in pledge a bond per source and answer with an EIP-712
   signed attestation (cause, action, evidence hash). A ticket closes only when a later
   re-observation shows no plume. A persisting plume reopens the clock.
3. **Consequence.** If the clock runs out on a bonded ticket, anyone can call `slash()`, and the bond
   moves to a mitigation fund.
4. **Transparency.** A public map shows every alert, country response rates, live clocks and an
   explorer link for every state change. An AI analyst (Claude) drafts plain-language notices next
   to a transparent, deterministic triage score.

**Target users:**

- **UNEP IMEO and national MARS focal points:** a public, programmable accountability layer over
  data they already publish.
- **Gas buyers, lenders and insurers:** a supplier's verifiable response record.
- **NGOs, journalists and researchers:** a tamper-evident record with Merkle proofs.
- **Operators:** a credible way to prove they responded and fixed a leak.

**How it can scale:**

- UNEP had sent 3,500+ alerts across 33 countries by 2025. That is a few thousand tickets a year,
  well within one low-cost L2 contract.
- Opening is batched, and the dashboard reads with paged views and one-block log queries.
- MARS extended alerts to coal and waste in 2026, and the same ticket format carries them.

**How easily it can be adopted:**

- **Zero-integration start.** PlumeClock reads IMEO's public downloads, with no partner data access
  and no new reporting duty.
- **Natural bonding triggers** for operators:
  - procurement terms (EU Methane Regulation importers, LNG offtakers);
  - lender or insurer covenants;
  - voluntary OGMP 2.0 pledges.
- **Governance path.** The feeder key would become IMEO's own posting key or a multisig. The arbiter
  role would go to a MARS focal point.

## How it works

1. **Pin.** `npm run pin` stores IMEO's detected-plumes and response-rate zips byte-for-byte, with
   SHA-256 provenance.
2. **Commit.** Every MARS-notified oil and gas source (about 1,900) becomes a Solidity-encoded
   record. The Merkle root over all of them is posted on-chain. The same leaf hash is pinned in both
   the TypeScript and the Solidity test suites.
3. **Open.** Anyone opens a ticket with a Merkle proof. The clock starts at open.
4. **Respond.** The bonded operator signs an EIP-712 attestation.
5. **Close or slash:**
   - a proven re-observation with no plume, newer than the response, resolves the ticket;
   - a persisting plume reopens it (at most twice);
   - a missed deadline lets anyone slash the bond into the MitigationFund.

**The demo (money shot):**

1. A real IMEO super-emitter opens a ticket with a 30-day clock, time-warped for the demo.
2. Operator A attests a repair, a replayed satellite pass shows no plume, and the ticket turns green.
3. Operator B stays silent. The clock hits zero, `slash()` moves B's bond to the fund, and Blockscout
   shows the transaction.

## Built with

solidity · foundry · openzeppelin · typescript · node.js · next.js · react · viem · d3-geo ·
anthropic-claude-api · base-sepolia · blockscout · unep-imeo-eye-on-methane

## Links

TBD-post-build: demo video URL
TBD-post-build: public GitHub repository URL (bitnormie01/plumeclock, after the consent-gated public flip)
TBD-post-build: live dashboard URL
Base Sepolia PlumeClock: 0x402931fa5b7e97049b1522a05a6019dfd6196ac4 — https://base-sepolia.blockscout.com/address/0x402931fa5b7e97049b1522a05a6019dfd6196ac4
Base Sepolia MitigationFund: 0x33fae8476373818d8eb813ca6b8d6e15376c03f9 — https://base-sepolia.blockscout.com/address/0x33fae8476373818d8eb813ca6b8d6e15376c03f9
Demo slash transaction (operator B, KAZ_S_003): https://base-sepolia.blockscout.com/tx/0xa0ed0c67ede010b3c17bbec8d5740e0aabd5f4be139a0316aef5556bc5937a27
TBD-post-build: dashboard screenshot for the image gallery (docs/img/dashboard.png)
TBD-post-build: upload file, a PDF bundle of docs/architecture.md, docs/security-and-data-integrity.md and docs/impact-and-adoption.md (≤ 35 MB), if the form asks for one

## Team

bitnormie01 (solo), with an AI build pipeline: an architect, executor subagents and a reviewer.

## Organizer-page deliverables (INDEX (m): recorded, not resolved)

The IEEE Blockchain Türkiye page lists extra deliverables that Devpost does not. Each one maps to a
repository document:

| Organizer-page deliverable | Where it is |
|---|---|
| Working prototype or proof-of-concept (deployed on test net acceptable) | Base Sepolia contracts and the live dashboard (Links) |
| Source code repository with clear documentation | the repository and `README.md` |
| Architecture diagram and technical specification | `docs/architecture.md` |
| 3-minute video demonstration | the demo video (about 3:00) |
| Security and data integrity assessment document | `docs/security-and-data-integrity.md` |
| Problem statement and solution overview (max 2 pages) | `docs/impact-and-adoption.md`, Problem statement and Solution overview |
| Climate impact assessment and carbon reduction projections | `docs/impact-and-adoption.md`, Climate impact assessment |
| Implementation and adoption strategy | `docs/impact-and-adoption.md`, Implementation and adoption strategy |
| Scalability and sustainability roadmap | `docs/impact-and-adoption.md`, Scalability and sustainability roadmap |
| User testing results (if applicable) | `docs/impact-and-adoption.md`, User testing (none run, stated plainly) |

**Judging:** Devpost's five criteria carry equal weight, since no weights are published. The
organizer page's weighted lists are recorded, not applied (INDEX (e)). The five criteria are Climate
Impact, Innovation & Creativity, Technical Execution, Practical Usefulness, and Presentation &
Communication.

## Honesty notes (keep in the description)

- **Real:** the IMEO detections and statuses.
- **Simulated, on Base Sepolia testnet only:** the operators, bonds, attestations and the
  re-observation replay. No real operator was named or contacted, and no real funds move.
- **Time-warped clock:** the 30-day clock runs as 180 seconds on the demo deployment.
- **Re-observations are replayed** from IMEO's published persistency status. PlumeClock runs no
  satellite retrievals of its own.
- **IMEO's caveat is shown with every status:** low response rates may not necessarily signal
  indifference.
- **Data credit:** UNEP's International Methane Emissions Observatory, *Eye on Methane // GLOBAL*
  (https://methanedata.unep.org), CC BY-NC-SA 4.0, used non-commercially with attribution.

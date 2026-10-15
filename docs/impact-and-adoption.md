# PlumeClock impact and adoption

## Problem statement

**Methane drives a large share of warming.** Methane from human activities drives about 30 per cent
of today's global warming (UNEP IMEO FAQ). Satellites can now see the biggest leaks, and UNEP's
Methane Alert and Response System (MARS) notifies governments, and OGMP 2.0 member companies, when a
super-emitter is detected.

**Most alerts go unanswered.** UNEP's *Eye on Methane 2025* report found that nearly 90 per cent of
MARS alerts went unanswered, even as the response rate rose from 1 per cent (2024) to 12 per cent
(2025). IMEO's newer country table (August 2025 – July 2026) shows feedback for 199 of 1,105 notified
sources (18 per cent). Thirteen of the 34 listed countries have a 0 per cent response
rate. IMEO itself cautions that low response rates may not necessarily signal indifference: some
countries lack trained teams or the legal power to compel a response.

**The process is slow and private.** Notices travel privately, the public sees a coarse status about
30 days later, and nothing happens when an alert is ignored. IMEO asks operators for final feedback
"within 30 calendar days post notification", but that clock has no public face and no consequence.

## Solution overview

PlumeClock gives every MARS alert a public, verifiable response clock with consequences:

1. **A verifiable ticket.**
   - A feeder commits IMEO's public snapshot to Base Sepolia as one Merkle root.
   - Anyone can open a ticket for any committed source by proving its record.
   - The ticket shows the detection, the emission rate, IMEO's published feedback status verbatim, and
     the CO2e at stake "if it persists".
2. **An accountable answer.**
   - Operators who opt in pledge a bond per source.
   - A bonded operator answers with an EIP-712 signed attestation: cause, action, and an evidence hash.
   - The ticket closes only when a later satellite re-observation shows no plume.
   - A persisting plume reopens the clock; after two failed fixes, only the deadline remains.
3. **A consequence.** If the clock runs out on a bonded ticket, anyone can call `slash()` and the bond
   moves to a mitigation fund.
4. **Transparency for everyone.**
   - A public map shows every alert, the country response-rate overlay, live clocks, and an explorer
     link for every state change.
   - An AI analyst drafts plain-language notices next to a transparent triage score.

## Climate impact assessment

**CO2e convention.** We use IPCC AR6 GWP100 for fossil methane (29.8). Every per-ticket figure states
its assumption: **if the emission persisted at the last-detected rate for a year**. For example, the
demo's operator B source (`KAZ_S_003`, last plume 7,847 kg/h) is ≈ 2.05 Mt CO2e per year on that
basis.

**Persistence-weighted estimates are lower and steadier.** IMEO's own estimate for the same source
(top-50 list, September 2026) is 29,871 t CH4 per year, or ≈ 0.89 Mt CO2e. Across IMEO's top-50
list, the estimated annual emissions are 1.71 Mt CH4 (1,705,493 t), or ≈ 50.8 Mt CO2e per year. Of that, the 20
notified sources account for ≈ 25.9 Mt CO2e, and the 8 notified sources with no feedback received
account for ≈ 8.3 Mt CO2e per year.

**Where PlumeClock acts.** It does not reduce emissions by itself. It raises the cost of ignoring an
alert and makes response records public, the two levers the response-rate data shows are missing.
Mitigation that MARS has already enabled proves the payoff. UNEP's 2025 report documented 25
mitigation cases in ten countries since 2022. IMEO's MARS page now reports over 40, and together
those sources had released an estimated 1.2 million tonnes of methane.

**A transparent projection, not a forecast.** If bonded clocks led just the 8 unanswered top-50
sources above to fix their leaks, avoided emissions would be up to ≈ 8.3 Mt CO2e per year (IMEO
persistence-weighted estimates). For scale, IMEO's top-50 sources range from about 0.3 to 5 Mt
CO2e per year each, with a median of about 0.8 Mt.

## Implementation and adoption strategy

- **Zero-integration start.** PlumeClock reads IMEO's public, regularly updated downloads. No partner
  data access or new reporting duty is needed to publish the clock.
- **Operators opt in by bonding.** Natural triggers are a gas buyer's procurement terms (an EU importer
  under the Methane Regulation, an LNG offtaker), a lender's or insurer's covenant, or a voluntary
  OGMP 2.0 pledge. Bonds can be small. What matters is that a missed deadline is public and costly.
- **Users:**
  - **UNEP IMEO and national MARS focal points** get a public, programmable accountability layer over
    data they already publish.
  - **Buyers, lenders and insurers** get a supplier's verifiable response record as a procurement or
    risk input.
  - **NGOs, journalists and researchers** get a tamper-evident public record with Merkle proofs.
  - **Operators** get a credible way to prove they responded and fixed a leak.
- **Governance path.** The single feeder key would become IMEO's own posting key or a multisig
  committee. The arbiter role would go to the relevant MARS focal point or a recognised dispute body.

## Scalability and sustainability roadmap

1. **Now (prototype):**
   - IMEO's whole notified oil and gas universe is committed in one root (about 1,900 sources).
   - About 40 tickets (the top recent emitters plus the two demo sources) open on Base Sepolia, and
     the money shot runs end to end.
2. **Next:**
   - Coal and waste alerts (MARS extended alerts to those sectors in 2026) use the same ticket
     format.
   - Add a bond unbonding delay, multisig feeder and arbiter roles, and archival of operator
     evidence to IPFS or Walrus.
3. **Scale:** UNEP had sent 3,500+ alerts across 33 countries by its 2025 report. That is a few
   thousand tickets a year, well within one low-cost L2 contract. Opening is batched (`openTickets`),
   and the dashboard reads state with paged views and one-block log queries.
4. **Sustainability:**
   - Running costs are L2 gas plus static hosting.
   - Slashed bonds fund mitigation work through a steward, with on-chain receipts.
   - The code is MIT-licensed so IMEO or any NGO can fork it.

## User testing

No external user testing was run during the hackathon. Evaluation so far:

- automated tests (Foundry unit and invariant suites, vitest suites, an anvil end-to-end run of the
  money shot);
- a manual review of the dashboard against IMEO's published statuses.

User interviews with an IMEO or MARS stakeholder, a gas buyer, and a newsroom data desk are the
first post-hackathon step.

## Sources

All pages were checked on 2026-10-15. CO2e figures use GWP100 = 29.8 (IPCC AR6 WG1, Chapter 7,
Table 7.15).

- **IMEO FAQ** (https://methanedata.unep.org/frequently-asked-questions):
  - methane's share of today's warming;
  - the request for final feedback within 30 calendar days.
- **UNEP press release, 22 October 2025**, for *An Eye on Methane: From measurement to momentum*
  (https://www.unep.org/news-and-stories/press-release/better-data-driving-action-methane-emissions-more-work-needed):
  - 3,500+ alerts across 33 countries;
  - response rate up from 1 to 12 per cent, with nearly 90 per cent unanswered;
  - 25 mitigation cases in ten countries.
- **IMEO MARS snapshot page** (https://methanedata.unep.org/story-MARS-snapshot):
  - over 40 mitigation cases and about 1,200,000 t of methane;
  - the caveat that low response rates may not necessarily signal indifference.
- **IMEO MARS response rates by country** (Last-Modified 17 Sep 2026), pinned in `data/imeo/`:
  - source: https://methanedata.unep.org/downloads/response_rate/unep_methanedata_responserate.zip,
    file `LATEST/2025-08-01_2026-07-31_Response_Rates.csv`;
  - figures: 199 of 1,105 sources with feedback; 13 of 34 countries at 0 per cent.
- **IMEO top-50 sources** (Last-Modified 16 Sep 2026; not pinned in this repo):
  - source: https://methanedata.unep.org/downloads/top50_emitters/latest/unep_methanedata_topemitter_sources.zip,
    file `2026-09/topemitter_sources_2026-09.csv`;
  - figures: 29,871 t CH4 for `KAZ_S_003`; 1,705,493 t in total; the 20 notified and 8 unanswered
    sources; the per-source range and median.
- **IMEO detected plumes**, pinned in `data/imeo/` (see `provenance.json`):
  - the per-ticket rates, such as 7,847 kg/h for `KAZ_S_003`;
  - the size of the notified oil and gas universe.
- **UNEP press release, 4 May 2026**, coal and waste alerts
  (https://www.unep.org/news-and-stories/press-release/satellite-methane-alerts-expanded-coal-and-waste-sectors-unep).

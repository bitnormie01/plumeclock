# PlumeClock — System Design Spec

> Status: **APPROVED by the user 2026-10-15** · Written 2026-10-15 by the architect (Step 1) · Source brief:
> `docs/idea-forge/2026-10-15-plumeclock-brief.md` · Resource pack:
> `docs/resources/2026-10-15-ieee-climatechain-hack/` (its `INDEX.md` conflicts are honoured, not
> resolved). This file is the single source of truth for *what* is built; the four plans under
> `docs/superpowers/plans/` say *how*, task by task.

## 0. Header — constraints (verbatim from the kickoff / brief)

| Field | Value |
|---|---|
| Project | PlumeClock — every satellite-detected methane super-emitter opens an on-chain ticket with a public response clock — signed repair attestations and re-observation close it; ignored leaks auto-slash a pledged bond to a mitigation fund. |
| Repo | `bitnormie01/plumeclock` (private until the submission's consent-gated public flip) |
| Event | IEEE ClimateChain Global Hackathon (Devpost challenge 29114), online |
| Hard deadline | **Oct 25, 2026, 17:00 MSK (19:30 IST, 14:00 UTC)**, supplied by the builder. Pack INDEX conflicts (a) and (g) are recorded, not resolved |
| Chain | EVM public testnet, **Base Sepolia (chain id 84532)** (user choice, 2026-10-15). Testnet only: no mainnet, no real funds |
| Contracts | Solidity `0.8.28` + Foundry (`forge 1.4.4-stable` probed on this machine) |
| App | TypeScript (strict, ESM) on Node 22 (`v22.21.0` probed) with Next.js + viem |
| Data | UNEP IMEO Eye on Methane public datasets, CC BY-NC-SA 4.0, as a **pinned snapshot**, plus simulated operators. No IoT hardware, no partner data access |
| Team | solo + AI |
| Judging | Devpost's 5 criteria, **weighted equally**, with no weights invented: Climate Impact · Innovation & Creativity · Technical Execution · Practical Usefulness · Presentation & Communication. The organizer page's weighted lists (INDEX (e)) are recorded, not resolved |
| Track | Climate Data & Environmental Monitoring |
| Deliverables | track-alignment statement; project description (problem, solution, target users, scalability, adoption); 3–5 min demo video; public repo with docs; working prototype/PoC |
| Must | land the demo money shot (brief §Demo money shot) |
| Out of scope | own satellite retrievals or plume detection; real notifications to, or onboarding of, real operators/governments; portraying any real operator as non-responsive beyond IMEO's published status; mainnet, real funds, tokens, credits/offsets; IoT hardware or live satellite tasking; any live-feed dependency in the demo; multi-chain, a custom oracle network, a mobile app |

## 1. Design decisions (question → answer → source)

| # | Question | Answer | Source |
|---|---|---|---|
| 1 | Which testnet? | Base Sepolia (2 s blocks, near-free gas, Blockscout verification needs no API key) | user, 2026-10-15 |
| 2 | May the architect inspect the real IMEO files? | Yes. Downloaded to scratch (not committed) on 2026-10-15: plumes zip `Last-Modified: Thu, 15 Oct 2026 03:06:52 GMT`, sha256 `7671c4dc…b4b5d5` | user, 2026-10-15 |
| 3 | Data pipeline language? | **TypeScript only.** Python is allowed but not needed. viem gives byte-exact Solidity ABI encoding for the Merkle leaves, and one toolchain means one `npm ci` | derived |
| 4 | Package manager | npm (pnpm is not installed) | probed |
| 5 | Solidity deps | `@openzeppelin/contracts@5.4.0` and `forge-std` (`github:foundry-rs/forge-std#v1.11.0`) installed **through npm**. No git submodules: one `npm ci` sets up both toolchains | derived |
| 6 | Bond asset | Native testnet ETH. No token of any kind | brief (no tokens) |
| 7 | Ticket key | One ticket per (IMEO `source_name`, `last_plume_date`) | derived |
| 8 | Re-observation source | **Replayed from IMEO's own published fields.** `persistency_category` `absent` = no plume in recent high-quality observations, so it replays as "no plume" | data inspection |
| 9 | When does a response clock start? | At ticket open. Opening is permissionless, so a keeper (the feeder in the demo) opens tickets right after posting a root | derived |
| 10 | Demo time-warp | The contract's `responseWindow` is an immutable constructor arg (testnet demo: **180 s**). The dashboard renders it as "30 days" (IMEO asks for final feedback "within 30 calendar days post notification") | brief + IMEO FAQ |
| 11 | AI provider | Anthropic Messages API (`@anthropic-ai/sdk`), default model **`claude-opus-5-5`** (override `LLM_MODEL`), `output_config.effort: "low"`, server-side `fallbacks: "default"`. **No key → deterministic template text** | claude-api skill defaults + brief |
| 12 | Who computes triage priority? | A deterministic formula (§6.3). The LLM only drafts prose and never changes state or scores | derived (responsible-AI) |
| 13 | Hosting the dashboard | Static export (`next build` → `out/`), host-agnostic. The live link is a closing-pass gate (`TBD-post-build`) | derived |
| 14 | Code license | MIT for code. The IMEO data keeps CC BY-NC-SA 4.0 with attribution plus a "changes made" notice | derived (default) |
| 15 | README schema | **R1-web-app v1** (the money shot is the map + explorer UI). No event overlay: `event.md` mandates no README headings | `references/readme-schemas.md` |
| 16 | One spec or four? | One system spec (the subsystems share the leaf encoding, ABI and fixture schemas) with **four plans**: contracts, data, dashboard, demo | decomposition gate |

## 2. What the judges see (money shot, ≈15 s)

A real super-emitter from IMEO's public MARS data drops onto the map. PlumeClock opens an on-chain
ticket, "≈ N t CO2e/yr if it persists (GWP100 29.8)", with a 30-day response clock (time-warped).
**Operator A** (simulated) signs an EIP-712 repair attestation. The replayed satellite pass shows no
plume and the ticket turns green. **Operator B** (simulated) stays silent: the clock hits zero, one
permissionless `slash()` moves B's bond to the MitigationFund, and Blockscout shows the tx.

**Both demo outcomes match what IMEO itself publishes** (rules in §5.4, verified on the 2026-10-15 file):

- **A = `IRQ_S_067`** (Iraq, pipeline valve, last plume 123,491 kg/h on 2025-10-31, 9 plumes).
  IMEO: *Government and operator responded*, `persistency_category = absent`. The "no plume"
  replay and the green ticket mirror IMEO's record.
- **B = `KAZ_S_003`** (Kazakhstan, transmission compressor station, 7,847 kg/h, 23 plumes, last
  2026-05-31). IMEO: *Notified – no response received*, `persistent`. The silence is exactly IMEO's
  published status, and its triage score (83/100) is the highest in the ticket set.

The pin task re-downloads on build day, so the rules may pick different sources. The rules are what
is locked, not these IDs (§5.4).

## 3. Architecture

```
IMEO public zips ──pin──► data/imeo/*.zip + provenance.json   (committed, verbatim, sha256-pinned)
                              │ build-fixtures (TS, viem)
                              ▼
                public/data/snapshot.json ── Merkle root R (1,941 leaves on 2026-10-15)
                public/data/notices.json  ◄── notices (template | Claude)
                              │
   feeder: postRoot(R) ───────┼──► PlumeClock (Base Sepolia) ──slash──► MitigationFund
   anyone: openTickets(R, records, proofs)        ▲  ▲
   operator: respond(EIP-712 sig) / dispute ──────┘  │
   feeder: postRoot(R′ re-observations); anyone: resolve / reopen
                              │ viem reads (getTickets, logs)
                              ▼
                 Next.js static dashboard (map · list · ticket panel · AI analyst)
```

**Repo layout** (one npm package at the root, Foundry configured from the root):

```
.gitattributes  .gitignore  .env.example  LICENSE  README.md
package.json  package-lock.json  tsconfig.json  vitest.config.ts  vitest.e2e.config.ts
foundry.toml  next.config.mjs  next-env.d.ts
contracts/src/{PlumeTypes,MitigationFund,PlumeBase,PlumeBonds,PlumeTickets,PlumeResponses,PlumeReobservations,PlumeClock}.sol
contracts/test/**.t.sol          contracts/test/utils/{Fixtures,MerkleHelper}.sol
data/imeo/{unep_methanedata_detected_plumes_csv.zip, unep_methanedata_responserate.zip, provenance.json, NOTICE.md}
src/lib/*.ts                     src/components/*.tsx        src/app/{layout,page}.tsx, globals.css
scripts/*.ts                     test/**/*.test.ts(x)        test/e2e/*.e2e.test.ts
public/data/{snapshot,notices}.json      public/deployments/<network>.json (+ .demo.json)
docs/{architecture,security-and-data-integrity,impact-and-adoption}.md
```

**Subsystems → plans** (each produces independently testable software):

| Plan | Owns | Depends on |
|---|---|---|
| `2026-10-15-plumeclock-contracts.md` | toolchain scaffold (Task 1), Solidity contracts + Foundry tests, ABI export to TS | none |
| `2026-10-15-plumeclock-data.md` | IMEO pin, parsing, records, selection rules, Merkle (TS), triage, AI notices, committed fixtures | contracts:1 (scaffold) |
| `2026-10-15-plumeclock-dashboard.md` | Next.js static dashboard | data (types, fixtures), contracts (ABI) |
| `2026-10-15-plumeclock-demo.md` | EIP-712 helpers, deploy + demo runner, anvil e2e, **human-gated** testnet deploy/demo, docs, README | all three |

## 4. Contracts (Solidity 0.8.28, OZ 5.4.0, `evm_version = "cancun"`, optimizer 200)

### 4.1 Layering (one file per task, no file edited by two tasks)

`PlumeTypes.sol` (enums, structs, errors, events interface) → `PlumeBase.sol` (abstract: immutables,
storage, roots, pure hashing, views, EIP712 + ReentrancyGuard) → `PlumeBonds.sol` (pledge/withdraw) →
`PlumeTickets.sol` (open) → `PlumeResponses.sol` (respond/dispute/settle) →
`PlumeReobservations.sol` (resolve/reopen) → `PlumeClock.sol` (slash, concrete constructor).
`MitigationFund.sol` is standalone.

### 4.2 Types (exact — TS mirrors them field-for-field, in this order)

```solidity
enum Status { None, Open, Responded, Resolved, Slashed, Disputed, Dismissed }
enum RootKind { None, Snapshot, Reobservation }
struct SourceRecord {            // one Merkle leaf per IMEO source (snapshot tree)
    bytes32 sourceId;            // IMEO source_name as ASCII, right-padded (e.g. "KAZ_S_003")
    string  lastPlumeId;         // id_last_plume (UUID)
    uint64  lastPlumeAt;         // last_plume_date as unix seconds, read as UTC
    uint32  rateKgPerHour;       // ch4_fluxrate of that last plume, rounded (kg/h)
    uint32  plumeCount;          // n_plumes_detected
    int32   latE5;               // round(lat * 1e5)
    int32   lonE5;               // round(lon * 1e5)
    string  country;             // verbatim
    string  sector;              // verbatim ("Oil and Gas")
    string  sourceType;          // verbatim
    string  persistency;         // persistency_category, verbatim
    string  notified;            // verbatim ("Yes")
    string  feedbackOperator;    // verbatim ("Yes" | "No" | "Not Applicable")
    string  feedbackGovernment;  // verbatim
}
struct Reobservation { bytes32 sourceId; uint64 observedAt; bool plumeDetected; string basis; }
struct Attestation   { bytes32 ticketId; string cause; string action; bytes32 evidenceHash; }
struct DisputeClaim  { bytes32 ticketId; string reason; bytes32 evidenceHash; }
struct RootInfo      { RootKind kind; uint64 postedAt; }
struct Bond          { address operator; uint256 amount; }
struct Ticket {
    bytes32 id; bytes32 sourceId; bytes32 snapshotRoot; address operator; Status status;
    uint32 rateKgPerHour; uint32 reopenCount; uint64 lastPlumeAt; uint64 openedAt; uint64 deadline;
    uint64 respondedAt; uint64 closedAt; uint64 pausedRemaining;
    uint256 co2eTonnesPerYear; uint256 slashedAmount;
}
```

**Leaf encoding (cross-language contract):** `leaf = keccak256(bytes.concat(keccak256(abi.encode(x))))`
where `x` is the whole struct (`SourceRecord` or `Reobservation`, tuple encoding). TS:
`keccak256(keccak256(encodeAbiParameters([tuple], [x])))`. Tree: OpenZeppelin `MerkleProof`
sorted-pair hashing, leaves sorted ascending by leaf hash, odd node carried up. A pinned test vector
is asserted on **both** sides (contracts Task 3, data Task 4).

**Derived values:** `ticketId = keccak256(abi.encode(sourceId, lastPlumeAt))`;
`co2eTonnesPerYear = rate * 8760 * 298 / 10000` (integer, floor). That is kg/h × hours/yr × GWP100
29.8 ÷ 1000, the emission "if it persists at the last-detected rate for a year".
Typehashes: `Attestation(bytes32 ticketId,string cause,string action,bytes32 evidenceHash)`,
`DisputeClaim(bytes32 ticketId,string reason,bytes32 evidenceHash)`. EIP-712 domain `{name:
"PlumeClock", version: "1", chainId, verifyingContract}`.

### 4.3 State machine

| From | Call (who) | Guards | To / effects |
|---|---|---|---|
| None | `openTicket(root, rec, proof)` / `openTickets(...)` (anyone) | root is `Snapshot`; proof valid; ticket id unused; if the source is bonded, it has no other active bonded ticket | **Open**: `operator` = the source's bond operator at open (0 = unbonded); `deadline = now + responseWindow` |
| Open | `respond(id, att, sig)` (anyone relays) | bonded; `now ≤ deadline`; `att.ticketId == id`; sig valid for `operator` (EOA or ERC-1271 via `SignatureChecker`); `reopenCount < MAX_REOPENS (2)` | **Responded**, `respondedAt = now` |
| Open | `dispute(id, claim, sig)` (anyone relays) | bonded; `now ≤ deadline`; sig valid | **Disputed**, clock paused (`pausedRemaining = deadline − now`) |
| Disputed | `settleDispute(id, upheld)` (arbiter) | none | upheld → **Dismissed** (closed, bond untouched); rejected → **Open**, `deadline = now + pausedRemaining` |
| Responded | `resolve(id, root, obs, proof)` (anyone) | root is `Reobservation`; proof valid; same source; `obs.observedAt > respondedAt`; `!obs.plumeDetected` | **Resolved** (closed; the bond stays pledged and withdrawable) |
| Responded | `reopen(id, root, obs, proof)` (anyone) | same, but `obs.plumeDetected` | **Open**, `deadline = now + responseWindow`, `reopenCount++` |
| Open | `slash(id)` (anyone) | bonded; `now > deadline` | **Slashed**: the whole source bond goes to `mitigationFund` and the bond record is deleted (CEI + `nonReentrant`) |

Bonds: `pledge(sourceId)` (payable; first pledger owns the source; top-ups by the same operator;
total ≥ `minBond`); `withdrawBond(sourceId)` (operator only, only while the source has no active
bonded ticket). Roots: `postRoot(root, kind, uri)` (feeder only, once per root). Immutables:
`feeder, arbiter, mitigationFund, responseWindow, minBond`. **No admin, no upgrade, no pause.**
Views: `rootInfo`, `getBond`, `getTicket`, `getTickets(start,count)`, `ticketCount`,
`getTransitionBlocks(id)` (block numbers of every state change, so the dashboard fetches each event
with a one-block `getLogs` and builds explorer links without wide log scans), `hashSourceRecord`,
`hashReobservation`, `attestationDigest`, `disputeDigest`, `co2eTonnesPerYear`, `ticketIdFor`.

**Invariants (tested):** contract ETH balance == Σ bonds; at most one active bonded ticket per
source; a closed ticket (Resolved/Slashed/Dismissed) never changes again; the fund only ever
receives slashed bonds. **MitigationFund:** `receive()` counts and emits; `disburse(to, amount,
memo)` is steward-only (steward = deployer in the PoC).

## 5. Data (IMEO snapshot → records → Merkle)

### 5.1 Pinned snapshot (verified schema, 2026-10-15)

`data/imeo/` holds the **verbatim** zips plus `provenance.json` (url, `Last-Modified`, bytes,
sha256, fetchedAt) and `NOTICE.md` (CC BY-NC-SA 4.0 attribution to UNEP's International Methane
Emissions Observatory, a link to Eye on Methane // GLOBAL, and a "changes made" statement).
`.gitattributes` marks `*.zip` binary.

- Plumes export: `https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip`
  (10,808,839 B). It contains `unep_methanedata_detected_plumes.csv` (30,449 rows),
  `unep_methanedata_detected_sources.csv` (4,226 rows), `LICENSE-CC-BY-NC-SA.txt` and a definitions PDF.
- Response rates: `https://methanedata.unep.org/downloads/response_rate/unep_methanedata_responserate.zip`
  (37,668 B). The CSV under `unep_methanedata_responserate/LATEST/` has the columns `country,
  notification_date_from, notification_date_until, n_sources_notified, n_sources_notified_feedback,
  response_rate (%)` and 34 rows.
- **The `methanedata.unep.org` host returns 403 to default node/curl user agents.** The pin script
  sends `User-Agent: PlumeClock-snapshot-pin/0.1 (+https://github.com/bitnormie01/plumeclock)`
  (verified 200).
- Sources CSV header (exact): `source_name,lon,lat,country,sector,source_type,persistency,
  persistency_std,persistency_category,n_plumes_detected,id_last_plume,last_plume_date,notified,
  feedback,feedback_operator,feedback_government`. The data dictionary's `emission_status` is
  **absent** from the real file and is not used. Plumes CSV columns used: `id_plume`, `source_name`,
  `satellite`, `tile_date`, `ch4_fluxrate`. Rates are integer-valued floats (`"3148.0"`); every
  timestamp is `YYYY-MM-DDTHH:MM:SS` (19 chars, UTC); `persistency_category` ∈ {`absent`,
  `Undetermined`, `sporadic`, `frequent`, `persistent`}.

### 5.2 Records

- **Universe U** = sources with `sector == "Oil and Gas"`, `notified == "Yes"`, and an
  `id_last_plume` whose plume row has a non-empty `ch4_fluxrate` (1,941 on 2026-10-15). Each
  becomes one `SourceRecord` (§4.2). The snapshot root commits to **all** of U.
- **Reference date** = the UTC date of the plumes zip's `Last-Modified`.
  **Recent R** = U with `lastPlumeAt ≥ referenceDate − 365 days` (1,103).
- **Feedback label** (IMEO FAQ wording, derived per record; `–` is U+2013): operator and government
  both "Yes" → `Government and operator responded`; operator only → `Operator responded`;
  government only → `Government responded`; otherwise → `Notified – no response received`.

### 5.3 Ticket set

The ticket set is the top 40 of R by `rateKgPerHour` (desc, ties by `source_name` asc) ∪ {A, B}. It
had 41 records on 2026-10-15. These are opened on-chain; the rest of U appears on the map as
committed, openable records.

### 5.4 Scenario rules (locked; the build fails loudly if either set is empty)

- **A** = max-rate record in R with `feedbackOperator == "Yes"`, `persistency == "absent"`,
  `plumeCount ≥ 2`.
- **B** = max-rate record in R with `feedbackOperator == "No"` and `feedbackGovernment == "No"`
  ("Notified – no response received"), `persistency == "persistent"`.
- Ties go by `source_name` asc.

### 5.5 Fixture files (committed, generated by scripts; schemas are exact in the data plan)

- `public/data/snapshot.json`: `schema: "plumeclock.snapshot.v1"`, provenance, `referenceDate`,
  `root`, `records[]` (every U record + `leaf`, `co2eTonnesPerYear`, `feedbackLabel`, `triage`),
  `ticketSet[]`, `proofs{}` (ticket set only), `scenario {operatorA, operatorB}`, `histories{}`
  (≤ 20 newest plumes per ticket-set source), and `responseRates[]` (each country with the mean
  lat/lon of its U sources, for the overlay bubble).
- `public/data/notices.json`: `schema: "plumeclock.notices.v1"`, `generator` (`"template"` or a
  model id), `notices{sourceName → {text, generator}}` for the ticket set.

## 6. AI plume analyst

1. **Triage score** (deterministic, shown with its factors). `impact = clamp((log10(co2e) − 3)/4,
   0, 1)`; persistence weight `persistent 1.0 · frequent 0.7 · sporadic 0.4 · undetermined 0.5 ·
   absent 0.1`; response factor `no response 1.0 · government 0.6 · operator 0.5 · both 0.3`;
   `score = round(100·impact·persistence·response)`. Priority is `high` at ≥ 40, `medium` at ≥ 15,
   otherwise `low`.
2. **Notice**: a short plain-language public notice per ticket. By default it is template text,
   four short factual sentences (the detection, the CO2e if it persists, the IMEO status, the
   triage). With `LLM_API_KEY`, Claude drafts 2–3 sentences: `client.beta.messages.create`
   (`claude-opus-5-5`, `max_tokens 2000`,
   effort `low`, `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`). The prompt
   carries only the record's facts and forbids speculation about operator identity or intent.
   Output must include the source id and be ≤ 600 chars, or that notice falls back to the template.
   A refusal, an API error, or an auth error (the latter switches the whole run to templates) also
   falls back. The committed file is template-generated: build agents hold no key. A human-gated
   task regenerates it with a key, which is optional.

## 7. Dashboard (Next.js 15.5 static export, React 19.2, d3-geo + world-atlas land, viem)

- **Layers:** world land; every U record as a faint dot in one of two colours (some feedback
  received vs. no response); the country response-rate overlay (bubble at the mean source location,
  colour = response rate, hover label "Kazakhstan: 20% response rate (10/50 notified sources)"); and
  the PlumeClock tickets as large markers coloured by status (pulsing while a bonded clock runs).
- **Ticket list** sorted by triage score. **Ticket panel**: IMEO facts verbatim + feedback label +
  the IMEO caveat ("low response rates may not necessarily signal indifference"); CO2e with "GWP100
  29.8, if it persists"; a live countdown (`remaining × 30d / responseWindow`, labelled with the
  time-warp); operator label from `deployment.actors` ("Operator A (simulated)"); bond; state
  history with **Blockscout links per transition**; a "Verify record" check that recomputes the
  leaf, checks the proof, and confirms `rootInfo(root).kind == Snapshot` on-chain; the AI notice +
  triage factors + "drafted by".
- **Honesty banner** (always visible): real IMEO detections; operators, bonds, attestations and
  re-observation replays are simulated on testnet; no real operator was contacted. Attribution
  footer per CC BY-NC-SA.
- **Data loading:** `/data/*.json` + `/deployments/${NEXT_PUBLIC_NETWORK ?? "base-sepolia"}.json`.
  Missing deployment → "snapshot-only" mode. Poll `getTickets` every 4 s. `NEXT_PUBLIC_BASE_PATH`
  supports GitHub Pages-style hosting.

## 8. Deploy & demo

- `scripts/deploy.ts --network anvil|base-sepolia` deploys MitigationFund + PlumeClock from the
  Foundry artifacts via viem and writes `public/deployments/<network>.json` (addresses, deployBlock,
  `responseWindowSeconds`, `minBondWei`, actors, **the public RPC URL only — never `RPC_URL`**).
  `--check` only prints each actor's address and balance and sends nothing.
- `scripts/demo.ts --network … [--deploy] [--fund]` runs the scenes. **Setup:** operators A and B
  pledge 0.001 ETH; the feeder posts R; the background tickets open unbonded. **Scene 1:** open
  A's and B's tickets. **Scene 2:** A signs and submits an attestation. **Scene 3:** the feeder
  posts the re-observation root R′ (replayed from `persistency`: `persistent`/`frequent` → plume,
  `absent`/`sporadic` → no plume, `Undetermined` omitted), then A is resolved. **Scene 4:** wait
  past B's deadline (anvil: `evm_increaseTime`), then slash B. Every tx prints its explorer link;
  the run log goes to `public/deployments/<network>.demo.json`.
- **Accounts:** anvil uses its unlocked accounts via JSON-RPC (no keys in code). The testnet reads
  `DEPLOYER_PRIVATE_KEY` (deployer = arbiter = fund steward), `FEEDER_PRIVATE_KEY`,
  `OPERATOR_A_PRIVATE_KEY`, `OPERATOR_B_PRIVATE_KEY` and optional `RPC_URL` from a git-ignored
  `.env` (`process.loadEnvFile`).
- **Human-gated** (`human_gate: true`, never run by an executor): testnet deploy + Blockscout
  verification; the testnet demo run (bond movements); the LLM notice regeneration (secret).

## 9. Error handling

| Failure | Behaviour |
|---|---|
| IMEO host 403 / schema drift | the pin/check scripts fail with the URL or the missing column named; the build stops at the data plan |
| Empty scenario set | `build-fixtures` throws `No candidate for operator A/B`, naming the rule |
| Bad proof / wrong root kind / bad sig / early slash | custom errors (`InvalidProof`, `WrongRootKind`, `BadSignature`, `DeadlineNotPassed`, …), asserted in tests |
| No deployment / RPC down | dashboard shows snapshot-only mode or "chain unreachable — retrying" and never crashes |
| No LLM key, refusal, or API error | template notice; `generator` records which |

## 10. Testing strategy

- Foundry unit tests per layer via harness contracts, plus a full-flow test, hostile-contract tests
  (reentrant operator and fund, an ERC-1271 wallet operator) and an invariant suite with four
  invariants (balance == bonds, fund == slashed, live active slots, closed tickets never change).
- vitest unit tests for every `src/lib` module with synthetic fixtures (deterministic). The
  snapshot-invariant tests run against the committed real fixtures.
- The **cross-language vector** (one `SourceRecord` → leaf hash) is pinned in both test suites.
- The **anvil e2e test** spawns anvil, deploys, runs every scene and asserts A Resolved, B Slashed,
  fund balance == B's bond. It is the strongest gate, run before any testnet step.
- Components are tested with @testing-library/react + jsdom. `next build` (static export) is the
  dashboard's final gate. The README gate is the schema conformance check.

## 11. Security, honesty, licensing

- **Trust assumptions** (documented in `docs/security-and-data-integrity.md`): the single feeder
  key is trusted to post faithful roots; the arbiter is trusted on disputes; operator ↔ source
  binding is self-asserted by pledging (production: attested by a buyer or a MARS focal point).
- **Known limits:** no unbonding delay (an operator could front-run a ticket open by withdrawing);
  `MAX_REOPENS = 2` caps attest-then-leak loops; unaudited; testnet only.
- **Portrayal rule:** no real operator is named (IMEO publishes none). Demo outcomes are chosen only
  where IMEO's published status agrees, and every simulated element is labelled.
- **Secrets:** env-var names only; `.env` is git-ignored; the deployment JSON never contains an RPC
  URL from `RPC_URL`.

## 12. Docs & submission

`docs/architecture.md` (Mermaid diagram + technical spec summary),
`docs/security-and-data-integrity.md`, and `docs/impact-and-adoption.md` (problem statement ≤ 2
pages, climate impact and CO2e method, adoption strategy, scalability roadmap, user testing: none
yet) cover the organizer-page deliverables (INDEX (m)) without resolving the conflict. README =
R1-web-app v1. `docs/gates/submission-draft.md` pre-fills the Devpost form with `TBD-post-build`
lines.

## 13. Explicitly not built

Our own retrievals, notifications to real parties, mainnet, tokens/credits, IoT, live feeds,
multi-chain, a custom oracle, a mobile app, a wallet-connect UI (the dashboard is read-only),
IPFS/Walrus evidence archival (stretch), and an unbonding delay (roadmap).

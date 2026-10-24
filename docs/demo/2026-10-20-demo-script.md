<!-- demo-script-schema: v1 -->
# PlumeClock — demo script

## 0 — Production card

| field | value |
|---|---|
| Project | PlumeClock (`bitnormie01/plumeclock`) |
| Event | IEEE ClimateChain Global Hackathon (Devpost 29114). Deadline Oct 25, 2026, 19:30 IST. Track: Climate Data & Environmental Monitoring |
| Target length | 3:00 (Devpost says 3–5 min, the organizer page says 3 min; 3:00 fits both) |
| Resolution / fps | 1920×1080 @ 30 |
| Voice | Kokoro (local, offline, English) |
| Music | off (captions only) |
| Wallet on camera | injected-signer + block-explorer shot. The demo signs with scripted burner keys in a terminal that is never filmed. The proof is the Blockscout page |
| Upload target | none. UPLOAD is struck; the final cut is a local file |
| Schema | v1 |

## 1 — Story & time budget

Prove: a real UNEP IMEO super-emitter becomes an on-chain ticket with a clock; an answered ticket closes green; a silent, bonded operator is slashed by one transaction anyone can check on Blockscout.
Money shot: scene S4 (the clock hits zero and `slash()` moves operator B's bond to the mitigation fund).

Devpost publishes five criteria and no weights, so they are weighted equally (36 s each of 180 s). No weights are invented.

| criterion | weight | seconds |
|---|---|---|
| Climate Impact | equal | 36 (S2 24 + S5 12) |
| Innovation & Creativity | equal | 36 (S3 24 + S4 12) |
| Technical Execution | equal | 36 (S2 12 + S4 24) |
| Practical Usefulness | equal | 36 (S5 18 + S6 18) |
| Presentation & Communication | equal | 36 (S1 24 + S6 12) |

## 2 — Pre-flight — set up before recording

Three things are on the screen: a **terminal** (runs the demo, never filmed), the **dashboard** in a clean browser window, and **Blockscout**. Do the rows in order.

| # | item | how to verify | ✓ |
|---|---|---|---|
| 1 | **App running.** Open a NEW PowerShell window (it already has the four burner keys). Run these one at a time: `cd "C:\ieee hackathon\ieee-climatechain-hack-2026"`, then `$env:Path="$env:USERPROFILE\.foundry\bin;$env:Path"`, then `npm run deploy -- --network base-sepolia`, then `npm run verify:contracts`, then `npm run check:deployment -- --network base-sepolia`, then `npm run build`, then `py -m http.server 3000 --directory out` (leave it running). Optional free practice run first: `npm run demo -- --network anvil --deploy` (with `anvil` running; open `http://localhost:3000/?network=anvil`). | The check command prints `DEPLOYMENT OK base-sepolia`. Opening `http://localhost:3000/` shows the PlumeClock page with "0 tickets opened". | |
| 2 | **Demo data.** Nothing to make: the data is already in the repo. The demo command for later is `npm run demo -- --network base-sepolia --fund --pause 6000 \| Tee-Object run.log` (run it in a second PowerShell set up like row 1 steps 1–2). | `git status` shows no changed files under `public/data`. | |
| 3 | **Wallet state.** No wallet or extension is shown. Network: Base Sepolia. Public addresses: deployer `0xDa68A991EB0D7Ad51832d0ec10AC9484C505211B`, feeder `0xa070bAD2302c0E57FA84D0473b21d8B1eb37B34D`, operator A `0xE17a32228332d4752065D32645F1c10E1619d91c`, operator B `0xfB12D53CB01f58e641D4cA5b8ACaC57b3F5306D7`. One full run costs about 0.009 ETH, so there are at most 2 re-runs. | `npm run deploy -- --network base-sepolia --check` shows the deployer with at least 0.02 ETH. | |
| 4 | **Browser hygiene.** Film only a fresh, empty Chromium window opened by the recorder. Never film the user's own Chrome. Size 1920×1080, zoom 100%, no bookmarks bar, no extensions. | The first frame shows only the dashboard page. | |
| 5 | **Desktop hygiene.** Turn on do-not-disturb. Close `.env` and editors. Clear the terminal. Never type a command that prints secrets (`Get-ChildItem Env:`, `set`). The terminal stays off-screen. | A screenshot of the desktop shows no key, `.env` text or personal tab. | |
| 6 | **Capture toolchain.** The check results are in `docs/tollgate/2026-10-15-tollgate.md`, section "Step 2.5 session card — 2026-10-20 (script pass)". Two rows (Chrome connection, computer-use grant) are re-checked at the start of recording. Install on recording day: Playwright, Kokoro (Python 3.12), Remotion. | Read that report section. Do not re-probe here. | |
| 7 | **Assets.** Title card: "PlumeClock" and "an on-chain response clock for methane super-emitters". No logo file exists, so the title is plain text. Outro: the text and a QR for `https://github.com/bitnormie01/plumeclock`, and the data credit. No music. | Opening the repo URL works when logged out (after the repo is made public). Otherwise note it in §6. | |

## 3 — Shot list

**Order to record.** (a) Record S1 now. (b) Start the demo command (row 2) and let the browser recording run continuously; S2, S3 and S4 are cut from that one run. (c) When the terminal prints `DEMO OK`, record S5 and S6. A retake of S2–S4 means a new deploy and a new run.

**Decision (user, 2026-10-24):** the video runs on a fresh deployment, and that deployment becomes the canonical one. After the final take, commit the new `public/deployments/base-sepolia.json` and `base-sepolia.demo.json`, then update the PlumeClock and MitigationFund addresses and the slash-transaction link in `README.md`, `docs/gates/submission-draft.md` and the gate ledger (gates 5–6 evidence).

Everything on screen comes from the live chain. Nothing is staged.

| id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take |
|---|---|---|---|---|---|---|---|---|
| S1 | 24 | Dashboard at `http://localhost:3000/`. Title card for the first 3 s. Tick "Country response rates" and hover Kazakhstan. | S1 "Satellites can now…" | screencast | — | Screen shows "0 tickets opened", the honesty banner containing the word "simulated", and the Kazakhstan hover label "20% response rate". | 3 | |
| S2 | 36 | Same recording, demo running. Tickets appear on the map. Click `KAZ_S_003` in the ticket list and hold: IMEO status, CO2e "2.05 Mt", clock, "Operator B (simulated)". | S2 "One command runs…" | screencast | — | Screen shows "41 tickets opened" and, in the `KAZ_S_003` panel, "Notified – no response received", "2.05 Mt" and "(simulated)". | 2 | |
| S3 | 24 | Same recording. Click `IRQ_S_067`. Its history gains "responded", then "resolved", and its badge turns green. | S3 "Operator A, a simulated…" | screencast | — | `IRQ_S_067` badge reads Resolved and its history lists both steps with "view tx" links. | 2 | |
| S4 | 36 | Same recording. Click `KAZ_S_003`. About 10 s of real countdown, a cut with the on-screen chip "clock trimmed: the demo window is 180 s", then the last 10 s to zero. Badge turns Slashed; the stats line shows "1 slashed". | S4 "Operator B, also simulated…" | screencast | — | `KAZ_S_003` badge reads Slashed, the panel says "Slashed to mitigation fund: 0.001 ETH", and the stats line says "1 slashed". | 2 | |
| S5 | 30 | Blockscout in a new window: the slash transaction link from `run.log` (Success). Then the fund address page (0.001 ETH). Back on the dashboard, click "Verify record against on-chain root", then show the triage line. | S5 "And it is real…" | screencast | — | Blockscout shows Success with the same hash as `run.log`. The dashboard shows three ✓ and no ✗. | 3 | |
| S6 | 30 | Dashboard final screen: map, green A, slashed B, the footer credit. Outro card over the last 8 s with the repo QR. | S6 "Adoption starts with…" | screencast | — | Stats line shows "1 resolved" and "1 slashed". Outro text is readable. | 3 | |

Sum: 24 + 36 + 24 + 36 + 30 + 30 = **180 s**.

## 4 — Narration script

**S1** — Satellites can now spot methane super-emitters from orbit, and UNEP alerts the owners. The question is what happens next. Nearly ninety per cent of those alerts go unanswered, while methane drives about thirty per cent of today's warming. PlumeClock puts a public clock on every alert, and a price on staying silent.
words: 52 · planned: 21.7s @ ~2.4 w/s · tone: calm, serious · gloss: UNEP → "you-nep"; PlumeClock → "plume clock"

**S2** — One command runs the demo on Base Sepolia, a testnet. Simulated operators pledge bonds. A feeder posts UNEP's public alert data, about nineteen hundred sources, as one Merkle root on chain. Then real super-emitters drop onto the map as tickets, each showing IMEO's published status. Kazakhstan's compressor station was last seen releasing nearly eight thousand kilograms of methane an hour: about two million tonnes of carbon dioxide equivalent a year, if it persists.
words: 73 · planned: 30.4s @ ~2.4 w/s · tone: brisk, clear · gloss: IMEO → "I-M-E-O"; Merkle → "MER-kul"; Sepolia → "seh-POH-lee"; Kazakhstan → "KAZ-ak-stan"

**S3** — Operator A, a simulated operator, signs a repair attestation: the cause, the action taken and an evidence hash. The next replayed satellite pass shows no plume at that source. The ticket resolves and turns green. Closing a ticket takes both a signed response and a satellite re-observation, never one alone.
words: 50 · planned: 20.8s @ ~2.4 w/s · tone: clear, a little lift at "green" · gloss: attestation → "uh-tes-TAY-shun"

**S4** — Operator B, also simulated, stays silent. IMEO's own published status for this source reads: notified, no response received. IMEO warns that silence may reflect limited capacity, so only a pledged bond can be slashed. The clock runs down; the long wait is trimmed here. At zero, anyone can call slash. No admin key, no committee. One transaction moves B's bond to the mitigation fund. Accountability, with a consequence, on chain.
words: 70 · planned: 29.2s @ ~2.4 w/s · tone: slow, builds to "on chain" · gloss: slash → "slash"

**S5** — And it is real. Here is that slash on Blockscout: a successful Base Sepolia transaction, the bond landing in the fund. Any ticket can be checked too: recompute the record's hash, verify its Merkle proof, and confirm the root on chain, in one click. A triage score then ranks tickets by impact, persistence and response history, so attention goes where it matters.
words: 62 · planned: 25.8s @ ~2.4 w/s · tone: confident · gloss: Blockscout → "block-scout"; triage → "TREE-ahzh"

**S6** — Adoption starts with zero integration. PlumeClock only reads data UNEP already publishes, and operators opt in by posting a bond. Real: IMEO's detections and statuses. Simulated: operators, bonds and attestations, on a testnet, with no real operator contacted. Track: Climate Data and Environmental Monitoring. Data credit: UNEP's International Methane Emissions Observatory. Code: github dot com slash bitnormie zero one slash plumeclock.
words: 61 · planned: 25.4s @ ~2.4 w/s · tone: plain, closing · gloss: bitnormie01 → "bit-NOR-mee zero one"

Facts used: "nearly 90 per cent unanswered" is UNEP's *Eye on Methane 2025* report; "about 30 per cent of warming" is the IMEO FAQ; `KAZ_S_003` is 7,847 kg/h and 2,048,443 t CO2e a year (GWP100 29.8, if it persists), from `public/data/snapshot.json`; "nineteen hundred sources" is 1,914 records.

## 5 — Assembly plan

Order: title card (3 s over S1) → S1 → S2 → S3 → S4 → S5 → S6 → outro card (over the last 8 s of S6). Transitions: hard cuts. The one trimmed wait in S4 carries the on-screen chip, so the cut is never silent. Captions: on, word-timed, white text on a dark bar at the bottom, never covering the panel text. Music: off. Loudness: −14 LUFS. Export: 1080p h264. Commands: `references/demo-stack.md` in the kit.

## 6 — QC record

| check | scene(s) | pass/fail | note |
|---|---|---|---|
| money shot visible | | | |
| text legible at 1080p | | | |
| captions present + synced | | | |
| no capture yellow border | | | |
| no secret / no address that shouldn't be on screen | | | Public wallet and contract addresses are fine. No private key, `.env` text, `RPC_URL` or personal tab. |
| per-scene duration within budget | | | |
| total duration within ±10% | | | |
| audio present, loudness sane | | | |

## 7 — Publish block

| field | value |
|---|---|
| Upload target + account | none (UPLOAD struck) |
| Title | PlumeClock: an on-chain response clock for methane super-emitters |
| Description | Every real UNEP IMEO methane alert becomes an on-chain ticket with a public response clock. A signed response plus a satellite re-observation closes it; a silent, bonded operator is slashed by one transaction. Real: IMEO's detections and statuses. Simulated: operators, bonds and attestations, on the Base Sepolia testnet; no real operator was contacted. The 30-day clock runs as 180 seconds in the demo. Track: Climate Data & Environmental Monitoring. Code: https://github.com/bitnormie01/plumeclock. Data: UNEP's International Methane Emissions Observatory, Eye on Methane // GLOBAL (https://methanedata.unep.org), CC BY-NC-SA 4.0. Music attribution: none. |
| Tags | methane, climate, blockchain, Base Sepolia, UNEP IMEO, satellite data, accountability, IEEE ClimateChain |
| Visibility | unlisted (if the user uploads it) |
| URL | TBD |
| Verified logged-out | TBD |
| Resolves | submission-draft demo video URL |

## 8 — Status ledger

| date | event | by |
|---|---|---|
| 2026-10-20 | scripted | demo-studio |
| 2026-10-24 | superseded-edit (shortened to 6 scenes, plain-language steps, terminal no longer filmed; before approval) | demo-studio |
| 2026-10-24 | approved (whole production; fresh deployment becomes canonical) | the user |

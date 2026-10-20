<!-- demo-script-schema: v1 -->
# PlumeClock — demo script

## 0 — Production card

| field | value |
|---|---|
| Project | PlumeClock (`bitnormie01/plumeclock`) |
| Event | IEEE ClimateChain Global Hackathon (Devpost 29114). Deadline Oct 25, 2026, 17:00 MSK = 19:30 IST. Track: Climate Data & Environmental Monitoring |
| Target length | 3:00 (Devpost asks 3–5 min; the organizer page asks for 3 min; pack INDEX (i) is not resolved here, and about 3:00 satisfies both) |
| Resolution / fps | 1920×1080 @ 30 |
| Voice | Kokoro (local, offline, English) |
| Music | off (captions only) |
| Wallet on camera | injected-signer + block-explorer shot. The runner signs with scripted burner keys (demo:4.6), so no wallet popups. The proof is the Blockscout transaction page |
| Upload target | none. The user struck UPLOAD for this campaign pass; the final cut is delivered as a local file |
| Schema | v1 |

## 1 — Story & time budget

Prove: a real UNEP IMEO super-emitter becomes an on-chain ticket with a response clock, an answered ticket closes green on a signed response plus a replayed satellite pass, and a silent bonded operator gets slashed by one permissionless transaction that anyone can check on Blockscout.
Money shot: scene S5 (operator B's clock hits zero and `slash()` moves the bond to the mitigation fund). S3 and S4 set it up and S6 proves it on the explorer.

Devpost publishes five criteria and no weights (event.md §5), so they are weighted equally. No weights are invented. The organizer page's weighted lists (INDEX (e)) are recorded, not applied. Equal weights give 36 s of the 180 s to each criterion:

| criterion | weight | seconds |
|---|---|---|
| Climate Impact | equal (no weights published) | 36 (S3 22 + S9 14) |
| Innovation & Creativity | equal (no weights published) | 36 (S4 14 + S5 22) |
| Technical Execution | equal (no weights published) | 36 (S2 16 + S6 20) |
| Practical Usefulness | equal (no weights published) | 36 (S7 18 + S8 18) |
| Presentation & Communication | equal (no weights published) | 36 (S1 16 + S10 20) |

Presentation & Communication carries the climate problem (S1) and the honest, real-world close (S10). The "how the solution works" half of that criterion is carried by S2–S5 as they run.

## 2 — Pre-flight — set up before recording

Everything below is verified at the start of the recording session. The `✓` column stays empty until then.

| # | item | how to verify | ✓ |
|---|---|---|---|
| 1 | App running. In `C:\ieee hackathon\ieee-climatechain-hack-2026`, with Foundry on PATH (`%USERPROFILE%\.foundry\bin`) and the four burner keys loaded from `HKCU\Environment` into that one process (never printed): `npm run deploy -- --network base-sepolia`, `npm run verify:contracts`, `npm run check:deployment -- --network base-sepolia`, then `npm run build` and serve `out/` at `http://localhost:3000/` (`py -3.12 -m http.server 3000 --directory out`). Serving the static export keeps the Next dev indicator off camera, and the build must come after the deploy so the new addresses are baked in. **Rehearse first on anvil** (free): `npm run demo -- --network anvil --deploy` with the dashboard at `?network=anvil`. | `http://localhost:3000/` answers 200. The banner reads "Real UNEP IMEO MARS detections… simulated on Base Sepolia testnet". Stats read 1,914 committed, 84% with no response, 0 opened. `check:deployment` prints `DEPLOYMENT OK base-sepolia PlumeClock <new address> (response window 180 s)`. Both contracts show verified on Blockscout (decoded method names on the tx pages depend on this). | |
| 2 | Demo data. `public/data/snapshot.json` (root `0x402809f0…ec5d`, IMEO snapshot 2026-10-15, 1,914 records, 41-ticket set, A = `IRQ_S_067`, B = `KAZ_S_003`). `public/data/notices.json` (`generator: template` today). The runner is `npm run demo -- --network base-sepolia --fund --pause 6000`, which reuses the deployment above and prints the 11 tx lines plus the Blockscout links. A 6 s pause lets the dashboard's 4 s poll show every state. Run it as `… \| Tee-Object <scratchpad>\run.log` so the capture driver can key off the log lines. | `git status` is clean for `public/data/*`. `jq .generator public/data/notices.json` is `template`, or a model id if gate 7 ran. If it is a model id, S7 voices "drafted by" from the screen, not from memory. | |
| 3 | Wallet state. No extension on camera (injected signer). Burner **public** addresses: deployer `0xDa68A991EB0D7Ad51832d0ec10AC9484C505211B`, feeder `0xa070bAD2302c0E57FA84D0473b21d8B1eb37B34D`, operator A `0xE17a32228332d4752065D32645F1c10E1619d91c`, operator B `0xfB12D53CB01f58e641D4cA5b8ACaC57b3F5306D7`. Network Base Sepolia (84532). A fresh deploy plus a funded run costs about 0.009 ETH, so budget **at most 2 re-runs** on the ledger's 0.039 ETH. Top up via gate 2's route if more are needed. | `npm run deploy -- --network base-sepolia --check` shows the four addresses above and the deployer at ≥ 0.02 ETH. | |
| 4 | Browser hygiene. Browser scenes run in a **dedicated Playwright Chromium profile** (`launchPersistentContext`, headed, fresh user-data dir) and never in the user's Chrome, so personal logins and tabs are never on camera. 1920×1080 viewport, DPR 1, 100% zoom, no bookmarks bar, no extensions, no stray popups. Blockscout is opened in a separate context after the run, never in parallel. | First screencast frame: 1920×1080, only the dashboard visible, no browser chrome overlays. | |
| 5 | Desktop hygiene. Focus assist / do-not-disturb on, notifications off. No `.env` or editor open. The runner terminal is cleared, its window title set to `PlumeClock demo runner` (the `gfxcapture` match), and the font ≥ 20 pt so the log reads at 1080p. **Never run `Get-ChildItem Env:`, `set` or `reg query … /v <KEY>` with values on camera.** The user's real Chrome, the Claude app and the browser pane stay off-screen. Single 1920×1080 monitor if possible. | Screenshot the desktop: no key, `.env` or personal tab is visible. Window-title discovery finds exactly one match for `PlumeClock demo runner`. | |
| 6 | Capture toolchain. The tollgate session card rows are in `docs/tollgate/2026-10-15-tollgate.md` → "Step 2.5 session card — 2026-10-20 (script pass)". Rows 9, 10, 11, 16 PASS. Rows 12 and 13 are N-A. Row 8 is N-A (injected signer). Rows 5 and 6 are **deferred to the recording session** (see the report). Bootstrap that only the recording session does, per `references/demo-stack.md`: Playwright 1.61 install, Kokoro venv on Python 3.12 + espeak-ng, Remotion project under `demo/`. | Cite the report only (`tollgate.md`: never re-probe here). The recording session re-probes rows 5–6 in its own session and appends the result. | |
| 7 | Assets. Title card: wordmark "PlumeClock" + "an on-chain response clock for methane super-emitters" + "IEEE ClimateChain Global Hackathon · Climate Data & Environmental Monitoring". There is no logo file, so the wordmark is typeset in Remotion. Outro: QR + text for `https://github.com/bitnormie01/plumeclock`, plus the data credit line. The live-dashboard URL appears only if gate 9 has published it by assembly time (expected `https://bitnormie01.github.io/plumeclock/`, unconfirmed). Music: none. | The repo URL resolves logged-out once gate 8 has flipped it public. Otherwise the outro still carries the text and QR, and the QC note records that the link was not yet live. | |

## 3 — Shot list

S2–S5 are **one continuous live run**: the Playwright screencast of the dashboard and the `gfxcapture` of the terminal start before `npm run demo` and stop after the slash line. Their `take` is the run number, and a retake means a whole new deploy + run. S1 is recorded in the quiet window after the build is served and before the demo starts. S6–S9 are recorded after the run, against the real on-chain state it left. No scene is staged. Every state on screen comes from the live chain.

| id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take |
|---|---|---|---|---|---|---|---|---|
| S1 | 16 | `http://localhost:3000/`, fresh deployment, zero tickets. Title card over the first 3 s. Slow pan of the IMEO alerts layer; toggle "Country response rates" and hover Kazakhstan (label "Kazakhstan: 20% response rate (10/50 notified sources)"). The always-on banner stays in frame. | S1 "Satellites can now…" | screencast | — | Stats line reads 1,914 committed / 84% no response / 0 opened. The honesty banner is in frame. The Kazakhstan hover label text matches. | 3 | |
| S2 | 16 | Runner terminal (`PlumeClock demo runner`). Type and run `npm run demo -- --network base-sepolia --fund --pause 6000`. The setup lines scroll: pledges, "Feeder posts snapshot root (1914 IMEO records)", "Open N background tickets". Hold on the root line. | S2 "One command runs…" | gfxcapture | — (injected signer, scripted burners) | The log shows "Operator A pledges", "Operator B pledges", "Feeder posts snapshot root (1914 IMEO records)" and at least one "Open … background tickets" line, each with a Blockscout URL. No key text appears in any frame. | 2 | |
| S3 | 22 | Dashboard, same take. The 39 background markers and the A/B tickets appear (poll ≤ 4 s). Select `KAZ_S_003` in the ticket list: panel shows IMEO detection, "Notified – no response received", the IMEO caveat, "≈ 2.05 Mt CO2e / yr … GWP100 29.8", the clock with "demo time-warp: 30 days = 180 s", "Operator: Operator B (simulated)", bond 0.001 ETH. Brief select of `IRQ_S_067` ("Operator A (simulated)", "Government and operator responded"). | S3 "Two real super-emitters…" | screencast | — | Stats show "41 tickets opened". The panel for `KAZ_S_003` contains all of: IMEO status text, "(simulated)", the caveat, "2.05 Mt", the time-warp label, and a live clock. | 2 | |
| S4 | 14 | Dashboard, same take. Select `IRQ_S_067`. The state history gains "responded… view tx", then (after the replay root) "resolved… view tx". The badge goes green. | S4 "Operator A, a simulated…" | screencast | — | The `IRQ_S_067` badge reads Resolved and the transitions list holds both a Responded and a Resolved entry with "view tx" links. The terminal log's tx hashes match the links. | 2 | |
| S5 | 22 | Dashboard, same take. Select `KAZ_S_003`. About 8 s of the real countdown, then a jump cut with an on-screen chip "clock trimmed: demo window is 180 s". Then the last ~8 s of the countdown, the badge going to Slashed, "Slashed to mitigation fund: 0.001 ETH", and stats "1 slashed (0.001 ETH to the mitigation fund)". | S5 "Operator B, also simulated…" | screencast | — | The `KAZ_S_003` badge reads Slashed. The panel shows "Slashed to mitigation fund: 0.001 ETH" and the stats line shows "1 slashed". The log's `Slash KAZ_S_003` hash is recorded for S6. | 2 | |
| S6 | 20 | Blockscout, separate context: `https://base-sepolia.blockscout.com/tx/<slash hash from this run>` (status Success, decoded `slash`, the transfer to the MitigationFund). Then the MitigationFund address page (balance 0.001 ETH). Then back on the dashboard: select a ticket, click "Verify record against on-chain root", and hold on the "✓ leaf recomputed · ✓ Merkle proof · ✓ root posted on-chain" line. | S6 "And it is real…" | screencast | — | The Blockscout page shows status Success with the hash from the run log, and the fund balance is 0.001 ETH. The verification line shows three ✓ and no ✗. | 3 | |
| S7 | 18 | Dashboard. Ticket list sorted by triage score (`KAZ_S_003` leads it); open its panel and hold on the analyst section: "Triage high (83/100) = impact 0.828 × persistence 1 × response 1 · drafted by template" and the notice text. Scroll the plume history. | S7 "Beside every ticket…" | screencast | — | The panel shows the triage line with "83/100" and a "drafted by …" label that matches `notices.json`'s `generator`. | 3 | |
| S8 | 18 | Dashboard overview: scroll the 41-ticket list, toggle the IMEO alerts layer and the country overlay, hover Iraq (71%) then Kazakhstan (20%), then the attribution footer. | S8 "Adoption starts with…" | screencast | — | The footer shows the UNEP IMEO attribution and the snapshot root. The overlay hover labels match the snapshot's rates. | 3 | |
| S9 | 14 | Dashboard, final state: the map with a green A, a slashed B and the stats line "1 resolved · 1 slashed (0.001 ETH to the mitigation fund)". Slow push-in on the stats. | S9 "Response rates were…" | screencast | — | The stats show "1 resolved" and "1 slashed". | 3 | |
| S10 | 20 | Remotion outro over the dashboard footer: three lines "Real: IMEO detections · Simulated: operators, bonds, attestations · Testnet only", the track line, the data credit, repo URL + QR. | S10 "Real: IMEO's detections…" | screencast | — | Outro text is legible at 1080p. The repo URL and QR match `https://github.com/bitnormie01/plumeclock`. | 3 | |

Sum: 16 + 16 + 22 + 14 + 22 + 20 + 18 + 18 + 14 + 20 = **180 s** = the 3:00 target.

## 4 — Narration script

**S1** — Satellites can now spot methane super-emitters from orbit, and UNEP alerts the owners. Yet nearly ninety per cent of those alerts go unanswered, while methane drives about thirty per cent of today's warming. PlumeClock puts a public clock on every alert.
words: 41 · planned: 17.1s @ ~2.4 w/s · tone: calm, factual, slightly urgent · gloss: UNEP → "you-nep"; PlumeClock → "plume clock"

**S2** — One command runs the whole demo on Base Sepolia, a testnet. Simulated operators pledge bonds. A feeder commits UNEP's public alert data, about nineteen hundred sources, as a single Merkle root on chain, then opens tickets.
words: 36 · planned: 15.0s @ ~2.4 w/s · tone: brisk, explanatory · gloss: Merkle → "MER-kul"; Sepolia → "seh-POH-lee"

**S3** — Two real super-emitters drop onto the map as tickets. Kazakhstan's compressor station was last seen releasing nearly eight thousand kilograms of methane an hour: about two million tonnes of carbon dioxide equivalent a year, if it persists. IMEO's own status, a thirty-day clock, and its caveat on silence, all on the ticket.
words: 52 · planned: 21.7s @ ~2.4 w/s · tone: measured, precise · gloss: IMEO → "I-M-E-O"; Kazakhstan → "KAZ-ak-stan"

**S4** — Operator A, a simulated operator, signs a repair attestation: the cause, the action taken, and an evidence hash. The next replayed satellite pass shows no plume at that source. The ticket resolves, and turns green.
words: 35 · planned: 14.6s @ ~2.4 w/s · tone: clear, a little lift at "turns green" · gloss: attestation → "uh-tes-TAY-shun"

**S5** — Operator B, also simulated, stays silent. The clock runs down; the long wait is trimmed here. At zero, anyone can call slash. One transaction moves B's bond to the mitigation fund. No admin key, no waiting on a committee: accountability with a consequence, on chain.
words: 45 · planned: 18.8s @ ~2.4 w/s · tone: deliberate, builds to "on chain" · gloss: slash → "slash"

**S6** — And it is real. Here is that slash on Blockscout: a successful Base Sepolia transaction, bond landing in the fund. Any record can be checked too. Recompute its hash, verify the Merkle proof, and confirm the root on chain, in one click.
words: 42 · planned: 17.5s @ ~2.4 w/s · tone: confident, "show don't tell" · gloss: Blockscout → "block-scout"

**S7** — Beside every ticket sits an analyst layer: a deterministic triage score, and a plain-language notice that says who drafted it. Tickets rank by impact, persistence and response history, so attention goes where the methane is.
words: 35 · planned: 14.6s @ ~2.4 w/s · tone: practical · gloss: triage → "TREE-ahzh"

**S8** — Adoption starts with zero integration. PlumeClock only reads data UNEP already publishes. Operators opt in by posting a bond, under buyer terms, lender covenants or a voluntary pledge. A few thousand alerts a year fit one low-cost contract.
words: 38 · planned: 15.8s @ ~2.4 w/s · tone: practical, grounded · gloss: covenants → "KUV-uh-nants"

**S9** — Response rates were one per cent in 2024 and twelve in 2025. Detection alone is not mitigation. A public clock, with a price on silence, is a step toward closing that gap.
words: 32 · planned: 13.3s @ ~2.4 w/s · tone: reflective, slower · gloss: mitigation → "mit-uh-GAY-shun"

**S10** — Real: IMEO's detections and statuses. Simulated: the operators, bonds and attestations, on a testnet, with no real operator contacted. Track: Climate Data and Environmental Monitoring. Data credit: UNEP's International Methane Emissions Observatory. Code: github dot com slash bitnormie zero one slash plumeclock.
words: 42 · planned: 17.5s @ ~2.4 w/s · tone: plain, closing · gloss: bitnormie01 → "bit-NOR-mee zero one"; plumeclock → "plume clock"

Sources behind the figures (checked 2026-10-20 against the repo, not the open web): "nearly 90 per cent" is UNEP's *Eye on Methane 2025* report, as quoted in the brief and `docs/impact-and-adoption.md`. "About 30 per cent of today's warming" is the IMEO FAQ. The 1% (2024) and 12% (2025) response rates are from the same report (a separate UNEP highlight gives ~10%, per the brief). `KAZ_S_003` is 7,847 kg/h and 2,048,443 t CO2e/yr (GWP100 29.8, if it persists), from `public/data/snapshot.json`. "About nineteen hundred sources" is 1,914 committed records. "A few thousand alerts a year" is the draft's reading of the 3,500+ alerts UNEP had sent by 2025.

## 5 — Assembly plan

Order: title card (3 s overlay on S1) → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S10 (outro card overlaid on S10). Transitions: hard cuts; S5 has one labelled jump cut that carries the on-screen chip "clock trimmed: demo window is 180 s", so the trim is never silent. Captions: on, word-timed from Kokoro, bottom-third, white on a semi-opaque dark bar, ≥ 36 px at 1080p, never covering the panel's CO2e / status / clock text. Scene durations are audio-first from Kokoro's narration; if a scene's audio overruns its footage, S1 and S8 (the idle-state scenes) are re-shot or slowed before any live-run scene is touched. Music: off. Loudness: −14 LUFS two-pass. Export: 1080p h264 at 30 fps. Mechanics: `references/demo-stack.md` in the kit (Playwright `page.screencast`, ffmpeg `gfxcapture`, Remotion 4.0.487, `mediabunny` timing, loudnorm).

## 6 — QC record

| check | scene(s) | pass/fail | note |
|---|---|---|---|
| money shot visible | | | |
| text legible at 1080p | | | |
| captions present + synced | | | |
| no capture yellow border | | | |
| no secret / no address that shouldn't be on screen | | | burner **public** addresses and contract addresses are fine. No private key, `.env` text, `RPC_URL` value or personal tab may appear. |
| per-scene duration within budget | | | |
| total duration within ±10% | | | |
| audio present, loudness sane | | | |

## 7 — Publish block

| field | value |
|---|---|
| Upload target + account | none. UPLOAD is struck for this campaign pass; the user decides where the file goes. |
| Title | PlumeClock: an on-chain response clock for methane super-emitters (IEEE ClimateChain Global Hackathon 2026) |
| Description | Satellites spot methane super-emitters, but UNEP's own 2025 report found nearly 90% of MARS alerts went unanswered. PlumeClock opens an on-chain ticket for every real UNEP IMEO alert, with a public response clock. A signed repair attestation plus a satellite re-observation closes it green. A bonded operator who stays silent past the deadline gets slashed by one permissionless transaction, which moves the bond to a mitigation fund. Track: Climate Data & Environmental Monitoring. What is real: UNEP IMEO's detections and published statuses. What is simulated: the operators, bonds, attestations and re-observation replays. No real operator was contacted, and everything runs on the Base Sepolia testnet. The 30-day clock runs as 180 seconds in the demo. Code: https://github.com/bitnormie01/plumeclock. Data: UNEP's International Methane Emissions Observatory, Eye on Methane // GLOBAL (https://methanedata.unep.org), CC BY-NC-SA 4.0, used non-commercially. Music attribution: none (no music). |
| Tags | methane, climate, blockchain, Base Sepolia, UNEP IMEO, MARS, satellite data, accountability, Solidity, hackathon, IEEE ClimateChain |
| Visibility | unlisted (if the user uploads it) |
| URL | TBD |
| Verified logged-out | TBD |
| Resolves | submission-draft demo video URL |

## 8 — Status ledger

| date | event | by |
|---|---|---|
| 2026-10-20 | scripted | demo-studio |

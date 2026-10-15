# Gate ledger — PlumeClock · IEEE ClimateChain Global Hackathon

- **Campaign:** PlumeClock, repo `bitnormie01/plumeclock` (private), Base Sepolia testnet only (chain id 84532).
- **Deadline:** Oct 25, 2026, 17:00 MSK = 19:30 IST (`docs/gates/submission-draft.md`).
- **Written by:** gate-concierge, Step 3, **preflight pass**, 2026-10-15. Built in its own worktree
  (`C:\ieee hackathon\plumeclock-gates`, branch `gates/ledger`) while the orchestrator builds in the
  canonical clone.
- **Sources:**
  - `docs/superpowers/manifest.json`: the human-gated tasks `data:2.12` (secret), `demo:4.5`
    (deploy) and `demo:4.6` (wallet).
  - The plans for those tasks.
  - `docs/idea-forge/2026-10-15-plumeclock-brief.md`.
  - `docs/resources/2026-10-15-ieee-climatechain-hack/event.md`.
  - `docs/gates/submission-draft.md`.
  - `docs/tollgate/2026-10-15-tollgate.md`, including Stack rows S11–S13.
- **Rule:** nothing in this ledger runs until the user names that gate. A go for one gate never
  carries over to the next. Silence means no.

## How this session's tiers differ from the kit

The kit's gate-concierge skill treats CAPTCHAs, email one-time codes and provider signups as
agent-runnable (Tier A). **In this session the agent does not do any of the following, even with
authorization:**

- solve a CAPTCHA;
- create an account;
- type a password, one-time code or API key into any field.

Each of these is listed as the user's **human moment** below. So "signup automation" changes
nothing here, and signups stay human-assisted either way. Two more actions need the user's explicit
go in chat each time: approving an OAuth/SSO grant, and accepting terms or rules.

## Tollgate session card (rows 1–8, 15), this session, 2026-10-15

| # | Row | Result | Evidence / note |
|---|---|---|---|
| 1 | git + identity | PASS | git 2.51.2.windows.1. Identity is set in the project clone's local config. The global `user.email` is unset, which doesn't matter for this repo. |
| 2 | `gh` logged in | PASS | `gh auth status`: `bitnormie01` (keyring), scopes `gist, read:org, repo, workflow`. |
| 3 | kit present + synced | CLEAR-with-substitute | `C:\ieee hackathon\build-system-main` is a ZIP snapshot (no `.git`). `gate-concierge/SKILL.md` and `references/tollgate.md` blob hashes equal `bitnormie01/build-system@b303ada` (main, 2026-07-13). The faucet write-back (gate 2) therefore needs a fresh git clone of `build-system`. |
| 4 | project repo | PASS | `origin/main` = `7412567`. Ledger worktree created from it. |
| 5 | claude-in-chrome responding | NOT GRANTED — not probed | Tools are listed in this session. They are not exercised until the user grants Chrome. Re-probe on grant (read the tab context). |
| 6 | computer-use | NOT GRANTED — not probed | No gate below needs it (see *Grants*). |
| 7 | email inbox | NOT GRANTED — not probed | No gate below needs it: one-time codes are the user's moment in this session. |
| 8 | wallet extension / burner permission | extension N-A; burner permission NOT GRANTED | The dashboard is read-only (no wallet connect in the dashboard plan) and the demo signs from the CLI, so no extension gate exists. Burner-wallet permission gates 1, 2, 5 and 6. |
| 15 | cross-session env store | PASS | `setx TOLLGATE_PROBE 1`, then `reg query` showed `REG_SZ 1`, then `reg delete /f`. The re-query exited 1 (removed). |

## Grants: what each one unlocks

| Grant | Needed by | If not granted |
|---|---|---|
| Burner wallets (create + use) | 1, 2 (target address), 5, 6 | The user generates the keys and runs gates 5–6 personally. |
| claude-in-chrome | 2 (claim pages on the user's signed-in session), 3, 11, 12 (only if the agent presses Submit) | The agent prepares the exact pages and fields and the user drives the browser. |
| Built-in browser pane (not on the original list; isolated, no sign-ins) | 2 (read-only faucet discovery) | Discovery uses Chrome or WebFetch instead. |
| computer-use | none | none |
| Email inbox | none | none |

## Secrets map (names and locations only — never values)

| Env var | Store | Used by | Status |
|---|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | user env store `HKCU\Environment` (tollgate row 15) | gates 2, 5, 6 | not issued |
| `FEEDER_PRIVATE_KEY` | `HKCU\Environment` | gates 5, 6 | not issued |
| `OPERATOR_A_PRIVATE_KEY` | `HKCU\Environment` | gate 6 | not issued |
| `OPERATOR_B_PRIVATE_KEY` | `HKCU\Environment` | gate 6 | not issued |
| `LLM_API_KEY` (optional) | `HKCU\Environment`, set by the user personally | gate 7 | not issued |

- **Why the user env store and not `.env`:**
  - `.env` is not git-ignored until the orchestrator commits Task 1.1's `.gitignore`.
  - This seat does not write into the canonical clone while the build runs.
  - The deploy, demo and notices scripts tolerate a missing `.env` and read the process environment
    (`process.loadEnvFile('.env')` sits in a try/catch).
- **Update, 2026-10-15:** Task 1.1 (`a8fa124`) is now in. In the canonical clone,
  `git check-ignore -v .env` resolves to `.gitignore:8:.env` (exit 0), and no `.env` exists. The
  user env store stays the plan anyway, because this seat still does not write into the clone
  during the build.
- **At closing time,** each gate loads the names it needs from `HKCU\Environment` into that one
  child process without printing them.
- **If a `.env` exists by then,** first confirm `git -C <clone> check-ignore .env` succeeds. Also
  confirm it does not blank the injected values.
- **Already-running sessions cannot see these variables.** `setx` reaches only processes started
  after it. Nothing in the build needs the keys, since every task that uses a key is a concierge
  gate.

## Summary

| # | Gate | Tier | Pass | Status |
|---|---|---|---|---|
| 1 | Four burner wallets → user env store | A | **preflight** | pending |
| 2 | Faucet ≥ 0.02 Base Sepolia ETH → deployer (+ kit write-back) | B | **preflight** | pending |
| 3 | Devpost sign-in + hackathon registration check | B | **preflight** | pending |
| 4 | Optional `LLM_API_KEY` (Anthropic) | B (billing part C) | **preflight** | pending |
| 5 | `demo:4.5` deploy to Base Sepolia + Blockscout verify | A | closing | pending |
| 6 | `demo:4.6` demo run on Base Sepolia | A | closing | pending |
| 7 | `data:2.12` Claude-drafted notices (optional) | A | closing | pending (needs gate 4) |
| 8 | Flip `bitnormie01/plumeclock` public | A (explicit consent) | closing | pending |
| 9 | Host the live dashboard (GitHub Pages) — **plan gap** | A (explicit consent) | closing | pending — needs a decision |
| 10 | Demo video + upload | owned by demo-studio (Step 2.5) | closing | dependency, not run here |
| 11 | Fill the Devpost submission form (save as draft) | A (explicit consent) | closing | pending |
| 12 | Press Submit on Devpost | C | closing | pending |
| 13 | Scrub secrets from the env store + revoke the API key | A + B | closing (after submit) | pending |

**Recommended order:** 1 → 2 → 3 → 4 (optional) in this pass, while the build runs. Then, after
the orchestrator reports green: 5 → 6 → 7 (optional) → 8 → 9 → [10, demo-studio] → 11 → 12 → 13.
Batching is fine when named ("run gates 1–2"), but never assumed.

## Gates

### 1 · Four burner wallets → user env store

- **What:** fresh testnet-only keys for `DEPLOYER_PRIVATE_KEY`, `FEEDER_PRIVATE_KEY`,
  `OPERATOR_A_PRIVATE_KEY` and `OPERATOR_B_PRIVATE_KEY` (`demo:4.5` Step 1 prerequisite; it also
  covers `demo:4.6`).
- **Tier:** A. Local key generation, testnet burners, nothing of value.
- **Pass:** preflight.
- **Tool plan:** PowerShell plus Foundry `cast` 1.4.4 (Stack row S3):
  1. `cast wallet new --json`, with output captured into a variable and never displayed.
  2. Write each key with `[Environment]::SetEnvironmentVariable(<name>, <value>, 'User')`.
  3. Print only the four public addresses.
  4. Verify in-process: each stored value is 0x + 64 hex and derives its recorded address.
  5. Record the public addresses here.
- **Human moment:** none.
- **Risk:**
  - The keys sit in plaintext in `HKCU\Environment`, readable by any process running as user
    `victu`.
  - Testnet only, so exposure burns nothing. They are never written to the repo, a commit, chat or
    a log.
  - Gate 13 removes them.
  - Never touches the user's main wallet or MetaMask.
- **Status:** pending.

### 2 · Faucet: at least 0.02 Base Sepolia ETH to the deployer only

- **What:** fund the gate-1 deployer address. `npm run demo -- --fund` later tops up the other three
  from it (`demo:4.5` Step 1). The kit has **no `references/faucets/base-sepolia.md`**, so this
  gate starts with a discovery pass.
- **Tier:** B. Every likely provider puts a sign-in, OAuth approval or CAPTCHA in front of the
  drip, and those are the user's in this session.
- **Pass:** preflight (after gate 1).
- **Tool plan:**
  1. **Discovery (read-only):** the built-in browser pane or WebFetch on public faucet pages. Record
     each provider's gating, drip and cooldown. **Skip any faucet gated on a mainnet balance:** a
     fresh burner cannot pass it.
  2. **Claim:** claude-in-chrome on the user's signed-in session. The target is the deployer
     address only.
  3. **Verify:** `cast balance <deployer> --rpc-url https://sepolia.base.org` (Stack row S11) plus
     the Blockscout tx page.
  4. **Write-back:** create `references/faucets/base-sepolia.md` from `_template.md` in a fresh
     clone of `bitnormie01/build-system`, then commit and push to its `main`. The local kit is a
     ZIP, so the push goes from that clone. Public provider facts only.
- **Candidates for discovery:** URLs from memory, **all unverified**. The order follows the plan's
  hint.
  1. Coinbase Developer Platform faucet — `https://portal.cdp.coinbase.com/products/faucet`. The
     plan names it as the first try.
  2. Superchain faucet — `https://console.optimism.io/faucet`.
  3. thirdweb — `https://thirdweb.com/base-sepolia-testnet`.
  4. Suspected mainnet-balance gates, to confirm and skip:
     - Alchemy (`https://www.alchemy.com/faucets/base-sepolia`);
     - QuickNode (`https://faucet.quicknode.com/base/sepolia`);
     - Chainlink (`https://faucets.chain.link/base-sepolia`).
  5. **Fallback:**
     - Get Ethereum Sepolia ETH, for example from the Google Cloud Web3 faucet with a Google
       sign-in.
     - Bridge it to Base Sepolia with `cast send` from the deployer, through Base's L1 standard
       bridge on Sepolia. Read the bridge address from Base's docs at gate time, never from memory.
- **Human moment:**
  - Any CAPTCHA.
  - Any sign-in or OAuth approval: click "Allow" yourself, or give an explicit go per grant.
  - Any new provider account, which the user creates.
  - An SMS code, if one is asked for.
- **Risk:**
  - Testnet ETH has no value.
  - Worst case: a provider wants a mainnet balance or a phone number. Then that provider is
    blocked, logged here, and the next one is tried.
- **Status:** pending.

### 3 · Devpost sign-in and hackathon registration check

- **What:** confirm the user is signed in on Devpost as the intended account and has joined
  `ieee-climatechain-hack` before the deadline week. Joining accepts the hackathon's official
  rules. This is implicit (it's in no manifest), but gates 11–12 depend on it.
- **Tier:** B. The check is read-only. Joining, or creating a Devpost account, is the user's
  action.
- **Pass:** preflight.
- **Tool plan:** claude-in-chrome, read-only: open `https://ieee-climatechain-hack.devpost.com/`,
  read the signed-in identity and the registration state, and report back. The agent never signs
  in and never switches accounts.
- **Human moment:**
  - If not registered: the user reads the rules and clicks "Join hackathon".
  - If there's no Devpost account: the user creates one.
- **Risk:** none from the check. Registering late risks missing a pre-deadline organizer step.
- **Status:** pending.

### 4 · Optional `LLM_API_KEY` (Anthropic)

- **What:** an Anthropic API key for the optional `data:2.12` (Stack row S13, model
  `claude-opus-5-5`).
- **Skipping is fine:** the dashboard then shows "drafted by template", and nothing depends on
  2.12.
- **Tier:** B. Account and key creation are the user's, and so is typing the key. Buying credits
  is Tier C.
- **Pass:** preflight.
- **Tool plan:**
  1. Optionally, claude-in-chrome opens `console.anthropic.com` on the API-keys page. It types
     nothing.
  2. The user stores the key with a hidden-input PowerShell prompt, `Read-Host -AsSecureString`,
     then `SetEnvironmentVariable('LLM_API_KEY', …, 'User')`. The agent supplies the one-liner.
  3. The agent verifies with a free, harmless auth call (`GET https://api.anthropic.com/v1/models`)
     that reads the key from the store without printing it.
- **Human moment:**
  - Sign in or create the account.
  - Create the key.
  - Run the hidden-input prompt.
  - (Tier C) Add credits, if the account has none.
- **Risk:**
  - Gate 7 makes about 41 billed calls to `claude-opus-5-5` on the user's account.
  - The key sits in plaintext in `HKCU\Environment` until gate 13; revoke it afterwards.
- **Status:** pending. **Recommendation:** skip it unless you already have a funded Anthropic
  account.

### 5 · `demo:4.5` — deploy to Base Sepolia and verify on Blockscout

- **What:** deploy MitigationFund and PlumeClock, verify the sources on Blockscout, and record
  `public/deployments/base-sepolia.json`.
- **Tier:** A. Testnet deploy with the burner keys.
- **Pass:** closing. It needs the built tasks 4.2 and 4.3, and the orchestrator to report green.
- **Tool plan:** PowerShell in the canonical clone. Load the four keys from `HKCU\Environment` into
  that process only, then run the task's own steps:
  1. `forge build`
  2. `npm run deploy -- --network base-sepolia --check` (the deployer must show ≥ 0.02 ETH)
  3. `npm run deploy -- --network base-sepolia`
  4. `npm run verify:contracts`
  5. `npm run check:deployment -- --network base-sepolia`
  6. Confirm the addresses on Blockscout with the agent's own eyes.
  7. Commit with the task's message (`chore(deploy): record Base Sepolia deployment`). Coordinate
     with the orchestrator on who commits.
- **Human moment:** none.
- **Risk:**
  - Testnet gas only. A failed deploy just re-runs.
  - The deployment file records the public RPC, never `RPC_URL`.
- **Status:** pending.

### 6 · `demo:4.6` — demo run on Base Sepolia

- **What:** the money-shot rehearsal on the real testnet (about 5 minutes). It records
  `public/deployments/base-sepolia.demo.json` with tx hashes.
- **Tier:** A. Testnet bonds move between the burner wallets.
- **Pass:** closing (after gate 5).
- **Tool plan:** PowerShell in the canonical clone, with the keys loaded into the process as in
  gate 5:
  1. `npm run deploy -- --network base-sepolia --check` (the deployer must show ≥ 0.015 ETH).
  2. `npm run demo -- --network base-sepolia --fund --pause 3000`.
  3. If it stops partway: `npm run demo -- --network base-sepolia --deploy --fund --pause 3000`,
     then `npm run verify:contracts`.
  4. `npm run check:demo -- --network base-sepolia`.
  5. Open the slash tx on Blockscout and record its URL for the draft.
  6. Commit with the task's message.
- **Human moment:** none.
- **Risk:** testnet only. 0.001 test ETH is slashed into the fund by design. A redeploy rewrites
  `base-sepolia.json`, after which gate 5's evidence is updated.
- **Status:** pending.

### 7 · `data:2.12` — Claude-drafted notices (optional)

- **What:** regenerate `public/data/notices.json` with Claude.
- **Tier:** A once gate 4 is done.
- **Pass:** closing. It needs `data:2.11`, and the orchestrator to report green.
- **Tool plan:** PowerShell in the canonical clone, with `LLM_API_KEY` loaded into the process:
  1. `npm run notices` (expect `generator=claude-opus-5-5`).
  2. The per-generator count one-liner from the plan's Step 3.
  3. `npm run check -- test/notices-data.test.ts`.
  4. Commit `data: Claude-drafted notices for the ticket set`.
- **Human moment:** the plan's Step 4 review. The user skims the notices: each must name its
  source, state the CO2e assumption and the IMEO status, and not speculate about the operator.
- **Risk:** billed API calls on the user's account. On any call failure it falls back to
  templates, which is acceptable but is noted here.
- **Status:** pending (needs gate 4).

### 8 · Flip `bitnormie01/plumeclock` public

- **What:** Devpost requires a public code repository.
- **Tier:** A, run only on the user's explicit go. The user may also press it themselves.
- **Pass:** closing.
- **Tool plan:**
  1. `gh auth status` must name `bitnormie01`; a mismatch is a hard stop.
  2. Run a pre-flip secret scan of **all history**:
     - an in-process script that reads each stored secret from `HKCU\Environment` and searches
       `git log -p --all` for exact matches, printing counts only;
     - a pattern scan for `sk-ant-`;
     - `git log --all -- .env` must be empty.
  3. `gh repo edit bitnormie01/plumeclock --visibility public --accept-visibility-change-consequences`.
  4. `gh repo view --json visibility` to confirm.
- **Human moment:** none beyond the consent.
- **Risk:** the full history becomes public. The scan exists to make that safe. The UNEP data is
  CC BY-NC-SA, and the attribution is already in the repo.
- **Status:** pending.

### 9 · Host the live dashboard — PLAN GAP

- **What:** the README and the submission both carry `TBD-post-build: live dashboard URL`. **No
  plan task hosts the dashboard.** The spec only says `NEXT_PUBLIC_BASE_PATH` "supports GitHub
  Pages-style hosting".
- **Proposed (not product code):**
  - Build the static export with `NEXT_PUBLIC_BASE_PATH=/plumeclock`.
  - Push `out/` plus `.nojekyll` to a `gh-pages` branch.
  - Enable Pages through `gh api repos/bitnormie01/plumeclock/pages`.
  - Free GitHub Pages needs the repo public, so this comes after gate 8.
- **Tier:** A, run only on the user's explicit go: it publishes public content.
- **Pass:** closing (after gates 5 and 8).
- **Human moment:** a decision. Accept this approach, or route it to the architect as a plan task.
- **Risk:** a public static site. It reads only public on-chain data and the committed JSON.
- **Status:** pending — needs a decision.

### 10 · Demo video + upload — owned by demo-studio (Step 2.5)

- **What:** demo-studio resolves the draft's demo-video URL and logs its upload in this ledger.
  Gate 11 pauses until it's done.
- **Tollgate row 13:** Chrome must be signed in to the upload account. That gets re-probed in
  demo-studio's own session.
- **Status:** dependency, not run by this seat.

### 11 · Fill the Devpost submission form (save as draft)

- **What:** resolve every `TBD-post-build:` line in `docs/gates/submission-draft.md` and the
  README, commit, paste into Devpost, and upload the PDF bundle.
- **Tier:** A, on the user's explicit go: entering data into a form.
- **Pass:** closing (after gates 5, 6, 8, 9 and 10).
- **Tool plan:**
  1. claude-in-chrome: re-read the signed-in Devpost identity first. A mismatch or logged-out state
     is a hard stop. The agent never signs in.
  2. Fill each field from the draft.
  3. Upload with claude-in-chrome `file_upload`: a PDF built locally from `docs/architecture.md`,
     `docs/security-and-data-integrity.md` and `docs/impact-and-adoption.md` (≤ 35 MB).
  4. Save as a platform draft.
  5. Commit the resolved draft.
- **Human moment:** review the saved draft.
- **Risk:** the form fields are unverified, since the form is behind a login (INDEX (r)). The track
  is stated in the description because there may be no track selector.
- **Status:** pending.

### 12 · Press Submit on Devpost

- **What:** the irreversible final submission. It's a separate gate from filling the form, always.
- **Tier:** C. The user presses Submit. If they would rather the agent click it, they say so at
  that moment as its own consent.
- **Pass:** closing (after gate 11).
- **Human moment:**
  - Confirm the eligibility category. The overview says "Students only" while the rules admit
    independent developers and professionals (INDEX (b)). This is the user's own attestation.
  - Press Submit before Oct 25 19:30 IST.
  - The rules page's "don't submit before 8 AM PT on October 25" line is recorded, not resolved
    (INDEX (a)). Check the live page before submitting.
- **Tool plan:** claude-in-chrome reads the confirmation screen afterwards, and its URL goes here as
  evidence.
- **Status:** pending.

### 13 · Scrub secrets and revoke the API key

- **What:**
  - Remove `DEPLOYER_PRIVATE_KEY`, `FEEDER_PRIVATE_KEY`, `OPERATOR_A_PRIVATE_KEY`,
    `OPERATOR_B_PRIVATE_KEY` and `LLM_API_KEY` from `HKCU\Environment`.
  - Delete any `.env` in the clone.
  - Revoke the Anthropic key.
- **Tier:** A for the registry delete (`reg delete HKCU\Environment /v <name> /f`). B for the
  revoke, which happens in the user's Anthropic console.
- **Pass:** closing, after submit. Optionally later, if a judge might re-run the demo.
- **Human moment:** revoke the API key in the console.
- **Status:** pending.

## Inventoried, not gates (N-A, with the reason)

- **Wallet extension install/import:** N-A. The dashboard has no wallet connect, and the demo signs
  from the CLI. If demo-studio wants a wallet on camera, importing a burner key is the user's paste
  moment, logged here.
- **RPC provider signup (`RPC_URL`):** N-A. The public `https://sepolia.base.org` passed S11. This
  gets revisited only if it throttles during gates 5–6.
- **Blockscout API key:** N-A. Verification needs none (S12).
- **ElevenLabs key:** belongs to demo-studio (tollgate row 12) and is conditional on its voice
  choice.

## Activity log (signups, CAPTCHAs, ToS accepts, keys issued, txs)

| Date | Gate | Event | Evidence |
|---|---|---|---|
| 2026-10-15 | — | Ledger created (preflight inventory). Nothing executed. | this commit |

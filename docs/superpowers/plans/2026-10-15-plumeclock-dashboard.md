# PlumeClock Dashboard Implementation Plan

**Goal:** Build the public, read-only PlumeClock dashboard: an SVG world map of IMEO alerts, country response rates and live tickets, a triage-sorted list, and a ticket panel with explorer links, on-chain record verification and the AI notice.
**Architecture:** Next.js 15.5 App Router as a static export (no server). Pure libraries (chain, format, status, readModel, view) feed pure components (WorldMap, TicketList, TicketPanel, DashboardView); one stateful Dashboard component loads JSON fixtures and polls the chain with viem.
**Tech Stack:** Next.js 15.5.28, React 19.2.9, TypeScript 5.9.3, viem 2.56.9, d3-geo 3.1.1, topojson-client 3.1.0, world-atlas 2.0.2, vitest 3.2.7 + jsdom 26.1.0 + @testing-library/react 16.3.3
**Source spec:** docs/superpowers/specs/2026-10-15-plumeclock-design.md

---

## How to read these tasks

- Run every command from the repository root. Commands work in Windows PowerShell and Git Bash; the README gate (Task 4.10 in the demo plan) is PowerShell-only.
- A code block introduced by "Create ... with exactly this content" is the complete file. Write it byte-for-byte; do not reformat or "improve" it. These files were compiled and tested together before this plan was written.
- Write every file as UTF-8 without a byte-order mark. Use your file-writing tool, not PowerShell 5.1's `Set-Content` or `Out-File`, which add a BOM (`JSON.parse` on a file read with `readFileSync` fails on it).
- `npm run check -- <files>` runs `tsc --noEmit` over the whole project, then vitest on the named files. Both must pass.
- Never run git. The orchestrator commits exactly the files listed under **Files:**.
- Tasks marked HUMAN-GATED are never executed by an executor: the orchestrator pauses them for the user or the gate-concierge.

### Task 3.1: Next.js app shell and stylesheet

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

**Depends on:** Task 1.1
**Effort:** low
**Model tier:** fast
**Provides:** `src/app/layout.tsx (imports ./globals.css), src/app/globals.css (status-* colour classes), src/app/page.tsx placeholder`
**Requires:** `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

Static-export Next.js 15.5 shell (next.config.mjs from Task 1.1 sets `output: 'export'`). `page.tsx` is a placeholder that Task 3.7 replaces. `globals.css` holds the dark theme, layout grid and the `status-*` colour classes the components use.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

- [ ] **Step 1: Confirm there is no app yet**
      Run: `npm run build`
      Expected: FAIL — Next.js reports it cannot find an `app` or `pages` directory

- [ ] **Step 2: Create the shell**

Create `src/app/layout.tsx` with exactly this content:

````tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlumeClock',
  description:
    'On-chain response clocks for satellite-detected methane super-emitters (UNEP IMEO MARS data, Base Sepolia testnet).',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
````

Create `src/app/globals.css` with exactly this content:

````css
:root {
  --bg: #0b1220;
  --panel: #111a2e;
  --ink: #e6edf7;
  --muted: #8b9bb4;
  --land: #1c2a44;
  --sphere: #0e1729;
  --line: #24324d;
  --unbonded: #c9d3e3;
  --running: #f5a524;
  --overdue: #ff6b3d;
  --responded: #4ea8ff;
  --resolved: #2fd17a;
  --slashed: #ff3b5c;
  --disputed: #b47cff;
  --dismissed: #7a879c;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

header h1 {
  margin: 0;
  font-size: 28px;
}

.tagline {
  margin: 4px 0 8px;
  color: var(--muted);
}

.banner {
  margin: 8px 0;
  padding: 8px 12px;
  border-left: 3px solid var(--running);
  background: var(--panel);
  font-size: 14px;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 0;
  list-style: none;
  font-size: 14px;
}

.warning {
  color: var(--overdue);
}

main {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  main {
    grid-template-columns: 1fr;
  }
}

.layer-toggles {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 13px;
  margin-bottom: 6px;
}

.world-map {
  width: 100%;
  height: auto;
  display: block;
}

.map-sphere {
  fill: var(--sphere);
  stroke: var(--line);
}

.map-land {
  fill: var(--land);
}

.alert-dot {
  fill: #ff6b6b;
  opacity: 0.45;
  cursor: pointer;
}

.alert-dot.responded {
  fill: #5fd3c4;
}

.rr-bubble {
  opacity: 0.22;
}

.ticket-marker {
  stroke: #0b1220;
  stroke-width: 1.5;
  cursor: pointer;
}

.ticket-marker.selected {
  stroke: #ffffff;
  stroke-width: 3;
}

.status-unbonded {
  fill: var(--unbonded);
  color: var(--unbonded);
}
.status-running {
  fill: var(--running);
  color: var(--running);
}
.status-overdue {
  fill: var(--overdue);
  color: var(--overdue);
}
.status-responded {
  fill: var(--responded);
  color: var(--responded);
}
.status-resolved {
  fill: var(--resolved);
  color: var(--resolved);
}
.status-slashed {
  fill: var(--slashed);
  color: var(--slashed);
}
.status-disputed {
  fill: var(--disputed);
  color: var(--disputed);
}
.status-dismissed {
  fill: var(--dismissed);
  color: var(--dismissed);
}
.status-none {
  color: var(--muted);
}

circle.status-running {
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}

.ticket-list {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 13px;
}

.ticket-list th,
.ticket-list td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

.ticket-list tr[data-testid='ticket-row'] {
  cursor: pointer;
}

.ticket-list tr.selected {
  background: var(--panel);
}

.priority-high {
  color: var(--slashed);
}
.priority-medium {
  color: var(--running);
}
.priority-low {
  color: var(--muted);
}

.ticket-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  align-self: start;
  position: sticky;
  top: 16px;
}

.ticket-panel.empty {
  color: var(--muted);
}

.ticket-panel h2 {
  margin: 0;
}

.ticket-panel h3 {
  margin: 16px 0 6px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.ticket-panel dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
  margin: 0;
  font-size: 14px;
}

.ticket-panel dt {
  color: var(--muted);
}

.ticket-panel dd {
  margin: 0;
}

.caveat {
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}

.big {
  font-size: 22px;
  margin: 4px 0;
}

.clock {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 22px;
  margin: 8px 0;
}

.slashed {
  color: var(--slashed);
}

.verification {
  color: var(--resolved);
}

.transitions,
.history {
  font-size: 13px;
  padding-left: 18px;
}

.transitions a {
  color: var(--responded);
}

button {
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: #1a2744;
  color: var(--ink);
  cursor: pointer;
}

.muted {
  color: var(--muted);
}

.mono {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
}

footer {
  margin-top: 24px;
  font-size: 12px;
  color: var(--muted);
  border-top: 1px solid var(--line);
  padding-top: 12px;
}
````

Create `src/app/page.tsx` with exactly this content:

````tsx
export default function Page() {
  return <main>PlumeClock</main>;
}
````

- [ ] **Step 3: Run to confirm it passes (gate)**
      Run: `npm run build`
      Expected: PASS — ends with `○  (Static)  prerendered as static content`

- [ ] **Step 4: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(web): Next.js static-export shell and stylesheet`

### Task 3.2: Chain config, display formatting and status mapping

**Files:**
- Create: `src/lib/chain.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/status.ts`
- Test:   `test/ui-lib.test.ts`

**Depends on:** Task 2.1
**Effort:** low
**Model tier:** standard
**Provides:** `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`
**Requires:** `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

`chain.ts` knows anvil (31337) and Base Sepolia (84532) with **public** RPCs only (deployment files are committed) and Blockscout links. `format.ts` maps chain seconds onto the 30-day display clock (`remaining x 30 days / responseWindow`). `status.ts` maps the Solidity `Status` enum plus bond and deadline to what the UI shows (an open unbonded ticket is never shown as overdue).

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

- [ ] **Step 1: Write the failing test**

Create `test/ui-lib.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import { addressUrl, networkConfig, txUrl } from '../src/lib/chain';
import {
  decodeSourceId,
  displayRemainingSeconds,
  formatClock,
  formatDate,
  formatEth,
  formatRate,
  formatTonnes,
  shortAddress,
  warpLabel,
} from '../src/lib/format';
import { STATUS_LABELS, displayStatus } from '../src/lib/status';

describe('chain', () => {
  it('knows anvil and Base Sepolia with public RPCs only', () => {
    expect(networkConfig('base-sepolia').chain.id).toBe(84532);
    expect(networkConfig('base-sepolia').rpcUrl).toBe('https://sepolia.base.org');
    expect(networkConfig('anvil').chain.id).toBe(31337);
    expect(() => networkConfig('mainnet')).toThrow('Unknown network "mainnet"');
  });

  it('builds Blockscout links and none without an explorer', () => {
    expect(txUrl('https://base-sepolia.blockscout.com', '0xabc')).toBe('https://base-sepolia.blockscout.com/tx/0xabc');
    expect(addressUrl('https://base-sepolia.blockscout.com', '0x1')).toBe('https://base-sepolia.blockscout.com/address/0x1');
    expect(txUrl('', '0xabc')).toBeNull();
  });
});

describe('format', () => {
  it('maps the chain response window onto a 30-day display clock', () => {
    expect(displayRemainingSeconds(180, 180)).toBe(30 * 86_400);
    expect(displayRemainingSeconds(90, 180)).toBe(15 * 86_400);
    expect(displayRemainingSeconds(-5, 180)).toBe(0);
    expect(displayRemainingSeconds(10, 0)).toBe(0);
    expect(formatClock(30 * 86_400)).toBe('30d 00h 00m');
    expect(formatClock(86_400 + 3_600 * 4 + 60 * 5 + 59)).toBe('1d 04h 05m');
    expect(warpLabel(180)).toBe('demo time-warp: 30 days = 180 s');
  });

  it('formats tonnes, rates, dates, addresses and ETH', () => {
    expect(formatTonnes(2_048_443)).toBe('2.05 Mt');
    expect(formatTonnes(48_210)).toBe('48.2 kt');
    expect(formatTonnes(530)).toBe('530 t');
    expect(formatRate(7847)).toBe('7,847 kg/h');
    expect(formatDate(1780217349)).toBe('2026-05-31');
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
    expect(formatEth(1_000_000_000_000_000n)).toBe('0.001 ETH');
  });

  it('decodes bytes32 source ids', () => {
    expect(decodeSourceId('0x4b415a5f535f3030330000000000000000000000000000000000000000000000')).toBe('KAZ_S_003');
  });
});

describe('displayStatus', () => {
  const bonded = { operator: '0x00000000000000000000000000000000000000a1', deadline: 100 };
  const unbonded = { operator: '0x0000000000000000000000000000000000000000', deadline: 100 };

  it('splits Open by bond and clock', () => {
    expect(displayStatus({ ...unbonded, status: 1 }, 50)).toBe('unbonded');
    expect(displayStatus({ ...bonded, status: 1 }, 100)).toBe('running');
    expect(displayStatus({ ...bonded, status: 1 }, 101)).toBe('overdue');
  });

  it('maps every other chain status', () => {
    expect([2, 3, 4, 5, 6].map((s) => displayStatus({ ...bonded, status: s }, 0))).toEqual([
      'responded',
      'resolved',
      'slashed',
      'disputed',
      'dismissed',
    ]);
    expect(() => displayStatus({ ...bonded, status: 0 }, 0)).toThrow('Unknown ticket status 0');
    expect(STATUS_LABELS.slashed).toBe('Slashed · bond to mitigation fund');
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/ui-lib.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/chain'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/chain.ts` with exactly this content:

````ts
import type { Chain } from 'viem';
import { baseSepolia, foundry } from 'viem/chains';
import type { NetworkName } from './types';

export interface NetworkConfig {
  name: NetworkName;
  chain: Chain;
  /** Public RPC endpoint; never a keyed URL (deployment files are committed). */
  rpcUrl: string;
  explorerUrl: string;
}

export const NETWORKS: Readonly<Record<NetworkName, NetworkConfig>> = {
  anvil: { name: 'anvil', chain: foundry, rpcUrl: 'http://127.0.0.1:8545', explorerUrl: '' },
  'base-sepolia': {
    name: 'base-sepolia',
    chain: baseSepolia,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://base-sepolia.blockscout.com',
  },
};

export function networkConfig(name: string): NetworkConfig {
  if (name === 'anvil' || name === 'base-sepolia') return NETWORKS[name];
  throw new Error(`Unknown network "${name}" (use anvil or base-sepolia)`);
}

export function txUrl(explorerUrl: string, hash: string): string | null {
  return explorerUrl ? `${explorerUrl}/tx/${hash}` : null;
}

export function addressUrl(explorerUrl: string, address: string): string | null {
  return explorerUrl ? `${explorerUrl}/address/${address}` : null;
}
````

Create `src/lib/format.ts` with exactly this content:

````ts
import { formatEther, hexToString, type Hex } from 'viem';

/** The dashboard renders every response window as IMEO's 30-calendar-day feedback request. */
export const DISPLAY_CLOCK_DAYS = 30;

/** Remaining chain seconds -> remaining seconds on the 30-day display clock. */
export function displayRemainingSeconds(remainingChainSeconds: number, responseWindowSeconds: number): number {
  if (responseWindowSeconds <= 0) return 0;
  return Math.round((Math.max(0, remainingChainSeconds) * DISPLAY_CLOCK_DAYS * 86_400) / responseWindowSeconds);
}

/** "29d 23h 59m" style countdown. */
export function formatClock(displaySeconds: number): string {
  const s = Math.max(0, Math.floor(displaySeconds));
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

export function warpLabel(responseWindowSeconds: number): string {
  return `demo time-warp: ${DISPLAY_CLOCK_DAYS} days = ${responseWindowSeconds} s`;
}

/** 2048443 -> "2.05 Mt", 48210 -> "48.2 kt", 530 -> "530 t" (CO2e). */
export function formatTonnes(tonnes: number): string {
  if (tonnes >= 1e6) return `${(tonnes / 1e6).toFixed(2)} Mt`;
  if (tonnes >= 1e3) return `${(tonnes / 1e3).toFixed(1)} kt`;
  return `${Math.round(tonnes)} t`;
}

export function formatRate(kgPerHour: number): string {
  return `${kgPerHour.toLocaleString('en-US')} kg/h`;
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** bytes32 right-padded ASCII -> "KAZ_S_003". */
export function decodeSourceId(sourceId: Hex): string {
  return hexToString(sourceId, { size: 32 }).replace(/\0+$/, '');
}

export function formatEth(wei: bigint): string {
  return `${formatEther(wei)} ETH`;
}
````

Create `src/lib/status.ts` with exactly this content:

````ts
/** Solidity `Status` enum order (contracts/src/PlumeTypes.sol). */
export const STATUS_NAMES = ['None', 'Open', 'Responded', 'Resolved', 'Slashed', 'Disputed', 'Dismissed'] as const;

export type DisplayStatus =
  | 'unbonded'
  | 'running'
  | 'overdue'
  | 'responded'
  | 'resolved'
  | 'slashed'
  | 'disputed'
  | 'dismissed';

export const STATUS_LABELS: Readonly<Record<DisplayStatus, string>> = {
  unbonded: 'Open · no operator bond',
  running: 'Open · clock running',
  overdue: 'Overdue · slashable',
  responded: 'Responded · awaiting re-observation',
  resolved: 'Resolved',
  slashed: 'Slashed · bond to mitigation fund',
  disputed: 'Disputed · clock paused',
  dismissed: 'Dismissed · misattribution upheld',
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface StatusInput {
  status: number;
  operator: string;
  deadline: number;
}

/** Chain status + bond + clock -> what the dashboard shows. */
export function displayStatus(t: StatusInput, nowSeconds: number): DisplayStatus {
  switch (t.status) {
    case 1:
      if (t.operator.toLowerCase() === ZERO_ADDRESS) return 'unbonded';
      return nowSeconds > t.deadline ? 'overdue' : 'running';
    case 2:
      return 'responded';
    case 3:
      return 'resolved';
    case 4:
      return 'slashed';
    case 5:
      return 'disputed';
    case 6:
      return 'dismissed';
    default:
      throw new Error(`Unknown ticket status ${t.status}`);
  }
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/ui-lib.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  7 passed (7)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(web): chain config, formatting and status mapping`

### Task 3.3: Read model: tickets, bonds, transitions and record verification

**Files:**
- Create: `src/lib/readModel.ts`
- Test:   `test/readModel.test.ts`

**Depends on:** Task 1.10, Task 2.2, Task 3.2
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/readModel.ts: TicketView, RawTicket, ReadClient, toTicketView, makeReadClient(chain, rpcUrl), fetchTickets(client, address), fetchBondAmount, fetchResponseWindow, fetchRootKind, fetchTransitions(client, address, ticketId): TransitionEvent[], verifyRecord(record, proof, root, rootKindOnChain): Verification, recomputeRoot`
**Requires:** `src/lib/abi.generated.ts: export const plumeClockAbi, export const mitigationFundAbi (as const, generated from the Foundry artifacts)`, `src/lib/merkle.ts: sourceIdFromName(name): Hex; hashSourceRecord(rec: SourceRecord): Hex; hashReobservation(obs: Reobservation): Hex; toAbiSourceRecord(rec); toAbiReobservation(obs); buildTree(leaves): MerkleTree; getProof(tree, leaf): Hex[]; verifyProof(leaf, proof, root): boolean`, `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`, `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

Everything the dashboard reads from chain, via viem: paged `getTickets`, bonds, the response window, root kinds, and a ticket's state-change events fetched with one-block `getLogs` per entry of `getTransitionBlocks` (no wide log scans on public RPCs). `verifyRecord` recomputes a record's leaf, checks its proof and confirms the root was posted on-chain as a snapshot root. The test runs against an in-memory fake node that answers with ABI-encoded results and logs.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/abi.generated.ts: export const plumeClockAbi, export const mitigationFundAbi (as const, generated from the Foundry artifacts)`
- `src/lib/merkle.ts: sourceIdFromName(name): Hex; hashSourceRecord(rec: SourceRecord): Hex; hashReobservation(obs: Reobservation): Hex; toAbiSourceRecord(rec); toAbiReobservation(obs); buildTree(leaves): MerkleTree; getProof(tree, leaf): Hex[]; verifyProof(leaf, proof, root): boolean`
- `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`
- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

- [ ] **Step 1: Write the failing test**

Create `test/readModel.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import {
  createPublicClient,
  custom,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  type Hex,
} from 'viem';
import { foundry } from 'viem/chains';
import { plumeClockAbi } from '../src/lib/abi.generated';
import { hashSourceRecord, sourceIdFromName } from '../src/lib/merkle';
import {
  fetchBondAmount,
  fetchResponseWindow,
  fetchRootKind,
  fetchTickets,
  fetchTransitions,
  toTicketView,
  verifyRecord,
  type RawTicket,
  type ReadClient,
} from '../src/lib/readModel';
import type { SnapshotRecord } from '../src/lib/types';

const CONTRACT: Hex = '0x00000000000000000000000000000000000000c1';
const TICKET_ID: Hex = '0x1111111111111111111111111111111111111111111111111111111111111111';
const TX: Hex = '0x2222222222222222222222222222222222222222222222222222222222222222';

const RAW: RawTicket = {
  id: TICKET_ID,
  sourceId: sourceIdFromName('KAZ_S_003'),
  snapshotRoot: '0x00000000000000000000000000000000000000000000000000000000000000aa',
  operator: '0x00000000000000000000000000000000000000b2',
  status: 1,
  rateKgPerHour: 7847,
  reopenCount: 0,
  lastPlumeAt: 1780217349n,
  openedAt: 1800000000n,
  deadline: 1800000180n,
  respondedAt: 0n,
  closedAt: 0n,
  pausedRemaining: 0n,
  co2eTonnesPerYear: 2048443n,
  slashedAmount: 0n,
};

/** A fake JSON-RPC node that answers PlumeClock reads with ABI-encoded results. */
function fakeClient(): ReadClient {
  return createPublicClient({
    chain: foundry,
    transport: custom({
      async request({ method, params }) {
        if (method === 'eth_chainId') return '0x7a69';
        if (method === 'eth_call') {
          const [{ data }] = params as [{ data: Hex }];
          const call = decodeFunctionData({ abi: plumeClockAbi, data });
          switch (call.functionName) {
            case 'getTickets':
              return encodeFunctionResult({ abi: plumeClockAbi, functionName: 'getTickets', result: [RAW] });
            case 'getBond':
              return encodeFunctionResult({
                abi: plumeClockAbi,
                functionName: 'getBond',
                result: { operator: RAW.operator, amount: 1_000_000_000_000_000n },
              });
            case 'responseWindow':
              return encodeFunctionResult({ abi: plumeClockAbi, functionName: 'responseWindow', result: 180n });
            case 'rootInfo':
              return encodeFunctionResult({
                abi: plumeClockAbi,
                functionName: 'rootInfo',
                result: { kind: 1, postedAt: 1800000000n },
              });
            case 'getTransitionBlocks':
              return encodeFunctionResult({
                abi: plumeClockAbi,
                functionName: 'getTransitionBlocks',
                result: [7n, 7n, 9n],
              });
            default:
              throw new Error(`unexpected call ${call.functionName}`);
          }
        }
        if (method === 'eth_getLogs') {
          const [{ fromBlock }] = params as [{ fromBlock: Hex }];
          const topics = encodeEventTopics({
            abi: plumeClockAbi,
            eventName: fromBlock === '0x7' ? 'TicketOpened' : 'Slashed',
            args: fromBlock === '0x7'
              ? { ticketId: TICKET_ID, sourceId: RAW.sourceId, operator: RAW.operator }
              : { ticketId: TICKET_ID, operator: RAW.operator },
          });
          const data =
            fromBlock === '0x7'
              ? encodeAbiParameters(
                  [{ type: 'bytes32' }, { type: 'uint64' }, { type: 'uint32' }, { type: 'uint256' }],
                  [RAW.snapshotRoot, 1800000180n, 7847, 2048443n],
                )
              : encodeAbiParameters(
                  [{ type: 'uint256' }, { type: 'address' }],
                  [1_000_000_000_000_000n, '0x00000000000000000000000000000000000000f1'],
                );
          return [
            {
              address: CONTRACT,
              topics,
              data,
              blockNumber: fromBlock,
              transactionHash: TX,
              transactionIndex: '0x0',
              blockHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
              logIndex: '0x0',
              removed: false,
            },
          ];
        }
        throw new Error(`unexpected RPC ${method}`);
      },
    }),
  }) as ReadClient;
}

describe('toTicketView', () => {
  it('decodes the source name and converts uint64 fields to numbers', () => {
    expect(toTicketView(RAW)).toMatchObject({
      sourceName: 'KAZ_S_003',
      lastPlumeAt: 1780217349,
      deadline: 1800000180,
      co2eTonnesPerYear: 2048443n,
    });
  });
});

describe('chain reads against a fake node', () => {
  const client = fakeClient();

  it('pages tickets, bonds, the response window and root kinds', async () => {
    const tickets = await fetchTickets(client, CONTRACT);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].sourceName).toBe('KAZ_S_003');
    expect(await fetchBondAmount(client, CONTRACT, RAW.sourceId)).toBe(1_000_000_000_000_000n);
    expect(await fetchResponseWindow(client, CONTRACT)).toBe(180);
    expect(await fetchRootKind(client, CONTRACT, RAW.snapshotRoot)).toBe(1);
  });

  it('reads one-block logs for each distinct transition block', async () => {
    expect(await fetchTransitions(client, CONTRACT, TICKET_ID)).toEqual([
      { eventName: 'TicketOpened', blockNumber: 7n, transactionHash: TX },
      { eventName: 'Slashed', blockNumber: 9n, transactionHash: TX },
    ]);
  });
});

describe('verifyRecord', () => {
  const base = {
    sourceName: 'KAZ_S_003',
    sourceId: sourceIdFromName('KAZ_S_003'),
    lastPlumeId: 'p-kaz-1',
    lastPlumeAt: 1780217349,
    rateKgPerHour: 7847,
    plumeCount: 23,
    latE5: 4534143,
    lonE5: 5519165,
    country: 'Kazakhstan',
    sector: 'Oil and Gas',
    sourceType: 'Transmission Compressor Station',
    persistency: 'persistent',
    notified: 'Yes',
    feedbackOperator: 'No',
    feedbackGovernment: 'No',
    co2eTonnesPerYear: 2048443,
    feedbackLabel: 'Notified – no response received',
    triage: { score: 83, priority: 'high', impact: 0.828, persistenceWeight: 1, responseFactor: 1 },
  } as const;
  const leaf = hashSourceRecord(base);
  const record: SnapshotRecord = { ...base, leaf };

  it('passes all three checks for an untouched record whose root is on-chain', async () => {
    expect(await verifyRecord(record, [], leaf, async () => 1)).toEqual({
      leafMatches: true,
      proofValid: true,
      rootOnChain: true,
    });
  });

  it('flags a tampered field and a root that is not a snapshot root', async () => {
    const tampered: SnapshotRecord = { ...record, feedbackOperator: 'Yes' };
    expect(await verifyRecord(tampered, [], leaf, async () => 2)).toEqual({
      leafMatches: false,
      proofValid: false,
      rootOnChain: false,
    });
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/readModel.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/readModel'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/readModel.ts` with exactly this content:

````ts
import { createPublicClient, http, type Chain, type Hex, type PublicClient, type Transport } from 'viem';
import { plumeClockAbi } from './abi.generated';
import { decodeSourceId } from './format';
import { buildTree, hashSourceRecord, verifyProof } from './merkle';
import type { SnapshotRecord } from './types';

export interface TicketView {
  id: Hex;
  sourceId: Hex;
  sourceName: string;
  snapshotRoot: Hex;
  operator: Hex;
  status: number;
  rateKgPerHour: number;
  reopenCount: number;
  lastPlumeAt: number;
  openedAt: number;
  deadline: number;
  respondedAt: number;
  closedAt: number;
  pausedRemaining: number;
  co2eTonnesPerYear: bigint;
  slashedAmount: bigint;
}

/** Shape viem returns for one Solidity `Ticket` struct. */
export interface RawTicket {
  id: Hex;
  sourceId: Hex;
  snapshotRoot: Hex;
  operator: Hex;
  status: number;
  rateKgPerHour: number;
  reopenCount: number;
  lastPlumeAt: bigint;
  openedAt: bigint;
  deadline: bigint;
  respondedAt: bigint;
  closedAt: bigint;
  pausedRemaining: bigint;
  co2eTonnesPerYear: bigint;
  slashedAmount: bigint;
}

export function toTicketView(raw: RawTicket): TicketView {
  return {
    id: raw.id,
    sourceId: raw.sourceId,
    sourceName: decodeSourceId(raw.sourceId),
    snapshotRoot: raw.snapshotRoot,
    operator: raw.operator,
    status: raw.status,
    rateKgPerHour: raw.rateKgPerHour,
    reopenCount: raw.reopenCount,
    lastPlumeAt: Number(raw.lastPlumeAt),
    openedAt: Number(raw.openedAt),
    deadline: Number(raw.deadline),
    respondedAt: Number(raw.respondedAt),
    closedAt: Number(raw.closedAt),
    pausedRemaining: Number(raw.pausedRemaining),
    co2eTonnesPerYear: raw.co2eTonnesPerYear,
    slashedAmount: raw.slashedAmount,
  };
}

export type ReadClient = PublicClient<Transport, Chain>;

export function makeReadClient(chain: Chain, rpcUrl: string): ReadClient {
  return createPublicClient({ chain, transport: http(rpcUrl) }) as ReadClient;
}

const PAGE = 200n;

export async function fetchTickets(client: ReadClient, address: Hex): Promise<TicketView[]> {
  const out: TicketView[] = [];
  for (let start = 0n; ; start += PAGE) {
    const page = (await client.readContract({
      address,
      abi: plumeClockAbi,
      functionName: 'getTickets',
      args: [start, PAGE],
    })) as readonly RawTicket[];
    out.push(...page.map(toTicketView));
    if (BigInt(page.length) < PAGE) return out;
  }
}

export async function fetchBondAmount(client: ReadClient, address: Hex, sourceId: Hex): Promise<bigint> {
  const bond = (await client.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'getBond',
    args: [sourceId],
  })) as { operator: Hex; amount: bigint };
  return bond.amount;
}

export async function fetchResponseWindow(client: ReadClient, address: Hex): Promise<number> {
  const w = await client.readContract({ address, abi: plumeClockAbi, functionName: 'responseWindow' });
  return Number(w);
}

/** 0 None, 1 Snapshot, 2 Reobservation. */
export async function fetchRootKind(client: ReadClient, address: Hex, root: Hex): Promise<number> {
  const info = (await client.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'rootInfo',
    args: [root],
  })) as { kind: number; postedAt: bigint };
  return info.kind;
}

export interface TransitionEvent {
  eventName: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

/** Every state-change event of one ticket, read with one-block log queries. */
export async function fetchTransitions(client: ReadClient, address: Hex, ticketId: Hex): Promise<TransitionEvent[]> {
  const blocks = (await client.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'getTransitionBlocks',
    args: [ticketId],
  })) as readonly bigint[];
  const unique = [...new Set(blocks.map((b) => BigInt(b)))];
  const out: TransitionEvent[] = [];
  for (const block of unique) {
    const logs = await client.getContractEvents({ address, abi: plumeClockAbi, fromBlock: block, toBlock: block });
    for (const log of logs) {
      const args = (log as unknown as { args?: { ticketId?: Hex } }).args;
      if (args?.ticketId?.toLowerCase() !== ticketId.toLowerCase()) continue;
      out.push({ eventName: log.eventName, blockNumber: log.blockNumber, transactionHash: log.transactionHash });
    }
  }
  return out;
}

export interface Verification {
  leafMatches: boolean;
  proofValid: boolean;
  rootOnChain: boolean;
}

/** Recompute the leaf from the record fields, check its proof, and confirm the root on-chain. */
export async function verifyRecord(
  record: SnapshotRecord,
  proof: readonly Hex[],
  root: Hex,
  rootKindOnChain: () => Promise<number>,
): Promise<Verification> {
  const leaf = hashSourceRecord(record);
  return {
    leafMatches: leaf === record.leaf,
    proofValid: verifyProof(leaf, proof, root),
    rootOnChain: (await rootKindOnChain()) === 1,
  };
}

/** Root over every snapshot leaf (lets the UI show the committed root without trusting the file). */
export function recomputeRoot(records: readonly SnapshotRecord[]): Hex {
  return buildTree(records.map((r) => r.leaf)).root;
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/readModel.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  5 passed (5)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(web): chain read model and record verification`

### Task 3.4: World map, status badge and ticket list components

**Files:**
- Create: `src/components/WorldMap.tsx`
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/TicketList.tsx`
- Test:   `test/map-list.test.tsx`

**Depends on:** Task 3.2
**Effort:** medium
**Model tier:** standard
**Provides:** `src/components/WorldMap.tsx: WorldMap(props), MapDot, MapTicket, MapBubble, markerRadius, rateColor; src/components/StatusBadge.tsx: StatusBadge({ status }); src/components/TicketList.tsx: TicketList({ rows, selected, onSelect }), TicketRow, sortRows`
**Requires:** `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`, `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

SVG Equal Earth map (d3-geo) with world-atlas `land-110m` land, IMEO alert dots, country response-rate bubbles and ticket markers coloured by status (a running clock pulses via CSS). No map tiles or network at render time. The list sorts by triage score.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`
- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

- [ ] **Step 1: Write the failing test**

Create `test/map-list.test.tsx` with exactly this content:

````tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatusBadge } from '../src/components/StatusBadge';
import { TicketList, sortRows, type TicketRow } from '../src/components/TicketList';
import { WorldMap, markerRadius, rateColor } from '../src/components/WorldMap';

afterEach(cleanup);

describe('WorldMap', () => {
  const props = {
    dots: [
      { sourceName: 'KAZ_S_003', lat: 45.3, lon: 55.2, responded: false },
      { sourceName: 'IRQ_S_067', lat: 31.4, lon: 45.7, responded: true },
    ],
    tickets: [{ sourceName: 'KAZ_S_003', lat: 45.3, lon: 55.2, status: 'running' as const, co2eTonnesPerYear: 2_048_443 }],
    bubbles: [{ country: 'Kazakhstan', lat: 45.3, lon: 55.2, ratePct: 20, sourcesNotified: 50, sourcesWithFeedback: 10 }],
  };

  it('draws land, alert dots, overlay bubbles and ticket markers', () => {
    const onSelect = vi.fn();
    render(<WorldMap {...props} showAlerts showOverlay selected="KAZ_S_003" onSelect={onSelect} />);
    expect(screen.getByRole('img', { name: /World map of PlumeClock methane tickets/ })).toBeTruthy();
    expect(screen.getAllByTestId('alert-dot')).toHaveLength(2);
    expect(screen.getAllByTestId('rr-bubble')).toHaveLength(1);
    const marker = screen.getByTestId('ticket-marker');
    expect(marker.getAttribute('class')).toBe('ticket-marker status-running selected');
    fireEvent.click(marker);
    expect(onSelect).toHaveBeenCalledWith('KAZ_S_003');
    expect(document.querySelector('.map-land')?.getAttribute('d')?.length).toBeGreaterThan(1000);
  });

  it('hides toggled-off layers', () => {
    render(<WorldMap {...props} showAlerts={false} showOverlay={false} selected={null} onSelect={() => {}} />);
    expect(screen.queryAllByTestId('alert-dot')).toHaveLength(0);
    expect(screen.queryAllByTestId('rr-bubble')).toHaveLength(0);
    expect(screen.getAllByTestId('ticket-marker')).toHaveLength(1);
  });

  it('scales markers and colours response rates', () => {
    expect(markerRadius(10_000)).toBe(4);
    expect(markerRadius(1e12)).toBe(12);
    expect(rateColor(0)).toBe('hsl(0, 70%, 45%)');
    expect(rateColor(100)).toBe('hsl(120, 70%, 45%)');
  });
});

describe('StatusBadge and TicketList', () => {
  it('labels statuses and the not-yet-opened state', () => {
    render(
      <div>
        <StatusBadge status="slashed" />
        <StatusBadge status={null} />
      </div>,
    );
    expect(screen.getByText('Slashed · bond to mitigation fund')).toBeTruthy();
    expect(screen.getByText('Committed · not opened on-chain')).toBeTruthy();
  });

  const rows: TicketRow[] = [
    { sourceName: 'IRQ_S_067', country: 'Iraq', sourceType: 'Pipeline valve', status: 'resolved', co2eTonnesPerYear: 32_237_078, score: 3, priority: 'low', clock: null },
    { sourceName: 'KAZ_S_003', country: 'Kazakhstan', sourceType: 'Compressor', status: 'running', co2eTonnesPerYear: 2_048_443, score: 83, priority: 'high', clock: '15d 00h 00m' },
  ];

  it('sorts by triage score and reports clicks', () => {
    expect(sortRows(rows).map((r) => r.sourceName)).toEqual(['KAZ_S_003', 'IRQ_S_067']);
    const onSelect = vi.fn();
    render(<TicketList rows={rows} selected="KAZ_S_003" onSelect={onSelect} />);
    const listed = screen.getAllByTestId('ticket-row');
    expect(within(listed[0]).getByText('KAZ_S_003')).toBeTruthy();
    expect(within(listed[0]).getByText('15d 00h 00m')).toBeTruthy();
    expect(within(listed[0]).getByText('high (83)')).toBeTruthy();
    fireEvent.click(listed[1]);
    expect(onSelect).toHaveBeenCalledWith('IRQ_S_067');
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/map-list.test.tsx`
      Expected: FAIL — tsc: Cannot find module '../src/components/StatusBadge'

- [ ] **Step 3: Minimal implementation**

Create `src/components/WorldMap.tsx` with exactly this content:

````tsx
'use client';

import { geoEqualEarth, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import type { DisplayStatus } from '../lib/status';

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 500;

export interface MapDot {
  sourceName: string;
  lat: number;
  lon: number;
  responded: boolean;
}

export interface MapTicket {
  sourceName: string;
  lat: number;
  lon: number;
  status: DisplayStatus;
  co2eTonnesPerYear: number;
}

export interface MapBubble {
  country: string;
  lat: number;
  lon: number;
  ratePct: number;
  sourcesNotified: number;
  sourcesWithFeedback: number;
}

export interface WorldMapProps {
  dots: MapDot[];
  tickets: MapTicket[];
  bubbles: MapBubble[];
  showAlerts: boolean;
  showOverlay: boolean;
  selected: string | null;
  onSelect: (sourceName: string) => void;
}

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);

/** Marker radius grows with log CO2e: 10 kt -> 4 px, 100 Mt -> 12 px. */
export function markerRadius(co2eTonnesPerYear: number): number {
  return 4 + Math.min(8, Math.max(0, Math.log10(Math.max(co2eTonnesPerYear, 1)) - 4) * 2);
}

/** 0 % -> red, 100 % -> green. */
export function rateColor(ratePct: number): string {
  return `hsl(${Math.round((Math.min(100, Math.max(0, ratePct)) / 100) * 120)}, 70%, 45%)`;
}

export function WorldMap({ dots, tickets, bubbles, showAlerts, showOverlay, selected, onSelect }: WorldMapProps) {
  const projection = useMemo(() => geoEqualEarth().fitSize([MAP_WIDTH, MAP_HEIGHT], { type: 'Sphere' }), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const project = (lon: number, lat: number): [number, number] => projection([lon, lat]) ?? [-1000, -1000];

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="world-map"
      role="img"
      aria-label="World map of PlumeClock methane tickets"
    >
      <path className="map-sphere" d={path({ type: 'Sphere' }) ?? ''} />
      <path className="map-land" d={path(land) ?? ''} />
      {showOverlay &&
        bubbles.map((b) => {
          const [x, y] = project(b.lon, b.lat);
          return (
            <circle
              key={`rr-${b.country}`}
              data-testid="rr-bubble"
              className="rr-bubble"
              cx={x}
              cy={y}
              r={6 + Math.sqrt(b.sourcesNotified) * 1.5}
              fill={rateColor(b.ratePct)}
            >
              <title>{`${b.country}: ${b.ratePct}% response rate (${b.sourcesWithFeedback}/${b.sourcesNotified} notified sources)`}</title>
            </circle>
          );
        })}
      {showAlerts &&
        dots.map((d) => {
          const [x, y] = project(d.lon, d.lat);
          return (
            <circle
              key={`dot-${d.sourceName}`}
              data-testid="alert-dot"
              className={d.responded ? 'alert-dot responded' : 'alert-dot'}
              cx={x}
              cy={y}
              r={1.6}
              onClick={() => onSelect(d.sourceName)}
            />
          );
        })}
      {tickets.map((t) => {
        const [x, y] = project(t.lon, t.lat);
        return (
          <circle
            key={`ticket-${t.sourceName}`}
            data-testid="ticket-marker"
            className={`ticket-marker status-${t.status}${selected === t.sourceName ? ' selected' : ''}`}
            cx={x}
            cy={y}
            r={markerRadius(t.co2eTonnesPerYear)}
            onClick={() => onSelect(t.sourceName)}
          >
            <title>{t.sourceName}</title>
          </circle>
        );
      })}
    </svg>
  );
}
````

Create `src/components/StatusBadge.tsx` with exactly this content:

````tsx
import { STATUS_LABELS, type DisplayStatus } from '../lib/status';

export function StatusBadge({ status }: { status: DisplayStatus | null }) {
  if (status === null) return <span className="badge status-none">Committed · not opened on-chain</span>;
  return <span className={`badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}
````

Create `src/components/TicketList.tsx` with exactly this content:

````tsx
import { formatTonnes } from '../lib/format';
import type { DisplayStatus } from '../lib/status';
import type { Priority } from '../lib/types';
import { StatusBadge } from './StatusBadge';

export interface TicketRow {
  sourceName: string;
  country: string;
  sourceType: string;
  status: DisplayStatus | null;
  co2eTonnesPerYear: number;
  score: number;
  priority: Priority;
  clock: string | null;
}

export interface TicketListProps {
  rows: TicketRow[];
  selected: string | null;
  onSelect: (sourceName: string) => void;
}

/** Highest triage score first; ties by source name. */
export function sortRows(rows: readonly TicketRow[]): TicketRow[] {
  return [...rows].sort((a, b) => b.score - a.score || (a.sourceName < b.sourceName ? -1 : 1));
}

export function TicketList({ rows, selected, onSelect }: TicketListProps) {
  return (
    <table className="ticket-list">
      <thead>
        <tr>
          <th>Source</th>
          <th>Status</th>
          <th>Clock</th>
          <th>CO2e/yr if it persists</th>
          <th>Triage</th>
        </tr>
      </thead>
      <tbody>
        {sortRows(rows).map((r) => (
          <tr
            key={r.sourceName}
            data-testid="ticket-row"
            className={selected === r.sourceName ? 'selected' : undefined}
            onClick={() => onSelect(r.sourceName)}
          >
            <td>
              <strong>{r.sourceName}</strong>
              <br />
              <small>
                {r.sourceType} · {r.country}
              </small>
            </td>
            <td>
              <StatusBadge status={r.status} />
            </td>
            <td className="mono">{r.clock ?? '—'}</td>
            <td>{formatTonnes(r.co2eTonnesPerYear)}</td>
            <td className={`priority priority-${r.priority}`}>
              {r.priority} ({r.score})
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/map-list.test.tsx`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  5 passed (5)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(web): world map, status badge and ticket list`

### Task 3.5: Ticket panel

**Files:**
- Create: `src/components/TicketPanel.tsx`
- Create: `test/helpers/viewFixtures.ts`
- Test:   `test/panel.test.tsx`

**Depends on:** Task 3.3, Task 3.4
**Effort:** medium
**Model tier:** standard
**Provides:** `src/components/TicketPanel.tsx: TicketPanel(props: TicketPanelProps); test/helpers/viewFixtures.ts: SNAPSHOT, NOTICES, DEPLOYMENT, OPERATOR_A, OPERATOR_B, ZERO, ticket(sourceName, overrides)`
**Requires:** `src/lib/readModel.ts: TicketView, RawTicket, ReadClient, toTicketView, makeReadClient(chain, rpcUrl), fetchTickets(client, address), fetchBondAmount, fetchResponseWindow, fetchRootKind, fetchTransitions(client, address, ticketId): TransitionEvent[], verifyRecord(record, proof, root, rootKindOnChain): Verification, recomputeRoot`, `src/components/WorldMap.tsx: WorldMap(props), MapDot, MapTicket, MapBubble, markerRadius, rateColor; src/components/StatusBadge.tsx: StatusBadge({ status }); src/components/TicketList.tsx: TicketList({ rows, selected, onSelect }), TicketRow, sortRows`, `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`, `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`, `src/lib/co2e.ts: co2eTonnesPerYear(rateKgPerHour: number): number, GWP100 = 29.8, GWP100_X10 = 298n, HOURS_PER_YEAR = 8760n; src/lib/feedback.ts: feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel, IMEO_RESPONSE_CAVEAT`

The selected ticket: IMEO facts verbatim with IMEO's caveat, CO2e with its assumption, the live clock with its time-warp label, the simulated operator label, bond / slashed amount, transitions with explorer links, the Verify button and result, the AI notice with its triage factors, and the plume history. `test/helpers/viewFixtures.ts` provides fixture snapshot/notices/deployment/tickets for this and later UI tests.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/readModel.ts: TicketView, RawTicket, ReadClient, toTicketView, makeReadClient(chain, rpcUrl), fetchTickets(client, address), fetchBondAmount, fetchResponseWindow, fetchRootKind, fetchTransitions(client, address, ticketId): TransitionEvent[], verifyRecord(record, proof, root, rootKindOnChain): Verification, recomputeRoot`
- `src/components/WorldMap.tsx: WorldMap(props), MapDot, MapTicket, MapBubble, markerRadius, rateColor; src/components/StatusBadge.tsx: StatusBadge({ status }); src/components/TicketList.tsx: TicketList({ rows, selected, onSelect }), TicketRow, sortRows`
- `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`
- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`
- `src/lib/co2e.ts: co2eTonnesPerYear(rateKgPerHour: number): number, GWP100 = 29.8, GWP100_X10 = 298n, HOURS_PER_YEAR = 8760n; src/lib/feedback.ts: feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel, IMEO_RESPONSE_CAVEAT`

- [ ] **Step 1: Write the failing test**

Create `test/helpers/viewFixtures.ts` with exactly this content:

````ts
import type { TicketView } from '../../src/lib/readModel';
import type { DeploymentFile, NoticesFile, SnapshotFile, SnapshotRecord } from '../../src/lib/types';

export const OPERATOR_A = '0x00000000000000000000000000000000000000a1';
export const OPERATOR_B = '0x00000000000000000000000000000000000000b2';
export const ZERO = '0x0000000000000000000000000000000000000000';

function record(
  sourceName: string,
  overrides: Partial<SnapshotRecord> & { latE5: number; lonE5: number },
): SnapshotRecord {
  return {
    sourceName,
    sourceId: '0x0000000000000000000000000000000000000000000000000000000000000000',
    lastPlumeId: `${sourceName}-plume`,
    lastPlumeAt: 1780217349,
    rateKgPerHour: 7847,
    plumeCount: 23,
    country: 'Kazakhstan',
    sector: 'Oil and Gas',
    sourceType: 'Transmission Compressor Station',
    persistency: 'persistent',
    notified: 'Yes',
    feedbackOperator: 'No',
    feedbackGovernment: 'No',
    leaf: '0x0000000000000000000000000000000000000000000000000000000000000001',
    co2eTonnesPerYear: 2048443,
    feedbackLabel: 'Notified – no response received',
    triage: { score: 83, priority: 'high', impact: 0.828, persistenceWeight: 1, responseFactor: 1 },
    ...overrides,
  };
}

export const SNAPSHOT: SnapshotFile = {
  schema: 'plumeclock.snapshot.v1',
  generatedAt: '2026-10-16T09:00:00.000Z',
  provenance: {
    schema: 'plumeclock.provenance.v1',
    fetchedAt: '2026-10-16T09:00:00.000Z',
    license: 'CC BY-NC-SA 4.0',
    attribution: "Data: UNEP's International Methane Emissions Observatory (IMEO).",
    files: [],
  },
  referenceDate: '2026-10-15',
  root: '0x00000000000000000000000000000000000000000000000000000000000000aa',
  universeCount: 3,
  records: [
    record('IRQ_S_067', {
      latE5: 3143071,
      lonE5: 4569914,
      country: 'Iraq',
      sourceType: 'Pipeline valve',
      persistency: 'absent',
      feedbackOperator: 'Yes',
      feedbackGovernment: 'Yes',
      feedbackLabel: 'Government and operator responded',
      rateKgPerHour: 123491,
      co2eTonnesPerYear: 32237078,
      triage: { score: 3, priority: 'low', impact: 1, persistenceWeight: 0.1, responseFactor: 0.3 },
    }),
    record('KAZ_S_003', { latE5: 4534143, lonE5: 5519165 }),
    record('TKM_S_022', {
      latE5: 3833075,
      lonE5: 5402815,
      country: 'Turkmenistan',
      triage: { score: 40, priority: 'high', impact: 0.6, persistenceWeight: 1, responseFactor: 1 },
    }),
  ],
  ticketSet: ['IRQ_S_067', 'KAZ_S_003'],
  proofs: { IRQ_S_067: [], KAZ_S_003: [] },
  scenario: { operatorA: 'IRQ_S_067', operatorB: 'KAZ_S_003' },
  histories: {
    KAZ_S_003: [{ plumeId: 'p1', observedAt: 1780217349, rateKgPerHour: 7847, satellite: 'Sentinel-2 - ESA' }],
  },
  responseRates: [
    {
      country: 'Kazakhstan',
      from: '2025-08-01',
      until: '2026-07-31',
      sourcesNotified: 50,
      sourcesWithFeedback: 10,
      ratePct: 20,
      lat: 45.341,
      lon: 55.192,
    },
    {
      country: 'South Africa',
      from: '2025-08-01',
      until: '2026-07-31',
      sourcesNotified: 2,
      sourcesWithFeedback: 0,
      ratePct: 0,
      lat: null,
      lon: null,
    },
  ],
};

export const NOTICES: NoticesFile = {
  schema: 'plumeclock.notices.v1',
  generatedAt: '2026-10-16T09:00:00.000Z',
  generator: 'template',
  notices: {
    KAZ_S_003: { text: 'KAZ_S_003 notice text.', generator: 'template' },
    IRQ_S_067: { text: 'IRQ_S_067 notice text.', generator: 'template' },
  },
};

export const DEPLOYMENT: DeploymentFile = {
  schema: 'plumeclock.deployment.v1',
  network: 'base-sepolia',
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://base-sepolia.blockscout.com',
  plumeClock: '0x00000000000000000000000000000000000000c1',
  mitigationFund: '0x00000000000000000000000000000000000000f1',
  deployBlock: 1,
  responseWindowSeconds: 180,
  minBondWei: '500000000000000',
  actors: {
    deployer: '0x00000000000000000000000000000000000000d1',
    feeder: '0x00000000000000000000000000000000000000e1',
    arbiter: '0x00000000000000000000000000000000000000d1',
    operatorA: OPERATOR_A,
    operatorB: OPERATOR_B,
  },
  deployedAt: '2026-10-20T10:00:00.000Z',
};

export function ticket(sourceName: string, overrides: Partial<TicketView>): TicketView {
  return {
    id: '0x00000000000000000000000000000000000000000000000000000000000000f0',
    sourceId: '0x0000000000000000000000000000000000000000000000000000000000000000',
    sourceName,
    snapshotRoot: SNAPSHOT.root,
    operator: ZERO,
    status: 1,
    rateKgPerHour: 7847,
    reopenCount: 0,
    lastPlumeAt: 1780217349,
    openedAt: 1_800_000_000,
    deadline: 1_800_000_180,
    respondedAt: 0,
    closedAt: 0,
    pausedRemaining: 0,
    co2eTonnesPerYear: 2048443n,
    slashedAmount: 0n,
    ...overrides,
  };
}
````

Create `test/panel.test.tsx` with exactly this content:

````tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TicketPanel } from '../src/components/TicketPanel';
import { NOTICES, SNAPSHOT } from './helpers/viewFixtures';

afterEach(cleanup);

describe('TicketPanel', () => {
  const record = SNAPSHOT.records[1];

  it('shows IMEO facts verbatim, the CO2e assumption, the clock, history links and the notice', () => {
    const onVerify = vi.fn();
    render(
      <TicketPanel
        record={record}
        status="running"
        clock="15d 00h 00m"
        warp="demo time-warp: 30 days = 180 s"
        operatorLabel="Operator B (simulated)"
        bondWei={1_000_000_000_000_000n}
        slashedWei={0n}
        transitions={[{ eventName: 'TicketOpened', blockNumber: 7n, transactionHash: '0xabc' }]}
        explorerUrl="https://base-sepolia.blockscout.com"
        history={SNAPSHOT.histories.KAZ_S_003}
        notice={NOTICES.notices.KAZ_S_003}
        verification={{ leafMatches: true, proofValid: true, rootOnChain: true }}
        onVerify={onVerify}
      />,
    );
    expect(screen.getByTestId('imeo-status').textContent).toBe('Notified – no response received');
    expect(screen.getByText(/may not necessarily signal indifference/)).toBeTruthy();
    expect(screen.getByTestId('co2e').textContent).toBe('≈ 2.05 Mt CO2e / yr');
    expect(screen.getByText(/GWP100 29.8/)).toBeTruthy();
    expect(screen.getByTestId('clock').textContent).toContain('15d 00h 00m');
    expect(screen.getByText('Operator: Operator B (simulated)')).toBeTruthy();
    expect(screen.getByText('Bond at stake: 0.001 ETH')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'view tx' }).getAttribute('href')).toBe(
      'https://base-sepolia.blockscout.com/tx/0xabc',
    );
    expect(screen.getByTestId('notice').textContent).toBe('KAZ_S_003 notice text.');
    expect(screen.getByTestId('verification').textContent).toBe(
      '✓ leaf recomputed · ✓ Merkle proof · ✓ root posted on-chain',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Verify record against on-chain root' }));
    expect(onVerify).toHaveBeenCalledTimes(1);
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/panel.test.tsx`
      Expected: FAIL — tsc: Cannot find module '../src/components/TicketPanel'

- [ ] **Step 3: Minimal implementation**

Create `src/components/TicketPanel.tsx` with exactly this content:

````tsx
import { txUrl } from '../lib/chain';
import { GWP100 } from '../lib/co2e';
import { IMEO_RESPONSE_CAVEAT } from '../lib/feedback';
import { formatDate, formatEth, formatRate, formatTonnes } from '../lib/format';
import type { TransitionEvent, Verification } from '../lib/readModel';
import type { DisplayStatus } from '../lib/status';
import type { Notice, PlumeHistoryEntry, SnapshotRecord } from '../lib/types';
import { StatusBadge } from './StatusBadge';

export interface TicketPanelProps {
  record: SnapshotRecord;
  status: DisplayStatus | null;
  clock: string | null;
  warp: string | null;
  operatorLabel: string | null;
  bondWei: bigint | null;
  slashedWei: bigint | null;
  transitions: TransitionEvent[];
  explorerUrl: string;
  history: PlumeHistoryEntry[];
  notice: Notice | null;
  verification: Verification | null;
  onVerify: (() => void) | null;
}

function check(ok: boolean): string {
  return ok ? '✓' : '✗';
}

export function TicketPanel(props: TicketPanelProps) {
  const { record } = props;
  return (
    <aside className="ticket-panel" aria-label={`Ticket ${record.sourceName}`}>
      <h2>{record.sourceName}</h2>
      <p className="muted">
        {record.sourceType} · {record.country} · {record.sector}
      </p>

      <section>
        <h3>IMEO detection (verbatim)</h3>
        <dl>
          <dt>Last plume</dt>
          <dd>
            {formatRate(record.rateKgPerHour)} on {formatDate(record.lastPlumeAt)}
          </dd>
          <dt>Plumes attributed</dt>
          <dd>{record.plumeCount}</dd>
          <dt>Persistency</dt>
          <dd>{record.persistency}</dd>
          <dt>IMEO status</dt>
          <dd data-testid="imeo-status">{record.feedbackLabel}</dd>
        </dl>
        <p className="caveat">IMEO: “{IMEO_RESPONSE_CAVEAT}”</p>
      </section>

      <section>
        <h3>Climate stakes</h3>
        <p className="big" data-testid="co2e">
          ≈ {formatTonnes(record.co2eTonnesPerYear)} CO2e / yr
        </p>
        <p className="muted">
          if it persists at the last-detected rate all year · GWP100 {GWP100} (IPCC AR6, fossil CH4)
        </p>
      </section>

      <section>
        <h3>PlumeClock ticket</h3>
        <StatusBadge status={props.status} />
        {props.clock && (
          <p className="clock" data-testid="clock">
            {props.clock} <small>{props.warp}</small>
          </p>
        )}
        {props.operatorLabel && <p>Operator: {props.operatorLabel}</p>}
        {props.bondWei !== null && props.bondWei > 0n && <p>Bond at stake: {formatEth(props.bondWei)}</p>}
        {props.slashedWei !== null && props.slashedWei > 0n && (
          <p className="slashed">Slashed to mitigation fund: {formatEth(props.slashedWei)}</p>
        )}
        {props.transitions.length > 0 && (
          <ol className="transitions">
            {props.transitions.map((t) => {
              const url = txUrl(props.explorerUrl, t.transactionHash);
              return (
                <li key={`${t.transactionHash}-${t.eventName}`} data-testid="transition">
                  {t.eventName} · block {t.blockNumber.toString()}{' '}
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      view tx
                    </a>
                  ) : (
                    <code>{t.transactionHash.slice(0, 10)}…</code>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {props.onVerify && (
          <button type="button" onClick={props.onVerify}>
            Verify record against on-chain root
          </button>
        )}
        {props.verification && (
          <p className="verification" data-testid="verification">
            {check(props.verification.leafMatches)} leaf recomputed · {check(props.verification.proofValid)} Merkle
            proof · {check(props.verification.rootOnChain)} root posted on-chain
          </p>
        )}
      </section>

      {props.notice && (
        <section>
          <h3>AI plume analyst</h3>
          <p data-testid="notice">{props.notice.text}</p>
          <p className="muted">
            Triage {record.triage.priority} ({record.triage.score}/100) = impact {record.triage.impact} × persistence{' '}
            {record.triage.persistenceWeight} × response {record.triage.responseFactor} · drafted by{' '}
            {props.notice.generator}
          </p>
        </section>
      )}

      {props.history.length > 0 && (
        <section>
          <h3>Plume history (newest first)</h3>
          <ul className="history">
            {props.history.map((h) => (
              <li key={h.plumeId}>
                {formatDate(h.observedAt)} · {h.rateKgPerHour === null ? 'not quantified' : formatRate(h.rateKgPerHour)}{' '}
                · {h.satellite}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/panel.test.tsx`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  1 passed (1)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(web): ticket panel`

### Task 3.6: View model and dashboard view

**Files:**
- Create: `src/lib/view.ts`
- Create: `src/components/DashboardView.tsx`
- Test:   `test/view.test.ts`
- Test:   `test/dashboard-view.test.tsx`

**Depends on:** Task 3.5
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/view.ts: buildViewModel(snapshot, tickets, responseWindowSeconds, nowSeconds): ViewModel, latestTicketBySource, clockFor, operatorLabel; src/components/DashboardView.tsx: DashboardView(props), Layers`
**Requires:** `src/components/WorldMap.tsx: WorldMap(props), MapDot, MapTicket, MapBubble, markerRadius, rateColor; src/components/StatusBadge.tsx: StatusBadge({ status }); src/components/TicketList.tsx: TicketList({ rows, selected, onSelect }), TicketRow, sortRows`, `src/components/TicketPanel.tsx: TicketPanel(props: TicketPanelProps); test/helpers/viewFixtures.ts: SNAPSHOT, NOTICES, DEPLOYMENT, OPERATOR_A, OPERATOR_B, ZERO, ticket(sourceName, overrides)`, `src/lib/readModel.ts: TicketView, RawTicket, ReadClient, toTicketView, makeReadClient(chain, rpcUrl), fetchTickets(client, address), fetchBondAmount, fetchResponseWindow, fetchRootKind, fetchTransitions(client, address, ticketId): TransitionEvent[], verifyRecord(record, proof, root, rootKindOnChain): Verification, recomputeRoot`, `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`

`view.ts` joins committed records with on-chain tickets (latest per source), computes clocks, operator labels and header stats. `DashboardView` is the pure, testable page body: honesty banner, stats, layer toggles, map, list, panel and attribution footer. It works without a deployment (snapshot-only mode).

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/components/WorldMap.tsx: WorldMap(props), MapDot, MapTicket, MapBubble, markerRadius, rateColor; src/components/StatusBadge.tsx: StatusBadge({ status }); src/components/TicketList.tsx: TicketList({ rows, selected, onSelect }), TicketRow, sortRows`
- `src/components/TicketPanel.tsx: TicketPanel(props: TicketPanelProps); test/helpers/viewFixtures.ts: SNAPSHOT, NOTICES, DEPLOYMENT, OPERATOR_A, OPERATOR_B, ZERO, ticket(sourceName, overrides)`
- `src/lib/readModel.ts: TicketView, RawTicket, ReadClient, toTicketView, makeReadClient(chain, rpcUrl), fetchTickets(client, address), fetchBondAmount, fetchResponseWindow, fetchRootKind, fetchTransitions(client, address, ticketId): TransitionEvent[], verifyRecord(record, proof, root, rootKindOnChain): Verification, recomputeRoot`
- `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`

- [ ] **Step 1: Write the failing test**

Create `test/view.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import { buildViewModel, clockFor, latestTicketBySource, operatorLabel } from '../src/lib/view';
import { DEPLOYMENT, OPERATOR_A, OPERATOR_B, SNAPSHOT, ZERO, ticket } from './helpers/viewFixtures';

const NOW = 1_800_000_090;

describe('latestTicketBySource', () => {
  it('keeps the most recently opened ticket per source', () => {
    const older = ticket('KAZ_S_003', { id: '0x01', openedAt: 10 });
    const newer = ticket('KAZ_S_003', { id: '0x02', openedAt: 20 });
    expect(latestTicketBySource([newer, older]).get('KAZ_S_003')?.id).toBe('0x02');
  });
});

describe('clockFor', () => {
  it('scales the remaining chain time to the 30-day clock', () => {
    const t = ticket('KAZ_S_003', { operator: OPERATOR_B });
    expect(clockFor(t, 'running', 180, NOW)).toBe('15d 00h 00m');
    expect(clockFor(t, 'overdue', 180, 1_800_000_500)).toBe('0d 00h 00m');
    expect(clockFor({ ...t, pausedRemaining: 60 }, 'disputed', 180, NOW)).toBe('10d 00h 00m (paused)');
    expect(clockFor(t, 'resolved', 180, NOW)).toBeNull();
    expect(clockFor(t, 'running', null, NOW)).toBeNull();
  });
});

describe('operatorLabel', () => {
  it('labels the simulated demo operators and hides unbonded tickets', () => {
    expect(operatorLabel(OPERATOR_A, DEPLOYMENT.actors)).toBe('Operator A (simulated)');
    expect(operatorLabel(OPERATOR_B.toUpperCase().replace('0X', '0x'), DEPLOYMENT.actors)).toBe('Operator B (simulated)');
    expect(operatorLabel(ZERO, DEPLOYMENT.actors)).toBeNull();
    expect(operatorLabel('0x1234567890abcdef1234567890abcdef12345678', null)).toBe('Self-pledged operator 0x1234…5678');
  });
});

describe('buildViewModel', () => {
  it('works in snapshot-only mode (no tickets on-chain)', () => {
    const vm = buildViewModel(SNAPSHOT, [], null, NOW);
    expect(vm.rows.map((r) => [r.sourceName, r.status])).toEqual([
      ['IRQ_S_067', null],
      ['KAZ_S_003', null],
    ]);
    expect(vm.mapTickets).toEqual([]);
    expect(vm.dots).toHaveLength(3);
    expect(vm.bubbles.map((b) => b.country)).toEqual(['Kazakhstan']);
    expect(vm.stats).toEqual({ alerts: 3, noResponsePct: 67, opened: 0, resolved: 0, slashed: 0, slashedWei: 0n });
  });

  it('joins on-chain tickets to records and summarises outcomes', () => {
    const tickets = [
      ticket('IRQ_S_067', { status: 3, operator: OPERATOR_A }),
      ticket('KAZ_S_003', { status: 4, operator: OPERATOR_B, slashedAmount: 1_000_000_000_000_000n }),
    ];
    const vm = buildViewModel(SNAPSHOT, tickets, 180, NOW);
    expect(vm.rows.map((r) => [r.sourceName, r.status])).toEqual([
      ['IRQ_S_067', 'resolved'],
      ['KAZ_S_003', 'slashed'],
    ]);
    expect(vm.mapTickets.map((t) => [t.sourceName, t.status, t.lat])).toEqual([
      ['IRQ_S_067', 'resolved', 31.43071],
      ['KAZ_S_003', 'slashed', 45.34143],
    ]);
    expect(vm.stats).toMatchObject({ opened: 2, resolved: 1, slashed: 1, slashedWei: 1_000_000_000_000_000n });
    expect(vm.dots.find((d) => d.sourceName === 'IRQ_S_067')?.responded).toBe(true);
  });
});
````

Create `test/dashboard-view.test.tsx` with exactly this content:

````tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardView, type DashboardViewProps } from '../src/components/DashboardView';
import { DEPLOYMENT, NOTICES, OPERATOR_A, OPERATOR_B, SNAPSHOT, ticket } from './helpers/viewFixtures';

afterEach(cleanup);

describe('DashboardView', () => {
  function props(overrides: Partial<DashboardViewProps> = {}): DashboardViewProps {
    return {
      snapshot: SNAPSHOT,
      notices: NOTICES,
      deployment: DEPLOYMENT,
      tickets: [
        ticket('IRQ_S_067', { status: 3, operator: OPERATOR_A }),
        ticket('KAZ_S_003', { status: 1, operator: OPERATOR_B }),
      ],
      responseWindowSeconds: 180,
      nowSeconds: 1_800_000_090,
      selected: 'KAZ_S_003',
      layers: { alerts: true, overlay: true },
      transitions: [],
      bondWei: 1_000_000_000_000_000n,
      verification: null,
      chainError: null,
      onSelect: () => {},
      onToggleLayer: () => {},
      onVerify: () => {},
      ...overrides,
    };
  }

  it('always shows the honesty banner and the attribution', () => {
    render(<DashboardView {...props()} />);
    expect(screen.getByRole('note').textContent).toContain('No real operator was contacted or identified.');
    expect(screen.getByRole('note').textContent).toContain('Base Sepolia testnet');
    expect(screen.getByText(/International Methane Emissions Observatory/)).toBeTruthy();
  });

  it('renders the selected ticket with its live clock and the operator label', () => {
    render(<DashboardView {...props()} />);
    expect(screen.getByRole('complementary', { name: 'Ticket KAZ_S_003' })).toBeTruthy();
    expect(screen.getAllByText('15d 00h 00m').length).toBeGreaterThan(0);
    expect(screen.getByText('Operator: Operator B (simulated)')).toBeTruthy();
  });

  it('falls back to snapshot-only mode without a deployment', () => {
    render(<DashboardView {...props({ deployment: null, tickets: [], responseWindowSeconds: null })} />);
    expect(screen.getByText('No deployment found: showing the committed snapshot only.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Verify record against on-chain root' })).toBeNull();
  });

  it('wires layer toggles', () => {
    const onToggleLayer = vi.fn();
    render(<DashboardView {...props({ onToggleLayer })} />);
    fireEvent.click(screen.getByLabelText('Country response rates'));
    expect(onToggleLayer).toHaveBeenCalledWith('overlay');
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/view.test.ts test/dashboard-view.test.tsx`
      Expected: FAIL — tsc: Cannot find module '../src/lib/view'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/view.ts` with exactly this content:

````ts
import type { MapBubble, MapDot, MapTicket } from '../components/WorldMap';
import type { TicketRow } from '../components/TicketList';
import { displayRemainingSeconds, formatClock } from './format';
import type { TicketView } from './readModel';
import { displayStatus, type DisplayStatus } from './status';
import type { DeploymentActors, SnapshotFile, SnapshotRecord } from './types';

export interface DashboardStats {
  alerts: number;
  noResponsePct: number;
  opened: number;
  resolved: number;
  slashed: number;
  slashedWei: bigint;
}

export interface ViewModel {
  rows: TicketRow[];
  mapTickets: MapTicket[];
  dots: MapDot[];
  bubbles: MapBubble[];
  stats: DashboardStats;
}

/** The most recently opened on-chain ticket per source. */
export function latestTicketBySource(tickets: readonly TicketView[]): Map<string, TicketView> {
  const out = new Map<string, TicketView>();
  for (const t of tickets) {
    const prev = out.get(t.sourceName);
    if (!prev || t.openedAt >= prev.openedAt) out.set(t.sourceName, t);
  }
  return out;
}

/** Display countdown for a running clock, or the frozen remainder of a disputed one. */
export function clockFor(
  ticket: TicketView,
  status: DisplayStatus,
  responseWindowSeconds: number | null,
  nowSeconds: number,
): string | null {
  if (responseWindowSeconds === null) return null;
  if (status === 'running' || status === 'overdue') {
    return formatClock(displayRemainingSeconds(ticket.deadline - nowSeconds, responseWindowSeconds));
  }
  if (status === 'disputed') {
    return `${formatClock(displayRemainingSeconds(ticket.pausedRemaining, responseWindowSeconds))} (paused)`;
  }
  return null;
}

export function operatorLabel(operator: string, actors: DeploymentActors | null): string | null {
  const op = operator.toLowerCase();
  if (op === '0x0000000000000000000000000000000000000000') return null;
  if (actors && op === actors.operatorA.toLowerCase()) return 'Operator A (simulated)';
  if (actors && op === actors.operatorB.toLowerCase()) return 'Operator B (simulated)';
  return `Self-pledged operator ${operator.slice(0, 6)}…${operator.slice(-4)}`;
}

function isNoResponse(r: SnapshotRecord): boolean {
  return r.feedbackLabel === 'Notified – no response received';
}

export function buildViewModel(
  snapshot: SnapshotFile,
  tickets: readonly TicketView[],
  responseWindowSeconds: number | null,
  nowSeconds: number,
): ViewModel {
  const byName = new Map(snapshot.records.map((r) => [r.sourceName, r]));
  const latest = latestTicketBySource(tickets);
  const rows: TicketRow[] = [];
  const mapTickets: MapTicket[] = [];
  for (const name of snapshot.ticketSet) {
    const rec = byName.get(name);
    if (!rec) continue;
    const ticket = latest.get(name);
    const status = ticket ? displayStatus(ticket, nowSeconds) : null;
    rows.push({
      sourceName: name,
      country: rec.country,
      sourceType: rec.sourceType,
      status,
      co2eTonnesPerYear: rec.co2eTonnesPerYear,
      score: rec.triage.score,
      priority: rec.triage.priority,
      clock: ticket && status ? clockFor(ticket, status, responseWindowSeconds, nowSeconds) : null,
    });
    if (ticket && status) {
      mapTickets.push({
        sourceName: name,
        lat: rec.latE5 / 1e5,
        lon: rec.lonE5 / 1e5,
        status,
        co2eTonnesPerYear: rec.co2eTonnesPerYear,
      });
    }
  }
  const dots: MapDot[] = snapshot.records.map((r) => ({
    sourceName: r.sourceName,
    lat: r.latE5 / 1e5,
    lon: r.lonE5 / 1e5,
    responded: !isNoResponse(r),
  }));
  const bubbles: MapBubble[] = snapshot.responseRates.flatMap((rr) =>
    rr.lat === null || rr.lon === null
      ? []
      : [
          {
            country: rr.country,
            lat: rr.lat,
            lon: rr.lon,
            ratePct: rr.ratePct,
            sourcesNotified: rr.sourcesNotified,
            sourcesWithFeedback: rr.sourcesWithFeedback,
          },
        ],
  );
  const noResponse = snapshot.records.filter(isNoResponse).length;
  return {
    rows,
    mapTickets,
    dots,
    bubbles,
    stats: {
      alerts: snapshot.records.length,
      noResponsePct: snapshot.records.length === 0 ? 0 : Math.round((noResponse / snapshot.records.length) * 100),
      opened: tickets.length,
      resolved: tickets.filter((t) => t.status === 3).length,
      slashed: tickets.filter((t) => t.status === 4).length,
      slashedWei: tickets.reduce((sum, t) => sum + t.slashedAmount, 0n),
    },
  };
}
````

Create `src/components/DashboardView.tsx` with exactly this content:

````tsx
import { formatEth, warpLabel } from '../lib/format';
import type { TicketView, TransitionEvent, Verification } from '../lib/readModel';
import { displayStatus } from '../lib/status';
import type { DeploymentFile, NoticesFile, SnapshotFile } from '../lib/types';
import { buildViewModel, clockFor, latestTicketBySource, operatorLabel } from '../lib/view';
import { TicketList } from './TicketList';
import { TicketPanel } from './TicketPanel';
import { WorldMap } from './WorldMap';

export interface Layers {
  alerts: boolean;
  overlay: boolean;
}

export interface DashboardViewProps {
  snapshot: SnapshotFile;
  notices: NoticesFile | null;
  deployment: DeploymentFile | null;
  tickets: TicketView[];
  responseWindowSeconds: number | null;
  nowSeconds: number;
  selected: string | null;
  layers: Layers;
  transitions: TransitionEvent[];
  bondWei: bigint | null;
  verification: Verification | null;
  chainError: string | null;
  onSelect: (sourceName: string) => void;
  onToggleLayer: (layer: keyof Layers) => void;
  onVerify: () => void;
}

export function DashboardView(props: DashboardViewProps) {
  const { snapshot, deployment, tickets, responseWindowSeconds, nowSeconds, selected } = props;
  const vm = buildViewModel(snapshot, tickets, responseWindowSeconds, nowSeconds);
  const record = selected ? snapshot.records.find((r) => r.sourceName === selected) ?? null : null;
  const ticket = record ? latestTicketBySource(tickets).get(record.sourceName) ?? null : null;
  const status = ticket ? displayStatus(ticket, nowSeconds) : null;
  const network = deployment?.network === 'anvil' ? 'local anvil' : 'Base Sepolia testnet';

  return (
    <div className="dashboard">
      <header>
        <h1>PlumeClock</h1>
        <p className="tagline">
          Every satellite-detected methane super-emitter gets an on-chain ticket with a public response clock.
        </p>
        <p className="banner" role="note">
          Real UNEP IMEO MARS detections (snapshot {snapshot.referenceDate}). Operators, bonds, attestations and
          re-observation replays are simulated on {network}. No real operator was contacted or identified.
        </p>
        <ul className="stats">
          <li>
            <strong>{vm.stats.alerts.toLocaleString('en-US')}</strong> notified super-emitters committed on-chain
          </li>
          <li>
            <strong>{vm.stats.noResponsePct}%</strong> with no response received (IMEO)
          </li>
          <li>
            <strong>{vm.stats.opened}</strong> tickets opened · <strong>{vm.stats.resolved}</strong> resolved ·{' '}
            <strong>{vm.stats.slashed}</strong> slashed ({formatEth(vm.stats.slashedWei)} to the mitigation fund)
          </li>
        </ul>
        {!deployment && <p className="warning">No deployment found: showing the committed snapshot only.</p>}
        {props.chainError && <p className="warning">Chain unreachable, retrying: {props.chainError}</p>}
      </header>

      <main>
        <section className="map-section">
          <div className="layer-toggles">
            <label>
              <input type="checkbox" checked={props.layers.alerts} onChange={() => props.onToggleLayer('alerts')} />{' '}
              IMEO alerts
            </label>
            <label>
              <input type="checkbox" checked={props.layers.overlay} onChange={() => props.onToggleLayer('overlay')} />{' '}
              Country response rates
            </label>
            {responseWindowSeconds !== null && <span className="muted">{warpLabel(responseWindowSeconds)}</span>}
          </div>
          <WorldMap
            dots={vm.dots}
            tickets={vm.mapTickets}
            bubbles={vm.bubbles}
            showAlerts={props.layers.alerts}
            showOverlay={props.layers.overlay}
            selected={selected}
            onSelect={props.onSelect}
          />
          <TicketList rows={vm.rows} selected={selected} onSelect={props.onSelect} />
        </section>
        {record ? (
          <TicketPanel
            record={record}
            status={status}
            clock={ticket && status ? clockFor(ticket, status, responseWindowSeconds, nowSeconds) : null}
            warp={responseWindowSeconds !== null ? warpLabel(responseWindowSeconds) : null}
            operatorLabel={ticket ? operatorLabel(ticket.operator, deployment?.actors ?? null) : null}
            bondWei={props.bondWei}
            slashedWei={ticket ? ticket.slashedAmount : null}
            transitions={props.transitions}
            explorerUrl={deployment?.explorerUrl ?? ''}
            history={snapshot.histories[record.sourceName] ?? []}
            notice={props.notices?.notices[record.sourceName] ?? null}
            verification={props.verification}
            onVerify={deployment && snapshot.proofs[record.sourceName] ? props.onVerify : null}
          />
        ) : (
          <aside className="ticket-panel empty">Select a ticket on the map or in the list.</aside>
        )}
      </main>

      <footer>
        <p>{snapshot.provenance.attribution}</p>
        <p className="mono">Snapshot root {snapshot.root}</p>
      </footer>
    </div>
  );
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/view.test.ts test/dashboard-view.test.tsx`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  2 passed (2)` and `Tests  9 passed (9)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(web): view model and dashboard view`

### Task 3.7: Live dashboard: data loading, polling, and the page

**Files:**
- Create: `src/components/Dashboard.tsx`
- Modify: `src/app/page.tsx`
- Test:   `test/dashboard.test.tsx`

**Depends on:** Task 3.1, Task 3.6
**Effort:** medium
**Model tier:** standard
**Provides:** `src/components/Dashboard.tsx: Dashboard(), resolveNetwork(search); src/app/page.tsx renders <Dashboard />`
**Requires:** `src/lib/view.ts: buildViewModel(snapshot, tickets, responseWindowSeconds, nowSeconds): ViewModel, latestTicketBySource, clockFor, operatorLabel; src/components/DashboardView.tsx: DashboardView(props), Layers`, `src/lib/readModel.ts: TicketView, RawTicket, ReadClient, toTicketView, makeReadClient(chain, rpcUrl), fetchTickets(client, address), fetchBondAmount, fetchResponseWindow, fetchRootKind, fetchTransitions(client, address, ticketId): TransitionEvent[], verifyRecord(record, proof, root, rootKindOnChain): Verification, recomputeRoot`, `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`, `src/app/layout.tsx (imports ./globals.css), src/app/globals.css (status-* colour classes), src/app/page.tsx placeholder`

The stateful client component: loads `/data/snapshot.json`, `/data/notices.json` and `/deployments/<network>.json` (network from `?network=anvil|base-sepolia`, else `NEXT_PUBLIC_NETWORK`, default `base-sepolia`), polls `getTickets` every 4 s, fetches transitions and bond for the selected ticket, runs record verification on demand, and starts with operator B selected. `page.tsx` now renders it. The gate also proves the static export builds.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/view.ts: buildViewModel(snapshot, tickets, responseWindowSeconds, nowSeconds): ViewModel, latestTicketBySource, clockFor, operatorLabel; src/components/DashboardView.tsx: DashboardView(props), Layers`
- `src/lib/readModel.ts: TicketView, RawTicket, ReadClient, toTicketView, makeReadClient(chain, rpcUrl), fetchTickets(client, address), fetchBondAmount, fetchResponseWindow, fetchRootKind, fetchTransitions(client, address, ticketId): TransitionEvent[], verifyRecord(record, proof, root, rootKindOnChain): Verification, recomputeRoot`
- `src/lib/chain.ts: networkConfig(name): NetworkConfig, txUrl(explorerUrl, hash), addressUrl; src/lib/format.ts: displayRemainingSeconds, formatClock, warpLabel, formatTonnes, formatRate, formatDate, shortAddress, decodeSourceId, formatEth; src/lib/status.ts: DisplayStatus, STATUS_LABELS, displayStatus(t, nowSeconds)`
- `src/app/layout.tsx (imports ./globals.css), src/app/globals.css (status-* colour classes), src/app/page.tsx placeholder`

- [ ] **Step 1: Write the failing test**

Create `test/dashboard.test.tsx` with exactly this content:

````tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard, resolveNetwork } from '../src/components/Dashboard';
import { NOTICES, SNAPSHOT } from './helpers/viewFixtures';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(files: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const hit = Object.keys(files).find((suffix) => input.endsWith(suffix));
      return hit ? new Response(JSON.stringify(files[hit])) : new Response('missing', { status: 404 });
    }),
  );
}

describe('Dashboard data loading', () => {
  it('shows the committed snapshot when no deployment file exists, selecting operator B first', async () => {
    stubFetch({ '/data/snapshot.json': SNAPSHOT, '/data/notices.json': NOTICES });
    render(<Dashboard />);
    expect(await screen.findByText('No deployment found: showing the committed snapshot only.')).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Ticket KAZ_S_003' })).toBeTruthy();
    expect(screen.getByTestId('notice').textContent).toBe('KAZ_S_003 notice text.');
  });

  it('lets ?network= pick anvil or base-sepolia and ignores anything else', () => {
    expect(resolveNetwork('?network=anvil')).toBe('anvil');
    expect(resolveNetwork('?network=base-sepolia')).toBe('base-sepolia');
    expect(resolveNetwork('?network=mainnet')).toBe('base-sepolia');
    expect(resolveNetwork('')).toBe('base-sepolia');
  });

  it('reports a missing snapshot instead of crashing', async () => {
    stubFetch({});
    render(<Dashboard />);
    expect(await screen.findByText('Could not load PlumeClock data: public/data/snapshot.json is missing')).toBeTruthy();
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/dashboard.test.tsx`
      Expected: FAIL — tsc: Cannot find module '../src/components/Dashboard'

- [ ] **Step 3: Minimal implementation**

Create `src/components/Dashboard.tsx` with exactly this content:

````tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { networkConfig } from '../lib/chain';
import {
  fetchBondAmount,
  fetchResponseWindow,
  fetchRootKind,
  fetchTickets,
  fetchTransitions,
  makeReadClient,
  verifyRecord,
  type TicketView,
  type TransitionEvent,
  type Verification,
} from '../lib/readModel';
import type { DeploymentFile, NoticesFile, SnapshotFile } from '../lib/types';
import { latestTicketBySource } from '../lib/view';
import { DashboardView, type Layers } from './DashboardView';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'base-sepolia';
const POLL_MS = 4000;

async function loadJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE_PATH}${path}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** `?network=anvil` (or base-sepolia) overrides the build-time NEXT_PUBLIC_NETWORK. */
export function resolveNetwork(search: string): string {
  const fromQuery = new URLSearchParams(search).get('network');
  return fromQuery === 'anvil' || fromQuery === 'base-sepolia' ? fromQuery : NETWORK;
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<SnapshotFile | null>(null);
  const [notices, setNotices] = useState<NoticesFile | null>(null);
  const [deployment, setDeployment] = useState<DeploymentFile | null>(null);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [responseWindow, setResponseWindow] = useState<number | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [selected, setSelected] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>({ alerts: true, overlay: true });
  const [transitions, setTransitions] = useState<TransitionEvent[]>([]);
  const [bondWei, setBondWei] = useState<bigint | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadJson<SnapshotFile>('/data/snapshot.json'),
      loadJson<NoticesFile>('/data/notices.json'),
      loadJson<DeploymentFile>(`/deployments/${resolveNetwork(window.location.search)}.json`),
    ])
      .then(([s, n, d]) => {
        if (!s) throw new Error('public/data/snapshot.json is missing');
        setSnapshot(s);
        setNotices(n);
        setDeployment(d);
        setSelected(s.scenario.operatorB);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const client = useMemo(() => {
    if (!deployment) return null;
    const rpc = process.env.NEXT_PUBLIC_RPC_URL || deployment.rpcUrl;
    return makeReadClient(networkConfig(deployment.network).chain, rpc);
  }, [deployment]);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!client || !deployment) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const [list, window] = await Promise.all([
          fetchTickets(client, deployment.plumeClock),
          fetchResponseWindow(client, deployment.plumeClock),
        ]);
        if (cancelled) return;
        setTickets(list);
        setResponseWindow(window);
        setChainError(null);
      } catch (e) {
        if (!cancelled) setChainError(e instanceof Error ? e.message.split('\n')[0] : String(e));
      }
    };
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, deployment]);

  const selectedTicket = selected ? latestTicketBySource(tickets).get(selected) ?? null : null;
  const ticketKey = selectedTicket ? `${selectedTicket.id}:${selectedTicket.status}:${selectedTicket.deadline}` : '';

  useEffect(() => {
    setVerification(null);
    if (!client || !deployment || !selectedTicket) {
      setTransitions([]);
      setBondWei(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchTransitions(client, deployment.plumeClock, selectedTicket.id),
      fetchBondAmount(client, deployment.plumeClock, selectedTicket.sourceId),
    ])
      .then(([events, bond]) => {
        if (cancelled) return;
        setTransitions(events);
        setBondWei(selectedTicket.operator === '0x0000000000000000000000000000000000000000' ? null : bond);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // ticketKey captures every field of selectedTicket that the effect reads
  }, [client, deployment, ticketKey]);

  const onVerify = useCallback(() => {
    if (!snapshot || !selected || !client || !deployment) return;
    const record = snapshot.records.find((r) => r.sourceName === selected);
    const proof = snapshot.proofs[selected];
    if (!record || !proof) return;
    void verifyRecord(record, proof, snapshot.root, () =>
      fetchRootKind(client, deployment.plumeClock, snapshot.root),
    ).then(setVerification);
  }, [snapshot, selected, client, deployment]);

  if (loadError) return <p className="warning">Could not load PlumeClock data: {loadError}</p>;
  if (!snapshot) return <p className="muted">Loading PlumeClock…</p>;

  return (
    <DashboardView
      snapshot={snapshot}
      notices={notices}
      deployment={deployment}
      tickets={tickets}
      responseWindowSeconds={responseWindow}
      nowSeconds={now}
      selected={selected}
      layers={layers}
      transitions={transitions}
      bondWei={bondWei}
      verification={verification}
      chainError={chainError}
      onSelect={(name) => setSelected(name)}
      onToggleLayer={(layer) => setLayers((l) => ({ ...l, [layer]: !l[layer] }))}
      onVerify={onVerify}
    />
  );
}
````

Replace the whole of `src/app/page.tsx` with exactly this content:

````tsx
import { Dashboard } from '../components/Dashboard';

export default function Page() {
  return <Dashboard />;
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run verify:web`
      Expected: PASS — vitest `Tests  3 passed (3)`, then next build ends with `○  (Static)  prerendered as static content`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(web): live dashboard page`

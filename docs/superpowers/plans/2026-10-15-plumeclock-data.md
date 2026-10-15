# PlumeClock Data Implementation Plan

**Goal:** Pin UNEP IMEO's public methane data with provenance, turn it into Solidity-compatible Merkle-committed records with locked selection rules and triage, and generate the committed snapshot and AI-notice fixtures.
**Architecture:** Pure TypeScript libraries in src/lib (types, co2e, feedback, merkle, imeo, records, triage, pin, fixtures, notices) with thin CLI scripts in scripts/. Downloads happen only in the pin task; every other step is deterministic from the committed zips. Leaf encoding is pinned by vectors shared with the Foundry tests.
**Tech Stack:** TypeScript 5.9.3 (strict, ESM), Node 22, viem 2.56.9 (ABI encoding), csv-parse 5.6.0, fflate 0.8.3, @anthropic-ai/sdk 0.130.0 (model claude-opus-5-5), vitest 3.2.7, tsx 4.23.15
**Source spec:** docs/superpowers/specs/2026-10-15-plumeclock-design.md

---

## How to read these tasks

- Run every command from the repository root. Commands work in Windows PowerShell and Git Bash; the README gate (Task 4.10 in the demo plan) is PowerShell-only.
- A code block introduced by "Create ... with exactly this content" is the complete file. Write it byte-for-byte; do not reformat or "improve" it. These files were compiled and tested together before this plan was written.
- Write every file as UTF-8 without a byte-order mark. Use your file-writing tool, not PowerShell 5.1's `Set-Content` or `Out-File`, which add a BOM (`JSON.parse` on a file read with `readFileSync` fails on it).
- `npm run check -- <files>` runs `tsc --noEmit` over the whole project, then vitest on the named files. Both must pass.
- Never run git. The orchestrator commits exactly the files listed under **Files:**.
- Tasks marked HUMAN-GATED are never executed by an executor: the orchestrator pauses them for the user or the gate-concierge.

### Task 2.1: Domain types, CO2e and IMEO feedback labels

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/co2e.ts`
- Create: `src/lib/feedback.ts`
- Test:   `test/domain.test.ts`

**Depends on:** Task 1.1
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`, `src/lib/co2e.ts: co2eTonnesPerYear(rateKgPerHour: number): number, GWP100 = 29.8, GWP100_X10 = 298n, HOURS_PER_YEAR = 8760n; src/lib/feedback.ts: feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel, IMEO_RESPONSE_CAVEAT`
**Requires:** `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

Shared TypeScript types for every subsystem (records, fixture files, deployment files) plus two pure helpers. `co2eTonnesPerYear` mirrors Solidity `PlumeBase.co2eTonnesPerYear` exactly (integer floor of rate x 8760 x 298 / 10000, BigInt so it stays exact). `feedbackLabel` maps IMEO's feedback columns to the IMEO FAQ wording; the en dash in `Notified – no response received` is U+2013.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

- [ ] **Step 1: Write the failing test**

Create `test/domain.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import { co2eTonnesPerYear } from '../src/lib/co2e';
import { feedbackLabel, IMEO_RESPONSE_CAVEAT } from '../src/lib/feedback';

describe('co2eTonnesPerYear', () => {
  it('matches the Solidity integer formula (kg/h x 8760 h x 29.8 / 1000, floored)', () => {
    expect(co2eTonnesPerYear(7847)).toBe(2_048_443);
    expect(co2eTonnesPerYear(123_491)).toBe(32_237_078);
    expect(co2eTonnesPerYear(0)).toBe(0);
  });

  it('stays exact at the uint32 maximum', () => {
    expect(co2eTonnesPerYear(0xffffffff)).toBe(Number((4294967295n * 8760n * 298n) / 10000n));
  });

  it('rejects values that are not uint32', () => {
    expect(() => co2eTonnesPerYear(-1)).toThrow('uint32');
    expect(() => co2eTonnesPerYear(1.5)).toThrow('uint32');
  });
});

describe('feedbackLabel', () => {
  it('uses the IMEO FAQ wording', () => {
    expect(feedbackLabel('Yes', 'Yes')).toBe('Government and operator responded');
    expect(feedbackLabel('Yes', 'No')).toBe('Operator responded');
    expect(feedbackLabel('No', 'Yes')).toBe('Government responded');
    expect(feedbackLabel('No', 'No')).toBe('Notified – no response received');
    expect(feedbackLabel('Not Applicable', 'Not Applicable')).toBe('Notified – no response received');
  });

  it('keeps the IMEO caveat verbatim', () => {
    expect(IMEO_RESPONSE_CAVEAT).toBe('Low response rates may not necessarily signal indifference.');
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/domain.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/co2e'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/types.ts` with exactly this content:

````ts
import type { Hex } from 'viem';

/** Mirrors Solidity `SourceRecord` (contracts/src/PlumeTypes.sol) field-for-field, same order. */
export interface SourceRecord {
  /** bytes32: IMEO source_name as ASCII, right-padded with zero bytes. */
  sourceId: Hex;
  lastPlumeId: string;
  /** uint64 unix seconds (UTC). */
  lastPlumeAt: number;
  /** uint32 kg/h. */
  rateKgPerHour: number;
  /** uint32. */
  plumeCount: number;
  /** int32, latitude * 1e5. */
  latE5: number;
  /** int32, longitude * 1e5. */
  lonE5: number;
  country: string;
  sector: string;
  sourceType: string;
  persistency: string;
  notified: string;
  feedbackOperator: string;
  feedbackGovernment: string;
}

/** Mirrors Solidity `Reobservation`. */
export interface Reobservation {
  sourceId: Hex;
  /** uint64 unix seconds. */
  observedAt: number;
  plumeDetected: boolean;
  basis: string;
}

/** IMEO FAQ wording for a notified source's feedback state ("–" is U+2013). */
export type FeedbackLabel =
  | 'Government and operator responded'
  | 'Operator responded'
  | 'Government responded'
  | 'Notified – no response received';

export type Priority = 'high' | 'medium' | 'low';

export interface Triage {
  score: number;
  priority: Priority;
  impact: number;
  persistenceWeight: number;
  responseFactor: number;
}

/** One record as stored in public/data/snapshot.json. */
export interface SnapshotRecord extends SourceRecord {
  sourceName: string;
  leaf: Hex;
  co2eTonnesPerYear: number;
  feedbackLabel: FeedbackLabel;
  triage: Triage;
}

export interface PlumeHistoryEntry {
  plumeId: string;
  observedAt: number;
  rateKgPerHour: number | null;
  satellite: string;
}

export interface ResponseRate {
  country: string;
  from: string;
  until: string;
  sourcesNotified: number;
  sourcesWithFeedback: number;
  ratePct: number;
  /** Mean location of the country's universe sources (overlay bubble); null when none. */
  lat: number | null;
  lon: number | null;
}

export interface ProvenanceFile {
  name: string;
  url: string;
  lastModified: string;
  bytes: number;
  sha256: string;
}

export interface Provenance {
  schema: 'plumeclock.provenance.v1';
  fetchedAt: string;
  license: string;
  attribution: string;
  files: ProvenanceFile[];
}

export interface SnapshotFile {
  schema: 'plumeclock.snapshot.v1';
  generatedAt: string;
  provenance: Provenance;
  referenceDate: string;
  root: Hex;
  universeCount: number;
  records: SnapshotRecord[];
  ticketSet: string[];
  proofs: Record<string, Hex[]>;
  scenario: { operatorA: string; operatorB: string };
  histories: Record<string, PlumeHistoryEntry[]>;
  responseRates: ResponseRate[];
}

export interface Notice {
  text: string;
  generator: string;
}

export interface NoticesFile {
  schema: 'plumeclock.notices.v1';
  generatedAt: string;
  generator: string;
  notices: Record<string, Notice>;
}

export type NetworkName = 'anvil' | 'base-sepolia';

export interface DeploymentActors {
  deployer: Hex;
  feeder: Hex;
  arbiter: Hex;
  operatorA: Hex;
  operatorB: Hex;
}

/** public/deployments/<network>.json */
export interface DeploymentFile {
  schema: 'plumeclock.deployment.v1';
  network: NetworkName;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  plumeClock: Hex;
  mitigationFund: Hex;
  deployBlock: number;
  responseWindowSeconds: number;
  minBondWei: string;
  actors: DeploymentActors;
  deployedAt: string;
}
````

Create `src/lib/co2e.ts` with exactly this content:

````ts
/** IPCC AR6 GWP100 for fossil CH4 is 29.8, stored x10 (same constant as PlumeBase.GWP100_X10). */
export const GWP100_X10 = 298n;
export const HOURS_PER_YEAR = 8760n;
export const GWP100 = 29.8;

/**
 * t CO2e per year if the plume persisted at `rateKgPerHour` for a full year.
 * Identical integer math to Solidity `PlumeBase.co2eTonnesPerYear` (floor division).
 */
export function co2eTonnesPerYear(rateKgPerHour: number): number {
  if (!Number.isInteger(rateKgPerHour) || rateKgPerHour < 0 || rateKgPerHour > 0xffffffff) {
    throw new Error(`rateKgPerHour must be a uint32, got ${rateKgPerHour}`);
  }
  return Number((BigInt(rateKgPerHour) * HOURS_PER_YEAR * GWP100_X10) / 10_000n);
}
````

Create `src/lib/feedback.ts` with exactly this content:

````ts
import type { FeedbackLabel } from './types';

/** IMEO's own caveat on response rates (methanedata.unep.org, MARS snapshot story). */
export const IMEO_RESPONSE_CAVEAT = 'Low response rates may not necessarily signal indifference.';

/** IMEO FAQ wording for a notified source, derived from the sources CSV feedback columns. */
export function feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel {
  const operator = feedbackOperator === 'Yes';
  const government = feedbackGovernment === 'Yes';
  if (operator && government) return 'Government and operator responded';
  if (operator) return 'Operator responded';
  if (government) return 'Government responded';
  return 'Notified – no response received';
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/domain.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  5 passed (5)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): domain types, CO2e and IMEO feedback labels`

### Task 2.2: Merkle leaves and tree compatible with Solidity

**Files:**
- Create: `src/lib/merkle.ts`
- Test:   `test/merkle.test.ts`

**Depends on:** Task 2.1
**Effort:** high
**Model tier:** top
**Provides:** `src/lib/merkle.ts: sourceIdFromName(name): Hex; hashSourceRecord(rec: SourceRecord): Hex; hashReobservation(obs: Reobservation): Hex; toAbiSourceRecord(rec); toAbiReobservation(obs); buildTree(leaves): MerkleTree; getProof(tree, leaf): Hex[]; verifyProof(leaf, proof, root): boolean`
**Requires:** `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

The TypeScript half of the cross-language commitment. A `SourceRecord` leaf is `keccak256(keccak256(encodeAbiParameters([tuple], [record])))`, byte-identical to Solidity `keccak256(bytes.concat(keccak256(abi.encode(rec))))`. The tree sorts leaves ascending, hashes sorted pairs (OpenZeppelin `Hashes.commutativeKeccak256`) and carries an odd node up, so proofs verify with OpenZeppelin `MerkleProof`. The test pins the same vectors as contracts/test/utils/Fixtures.sol (VECTOR_LEAF_1 = 0x03921c0a..., VECTOR_LEAF_2 = 0x50fdc75c..., VECTOR_OBS_LEAF = 0x9e1589fa..., VECTOR_ROOT_2 = 0x581f67a5...).

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

- [ ] **Step 1: Write the failing test**

Create `test/merkle.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import { keccak256, toHex, type Hex } from 'viem';
import {
  buildTree,
  getProof,
  hashPair,
  hashReobservation,
  hashSourceRecord,
  sourceIdFromName,
  verifyProof,
} from '../src/lib/merkle';
import type { SourceRecord } from '../src/lib/types';

/** Same records as contracts/test/utils/Fixtures.sol; the hashes are pinned on both sides. */
const VECTOR_1: SourceRecord = {
  sourceId: sourceIdFromName('KAZ_S_003'),
  lastPlumeId: 'vector-plume-0001',
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
};
const VECTOR_2: SourceRecord = {
  sourceId: sourceIdFromName('TUR_S_001'),
  lastPlumeId: 'vector-plume-0002',
  lastPlumeAt: 1764547200,
  rateKgPerHour: 1234,
  plumeCount: 2,
  latE5: -3612345,
  lonE5: -6479417,
  country: 'Türkiye',
  sector: 'Oil and Gas',
  sourceType: 'O&G facility (generic)',
  persistency: 'absent',
  notified: 'Yes',
  feedbackOperator: 'Yes',
  feedbackGovernment: 'No',
};
const VECTOR_LEAF_1 = '0x03921c0a78d6b85dd4afdaa1a5b4ff9676991b7e5af8774a5cebca375f6d094a';
const VECTOR_LEAF_2 = '0x50fdc75c9872748f4f6ee30bd066ebd6a409b3429851eac4445aa05f28b6e5fd';
const VECTOR_OBS_LEAF = '0x9e1589fa9a7eace672605a7d660c811852cc42a340a900be64706f57f44b71e3';
const VECTOR_ROOT_2 = '0x581f67a5b8e3a132a67656b87d49e7116dab748d0f308c4a8bf916946162f8a7';

describe('cross-language vectors (must equal contracts/test/utils/Fixtures.sol)', () => {
  it('hashes SourceRecord like Solidity abi.encode(struct) with double keccak', () => {
    expect(hashSourceRecord(VECTOR_1)).toBe(VECTOR_LEAF_1);
    expect(hashSourceRecord(VECTOR_2)).toBe(VECTOR_LEAF_2);
  });

  it('hashes Reobservation like Solidity', () => {
    expect(
      hashReobservation({
        sourceId: sourceIdFromName('KAZ_S_003'),
        observedAt: 1790000000,
        plumeDetected: false,
        basis: 'vector re-observation',
      }),
    ).toBe(VECTOR_OBS_LEAF);
  });

  it('builds the same two-leaf root', () => {
    const tree = buildTree([VECTOR_LEAF_1, VECTOR_LEAF_2]);
    expect(tree.root).toBe(VECTOR_ROOT_2);
    expect(getProof(tree, VECTOR_LEAF_1)).toEqual([VECTOR_LEAF_2]);
  });
});

describe('sourceIdFromName', () => {
  it('right-pads ASCII to bytes32', () => {
    expect(sourceIdFromName('KAZ_S_003')).toBe('0x4b415a5f535f3030330000000000000000000000000000000000000000000000');
  });

  it('rejects names that do not fit', () => {
    expect(() => sourceIdFromName('')).toThrow('Invalid source name');
    expect(() => sourceIdFromName('x'.repeat(33))).toThrow('Invalid source name');
  });
});

describe('buildTree / getProof / verifyProof', () => {
  const leaves = Array.from({ length: 7 }, (_, i) => keccak256(toHex(`leaf-${i}`)));

  it('proves every leaf of an odd-sized tree', () => {
    const tree = buildTree(leaves);
    for (const leaf of leaves) {
      expect(verifyProof(leaf, getProof(tree, leaf), tree.root)).toBe(true);
    }
  });

  it('is independent of input order', () => {
    expect(buildTree([...leaves].reverse()).root).toBe(buildTree(leaves).root);
  });

  it('uses the leaf itself as the root of a one-leaf tree', () => {
    const tree = buildTree([leaves[0]]);
    expect(tree.root).toBe(leaves[0]);
    expect(getProof(tree, leaves[0])).toEqual([]);
  });

  it('rejects a wrong proof and unknown leaves', () => {
    const tree = buildTree(leaves);
    expect(verifyProof(leaves[0], getProof(tree, leaves[1]), tree.root)).toBe(false);
    expect(() => getProof(tree, keccak256(toHex('missing')))).toThrow('Leaf not in tree');
    expect(() => buildTree([])).toThrow('at least one leaf');
  });

  it('hashes pairs commutatively', () => {
    const [a, b] = leaves as [Hex, Hex];
    expect(hashPair(a, b)).toBe(hashPair(b, a));
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/merkle.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/merkle'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/merkle.ts` with exactly this content:

````ts
import { concat, encodeAbiParameters, keccak256, stringToHex, type Hex } from 'viem';
import type { Reobservation, SourceRecord } from './types';

/** ABI tuple of Solidity `SourceRecord`; order and types must match contracts/src/PlumeTypes.sol. */
export const sourceRecordAbiParameter = {
  type: 'tuple',
  components: [
    { name: 'sourceId', type: 'bytes32' },
    { name: 'lastPlumeId', type: 'string' },
    { name: 'lastPlumeAt', type: 'uint64' },
    { name: 'rateKgPerHour', type: 'uint32' },
    { name: 'plumeCount', type: 'uint32' },
    { name: 'latE5', type: 'int32' },
    { name: 'lonE5', type: 'int32' },
    { name: 'country', type: 'string' },
    { name: 'sector', type: 'string' },
    { name: 'sourceType', type: 'string' },
    { name: 'persistency', type: 'string' },
    { name: 'notified', type: 'string' },
    { name: 'feedbackOperator', type: 'string' },
    { name: 'feedbackGovernment', type: 'string' },
  ],
} as const;

/** ABI tuple of Solidity `Reobservation`. */
export const reobservationAbiParameter = {
  type: 'tuple',
  components: [
    { name: 'sourceId', type: 'bytes32' },
    { name: 'observedAt', type: 'uint64' },
    { name: 'plumeDetected', type: 'bool' },
    { name: 'basis', type: 'string' },
  ],
} as const;

/** IMEO source_name -> bytes32 (ASCII, right-padded). Throws on non-ASCII or > 32 bytes. */
export function sourceIdFromName(sourceName: string): Hex {
  if (!/^[\x20-\x7e]{1,32}$/.test(sourceName)) throw new Error(`Invalid source name: ${sourceName}`);
  return stringToHex(sourceName, { size: 32 });
}

/** Viem-ready struct value (uint64 as bigint, extra JSON keys dropped). */
export function toAbiSourceRecord(rec: SourceRecord) {
  return {
    sourceId: rec.sourceId,
    lastPlumeId: rec.lastPlumeId,
    lastPlumeAt: BigInt(rec.lastPlumeAt),
    rateKgPerHour: rec.rateKgPerHour,
    plumeCount: rec.plumeCount,
    latE5: rec.latE5,
    lonE5: rec.lonE5,
    country: rec.country,
    sector: rec.sector,
    sourceType: rec.sourceType,
    persistency: rec.persistency,
    notified: rec.notified,
    feedbackOperator: rec.feedbackOperator,
    feedbackGovernment: rec.feedbackGovernment,
  };
}

export function toAbiReobservation(obs: Reobservation) {
  return {
    sourceId: obs.sourceId,
    observedAt: BigInt(obs.observedAt),
    plumeDetected: obs.plumeDetected,
    basis: obs.basis,
  };
}

/** Same as Solidity PlumeBase.hashSourceRecord: keccak256(bytes.concat(keccak256(abi.encode(rec)))). */
export function hashSourceRecord(rec: SourceRecord): Hex {
  return keccak256(keccak256(encodeAbiParameters([sourceRecordAbiParameter], [toAbiSourceRecord(rec)])));
}

/** Same as Solidity PlumeBase.hashReobservation. */
export function hashReobservation(obs: Reobservation): Hex {
  return keccak256(keccak256(encodeAbiParameters([reobservationAbiParameter], [toAbiReobservation(obs)])));
}

/** OpenZeppelin Hashes.commutativeKeccak256: hash of the sorted pair. */
export function hashPair(a: Hex, b: Hex): Hex {
  return BigInt(a) < BigInt(b) ? keccak256(concat([a, b])) : keccak256(concat([b, a]));
}

export interface MerkleTree {
  root: Hex;
  /** layers[0] = leaves sorted ascending; last layer = [root]. */
  layers: Hex[][];
}

function compareHex(a: Hex, b: Hex): number {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Sorted leaves, sorted-pair hashing, odd node carried up unchanged (OZ MerkleProof compatible). */
export function buildTree(leaves: readonly Hex[]): MerkleTree {
  if (leaves.length === 0) throw new Error('Merkle tree needs at least one leaf');
  const layers: Hex[][] = [[...leaves].map((l) => l.toLowerCase() as Hex).sort(compareHex)];
  while (layers[layers.length - 1].length > 1) {
    const level = layers[layers.length - 1];
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

export function getProof(tree: MerkleTree, leaf: Hex): Hex[] {
  let index = tree.layers[0].indexOf(leaf.toLowerCase() as Hex);
  if (index < 0) throw new Error(`Leaf not in tree: ${leaf}`);
  const proof: Hex[] = [];
  for (let depth = 0; depth < tree.layers.length - 1; depth++) {
    const level = tree.layers[depth];
    const sibling = index ^ 1;
    if (sibling < level.length) proof.push(level[sibling]);
    index = index >> 1;
  }
  return proof;
}

export function verifyProof(leaf: Hex, proof: readonly Hex[], root: Hex): boolean {
  let computed = leaf.toLowerCase() as Hex;
  for (const p of proof) computed = hashPair(computed, p);
  return computed === root.toLowerCase();
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/merkle.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  10 passed (10)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): Solidity-compatible Merkle leaves and tree`

### Task 2.3: Parse IMEO zips and CSVs with schema guards

**Files:**
- Create: `src/lib/imeo.ts`
- Create: `test/helpers/imeoFixtures.ts`
- Test:   `test/imeo.test.ts`

**Depends on:** Task 1.1
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/imeo.ts: parsePlumesZip(zip: Uint8Array): { sources: SourceRow[]; plumes: PlumeRow[] }; parseResponseRateZip(zip: Uint8Array): { csvPath: string; rows: ResponseRateRow[] }; PLUMES_ZIP_URL, RESPONSE_RATE_ZIP_URL, PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME, SOURCE_COLUMNS`, `test/helpers/imeoFixtures.ts: source(overrides), plumesZip(sources, plumes), responseRateZip(csv?), scenarioExport(), sourcesCsv(rows), plumesCsv(specs)`
**Requires:** `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

Reads IMEO's two public zips with fflate + csv-parse. Column names were verified against the real 2026-10-15 files: the sources CSV has exactly the 16 `SOURCE_COLUMNS` (the published data dictionary's `emission_status` column is NOT in the file and must not be used); from the plumes CSV only `id_plume, source_name, satellite, tile_date, ch4_fluxrate` are read; the response-rate zip's current table is the single CSV under `<root>/LATEST/`. Missing columns throw an error naming them. `test/helpers/imeoFixtures.ts` builds small synthetic zips in the real formats for this and later tests.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `toolchain: package.json scripts (check, test:smoke, test:abi, test:e2e, verify:web, abi, pin, check:snapshot, fixtures, notices, deploy, verify:contracts, check:deployment, demo, check:demo) + foundry.toml (solc 0.8.28, src contracts/src, test contracts/test, out contracts/out)`

- [ ] **Step 1: Write the failing test**

Create `test/helpers/imeoFixtures.ts` with exactly this content:

````ts
import { strToU8, zipSync } from 'fflate';
import { SOURCE_COLUMNS, type SourceRow } from '../../src/lib/imeo';

/** Plumes CSV header as IMEO ships it (23 columns, verified 2026-10-15). */
export const PLUMES_HEADER = [
  'id_plume',
  'source_name',
  'satellite',
  'tile_date',
  'lat',
  'lon',
  'actionable',
  'notified',
  'country',
  'sector',
  'detection_institution',
  'quantification_institution',
  'tile',
  'ch4_fluxrate',
  'ch4_fluxrate_std',
  'wind_u',
  'wind_v',
  'total_emission',
  'total_emission_std',
  'wind_speed',
  'last_update',
  'insert_date',
  'tile_background',
];

export function source(overrides: Partial<SourceRow> & { source_name: string; id_last_plume: string }): SourceRow {
  return {
    lon: '55.19165',
    lat: '45.34143',
    country: 'Kazakhstan',
    sector: 'Oil and Gas',
    source_type: 'Flare',
    persistency: '0.9',
    persistency_std: '0.05',
    persistency_category: 'persistent',
    n_plumes_detected: '5',
    last_plume_date: '2026-05-31T08:49:09',
    notified: 'Yes',
    feedback: 'No',
    feedback_operator: 'No',
    feedback_government: 'No',
    ...overrides,
  };
}

export interface PlumeSpec {
  id: string;
  source: string;
  date: string;
  rate: string;
  satellite?: string;
}

function csvLine(values: readonly string[]): string {
  return values.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',');
}

export function sourcesCsv(rows: readonly SourceRow[]): string {
  return [csvLine(SOURCE_COLUMNS), ...rows.map((r) => csvLine(SOURCE_COLUMNS.map((c) => r[c])))].join('\n') + '\n';
}

export function plumesCsv(specs: readonly PlumeSpec[]): string {
  const lines = specs.map((p) =>
    csvLine(
      PLUMES_HEADER.map((h) => {
        if (h === 'id_plume') return p.id;
        if (h === 'source_name') return p.source;
        if (h === 'satellite') return p.satellite ?? 'Sentinel-2 - ESA';
        if (h === 'tile_date') return p.date;
        if (h === 'ch4_fluxrate') return p.rate;
        return '';
      }),
    ),
  );
  return [csvLine(PLUMES_HEADER), ...lines].join('\n') + '\n';
}

export function plumesZip(sources: readonly SourceRow[], plumes: readonly PlumeSpec[]): Uint8Array {
  return zipSync({
    'unep_methanedata_detected_plumes.csv': strToU8(plumesCsv(plumes)),
    'unep_methanedata_detected_sources.csv': strToU8(sourcesCsv(sources)),
    'LICENSE-CC-BY-NC-SA.txt': strToU8('license'),
  });
}

export const RESPONSE_RATE_CSV =
  '"country","notification_date_from","notification_date_until","n_sources_notified","n_sources_notified_feedback","response_rate (%)"\n' +
  '"Kazakhstan","2025-08-01","2026-07-31","50","10","20"\n' +
  '"Iraq","2025-08-01","2026-07-31","21","15","71"\n';

export function responseRateZip(csv: string = RESPONSE_RATE_CSV): Uint8Array {
  return zipSync({
    'unep_methanedata_responserate/LATEST/2025-08-01_2026-07-31_Response_Rates.csv': strToU8(csv),
    'unep_methanedata_responserate/_archive/2025-01-01_2025-12-31_Response_Rates.csv': strToU8(csv),
  });
}

/** A small export with one A candidate (IRQ), one B candidate (KAZ) and filler sources. */
export function scenarioExport(): { sources: SourceRow[]; plumes: PlumeSpec[] } {
  const sources = [
    source({
      source_name: 'IRQ_S_067',
      id_last_plume: 'p-irq-2',
      country: 'Iraq',
      lat: '31.43071',
      lon: '45.69914',
      source_type: 'Pipeline valve',
      persistency_category: 'absent',
      n_plumes_detected: '2',
      last_plume_date: '2025-10-31T10:09:00',
      feedback: 'Yes',
      feedback_operator: 'Yes',
      feedback_government: 'Yes',
    }),
    source({ source_name: 'KAZ_S_003', id_last_plume: 'p-kaz-1' }),
    source({
      source_name: 'TKM_S_022',
      id_last_plume: 'p-tkm-1',
      country: 'Turkmenistan',
      persistency_category: 'sporadic',
      last_plume_date: '2026-08-15T08:45:09',
    }),
    source({ source_name: 'WST_S_001', id_last_plume: 'p-wst-1', sector: 'Waste', notified: 'Not Applicable' }),
    source({ source_name: 'NOR_S_001', id_last_plume: 'p-nor-1', last_plume_date: '2026-01-01T00:00:00' }),
    source({ source_name: 'OLD_S_001', id_last_plume: 'p-old-1', last_plume_date: '2023-01-01T00:00:00' }),
  ];
  const plumes: PlumeSpec[] = [
    { id: 'p-irq-1', source: 'IRQ_S_067', date: '2025-06-01T10:00:00', rate: '9000.0' },
    { id: 'p-irq-2', source: 'IRQ_S_067', date: '2025-10-31T10:09:00', rate: '123491.0' },
    { id: 'p-kaz-1', source: 'KAZ_S_003', date: '2026-05-31T08:49:09', rate: '7847.0' },
    { id: 'p-tkm-1', source: 'TKM_S_022', date: '2026-08-15T08:45:09', rate: '12080.0' },
    { id: 'p-wst-1', source: 'WST_S_001', date: '2026-05-31T08:49:09', rate: '5000.0' },
    { id: 'p-nor-1', source: 'NOR_S_001', date: '2026-01-01T00:00:00', rate: '' },
    { id: 'p-old-1', source: 'OLD_S_001', date: '2023-01-01T00:00:00', rate: '300.0' },
  ];
  return { sources, plumes };
}
````

Create `test/imeo.test.ts` with exactly this content:

````ts
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { assertColumns, parseCsv, parsePlumesZip, parseResponseRateZip } from '../src/lib/imeo';
import {
  plumesCsv,
  plumesZip,
  responseRateZip,
  scenarioExport,
  source,
  sourcesCsv,
} from './helpers/imeoFixtures';

describe('parseCsv', () => {
  it('reads the header and quoted fields', () => {
    const csv = parseCsv('a,b\n"x, y","2"\n');
    expect(csv.header).toEqual(['a', 'b']);
    expect(csv.rows).toEqual([{ a: 'x, y', b: '2' }]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv(`${String.fromCharCode(0xfeff)}a\n1\n`).header).toEqual(['a']);
  });
});

describe('assertColumns', () => {
  it('names every missing column', () => {
    expect(() => assertColumns(['a'], ['a', 'b', 'c'], 'file.csv')).toThrow('Missing column(s) "b", "c" in file.csv');
  });
});

describe('parsePlumesZip', () => {
  it('returns typed source and plume rows', () => {
    const { sources, plumes } = scenarioExport();
    const parsed = parsePlumesZip(plumesZip(sources, plumes));
    expect(parsed.sources).toHaveLength(sources.length);
    expect(parsed.sources[1].source_name).toBe('KAZ_S_003');
    expect(parsed.sources[1].feedback_operator).toBe('No');
    expect(parsed.plumes).toHaveLength(plumes.length);
    expect(parsed.plumes[1].ch4_fluxrate).toBe('123491.0');
  });

  it('fails loudly when IMEO drops a column', () => {
    const zip = zipSync({
      'unep_methanedata_detected_sources.csv': strToU8('source_name,lon\nX,1\n'),
      'unep_methanedata_detected_plumes.csv': strToU8('id_plume\n1\n'),
    });
    expect(() => parsePlumesZip(zip)).toThrow('Missing column(s) "lat"');
  });

  it('fails when an expected CSV is absent', () => {
    const zip = zipSync({ 'other.csv': strToU8('a\n1\n') });
    expect(() => parsePlumesZip(zip)).toThrow('Expected exactly one unep_methanedata_detected_sources.csv');
  });

  it('accepts the CSVs inside a folder', () => {
    const { plumes } = scenarioExport();
    const flat = parsePlumesZip(plumesZip([source({ source_name: 'A_S_1', id_last_plume: 'p' })], plumes));
    const nested = zipSync({
      'export/unep_methanedata_detected_sources.csv': strToU8(sourcesCsv(flat.sources)),
      'export/unep_methanedata_detected_plumes.csv': strToU8(plumesCsv(plumes)),
    });
    expect(parsePlumesZip(nested).sources).toEqual(flat.sources);
  });
});

describe('parseResponseRateZip', () => {
  it('reads only the LATEST csv', () => {
    const parsed = parseResponseRateZip(responseRateZip());
    expect(parsed.csvPath).toBe('unep_methanedata_responserate/LATEST/2025-08-01_2026-07-31_Response_Rates.csv');
    expect(parsed.rows).toEqual([
      {
        country: 'Kazakhstan',
        notification_date_from: '2025-08-01',
        notification_date_until: '2026-07-31',
        n_sources_notified: '50',
        n_sources_notified_feedback: '10',
        'response_rate (%)': '20',
      },
      {
        country: 'Iraq',
        notification_date_from: '2025-08-01',
        notification_date_until: '2026-07-31',
        n_sources_notified: '21',
        n_sources_notified_feedback: '15',
        'response_rate (%)': '71',
      },
    ]);
  });

  it('fails when there is no LATEST csv', () => {
    const zip = zipSync({ 'root/_archive/x.csv': strToU8('country\n') });
    expect(() => parseResponseRateZip(zip)).toThrow('Expected exactly one LATEST/*.csv');
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/imeo.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/imeo'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/imeo.ts` with exactly this content:

````ts
import { parse } from 'csv-parse/sync';
import { strFromU8, unzipSync } from 'fflate';

export const PLUMES_ZIP_URL =
  'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip';
export const RESPONSE_RATE_ZIP_URL =
  'https://methanedata.unep.org/downloads/response_rate/unep_methanedata_responserate.zip';
export const PLUMES_ZIP_NAME = 'unep_methanedata_detected_plumes_csv.zip';
export const RESPONSE_RATE_ZIP_NAME = 'unep_methanedata_responserate.zip';
export const SOURCES_CSV_NAME = 'unep_methanedata_detected_sources.csv';
export const PLUMES_CSV_NAME = 'unep_methanedata_detected_plumes.csv';

/** Exact header of unep_methanedata_detected_sources.csv (verified 2026-10-15). */
export const SOURCE_COLUMNS = [
  'source_name',
  'lon',
  'lat',
  'country',
  'sector',
  'source_type',
  'persistency',
  'persistency_std',
  'persistency_category',
  'n_plumes_detected',
  'id_last_plume',
  'last_plume_date',
  'notified',
  'feedback',
  'feedback_operator',
  'feedback_government',
] as const;

/** Columns of unep_methanedata_detected_plumes.csv that PlumeClock reads. */
export const PLUME_COLUMNS = ['id_plume', 'source_name', 'satellite', 'tile_date', 'ch4_fluxrate'] as const;

/** Header of the LATEST response-rate CSV. */
export const RESPONSE_RATE_COLUMNS = [
  'country',
  'notification_date_from',
  'notification_date_until',
  'n_sources_notified',
  'n_sources_notified_feedback',
  'response_rate (%)',
] as const;

export type SourceRow = Record<(typeof SOURCE_COLUMNS)[number], string>;
export type PlumeRow = Record<(typeof PLUME_COLUMNS)[number], string>;
export type ResponseRateRow = Record<(typeof RESPONSE_RATE_COLUMNS)[number], string>;

export interface ParsedCsv {
  header: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): ParsedCsv {
  let header: string[] = [];
  const rows = parse(text, {
    bom: true,
    skip_empty_lines: true,
    columns: (h: string[]) => {
      header = h;
      return h;
    },
  }) as Record<string, string>[];
  return { header, rows };
}

export function assertColumns(header: readonly string[], required: readonly string[], label: string): void {
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    throw new Error(`Missing column(s) ${missing.map((m) => `"${m}"`).join(', ')} in ${label}`);
  }
}

/** All entries of a zip, decompressed, keyed by their full path inside the archive. */
export function unzipEntries(zip: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(zip);
}

function entryByBasename(entries: Record<string, Uint8Array>, basename: string, label: string): Uint8Array {
  const matches = Object.keys(entries).filter((p) => p === basename || p.endsWith(`/${basename}`));
  if (matches.length !== 1) throw new Error(`Expected exactly one ${basename} in ${label}, found ${matches.length}`);
  return entries[matches[0]];
}

export interface PlumesExport {
  sources: SourceRow[];
  plumes: PlumeRow[];
}

/** Parse IMEO's plumes export zip (sources + plumes CSVs) and verify the columns PlumeClock relies on. */
export function parsePlumesZip(zip: Uint8Array): PlumesExport {
  const entries = unzipEntries(zip);
  const sources = parseCsv(strFromU8(entryByBasename(entries, SOURCES_CSV_NAME, PLUMES_ZIP_NAME)));
  assertColumns(sources.header, SOURCE_COLUMNS, SOURCES_CSV_NAME);
  const plumes = parseCsv(strFromU8(entryByBasename(entries, PLUMES_CSV_NAME, PLUMES_ZIP_NAME)));
  assertColumns(plumes.header, PLUME_COLUMNS, PLUMES_CSV_NAME);
  return { sources: sources.rows as SourceRow[], plumes: plumes.rows as PlumeRow[] };
}

export interface ResponseRateExport {
  csvPath: string;
  rows: ResponseRateRow[];
}

/** Parse the single CSV under `<root>/LATEST/` of IMEO's response-rate zip. */
export function parseResponseRateZip(zip: Uint8Array): ResponseRateExport {
  const entries = unzipEntries(zip);
  const latest = Object.keys(entries).filter((p) => p.includes('/LATEST/') && p.toLowerCase().endsWith('.csv'));
  if (latest.length !== 1) {
    throw new Error(`Expected exactly one LATEST/*.csv in ${RESPONSE_RATE_ZIP_NAME}, found ${latest.length}`);
  }
  const csv = parseCsv(strFromU8(entries[latest[0]]));
  assertColumns(csv.header, RESPONSE_RATE_COLUMNS, latest[0]);
  return { csvPath: latest[0], rows: csv.rows as ResponseRateRow[] };
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/imeo.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  9 passed (9)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): parse IMEO zips with schema guards`

### Task 2.4: Source records, universe and locked selection rules

**Files:**
- Create: `src/lib/records.ts`
- Test:   `test/records.test.ts`

**Depends on:** Task 2.2, Task 2.3
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/records.ts: NamedRecord; buildUniverse(sources, plumes): NamedRecord[]; selectRecent(universe, referenceDate, days = 365); selectScenario(recent): { operatorA; operatorB }; selectTicketSet(recent, scenario, topN = 40): string[]; parseImeoTimestamp; toE5; referenceDateFromLastModified`
**Requires:** `src/lib/merkle.ts: sourceIdFromName(name): Hex; hashSourceRecord(rec: SourceRecord): Hex; hashReobservation(obs: Reobservation): Hex; toAbiSourceRecord(rec); toAbiReobservation(obs); buildTree(leaves): MerkleTree; getProof(tree, leaf): Hex[]; verifyProof(leaf, proof, root): boolean`, `src/lib/imeo.ts: parsePlumesZip(zip: Uint8Array): { sources: SourceRow[]; plumes: PlumeRow[] }; parseResponseRateZip(zip: Uint8Array): { csvPath: string; rows: ResponseRateRow[] }; PLUMES_ZIP_URL, RESPONSE_RATE_ZIP_URL, PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME, SOURCE_COLUMNS`, `test/helpers/imeoFixtures.ts: source(overrides), plumesZip(sources, plumes), responseRateZip(csv?), scenarioExport(), sourcesCsv(rows), plumesCsv(specs)`, `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

Turns IMEO rows into `SourceRecord`s and applies the spec's locked rules (spec §5.2–5.4). Universe = `sector == "Oil and Gas"`, `notified == "Yes"`, last plume with a non-empty `ch4_fluxrate`. Recent = last plume within 365 days before the reference date. Operator A = highest-rate recent record with `feedbackOperator == "Yes"`, `persistency == "absent"`, `plumeCount >= 2`. Operator B = highest-rate recent record with no operator or government feedback and `persistency == "persistent"`. Ties break by source name. An empty rule throws `No candidate for operator A/B`. On the 2026-10-15 data these pick IRQ_S_067 and KAZ_S_003.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/merkle.ts: sourceIdFromName(name): Hex; hashSourceRecord(rec: SourceRecord): Hex; hashReobservation(obs: Reobservation): Hex; toAbiSourceRecord(rec); toAbiReobservation(obs); buildTree(leaves): MerkleTree; getProof(tree, leaf): Hex[]; verifyProof(leaf, proof, root): boolean`
- `src/lib/imeo.ts: parsePlumesZip(zip: Uint8Array): { sources: SourceRow[]; plumes: PlumeRow[] }; parseResponseRateZip(zip: Uint8Array): { csvPath: string; rows: ResponseRateRow[] }; PLUMES_ZIP_URL, RESPONSE_RATE_ZIP_URL, PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME, SOURCE_COLUMNS`
- `test/helpers/imeoFixtures.ts: source(overrides), plumesZip(sources, plumes), responseRateZip(csv?), scenarioExport(), sourcesCsv(rows), plumesCsv(specs)`
- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

- [ ] **Step 1: Write the failing test**

Create `test/records.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import type { PlumeRow } from '../src/lib/imeo';
import {
  buildSourceRecord,
  buildUniverse,
  parseImeoTimestamp,
  referenceDateFromLastModified,
  selectRecent,
  selectScenario,
  selectTicketSet,
  toE5,
  type NamedRecord,
} from '../src/lib/records';
import { scenarioExport, source } from './helpers/imeoFixtures';

function plumeRows(): PlumeRow[] {
  return scenarioExport().plumes.map((p) => ({
    id_plume: p.id,
    source_name: p.source,
    satellite: p.satellite ?? 'Sentinel-2 - ESA',
    tile_date: p.date,
    ch4_fluxrate: p.rate,
  }));
}

describe('parsers', () => {
  it('reads IMEO timestamps as UTC', () => {
    expect(parseImeoTimestamp('2026-05-31T08:49:09')).toBe(1780217349);
    expect(() => parseImeoTimestamp('2026-05-31 08:49:09')).toThrow('Unexpected IMEO timestamp');
  });

  it('converts coordinates to int32 * 1e5', () => {
    expect(toE5('29.19107')).toBe(2919107);
    expect(toE5('-64.79417')).toBe(-6479417);
    expect(() => toE5('')).toThrow('Not a coordinate');
    expect(() => toE5('abc')).toThrow('Not a coordinate');
  });

  it('takes the UTC date of Last-Modified', () => {
    expect(referenceDateFromLastModified('Thu, 15 Oct 2026 03:06:52 GMT')).toBe('2026-10-15');
    expect(() => referenceDateFromLastModified('soon')).toThrow('Bad Last-Modified');
  });
});

describe('buildSourceRecord', () => {
  it('maps IMEO columns onto SourceRecord fields verbatim', () => {
    const rec = buildSourceRecord(source({ source_name: 'KAZ_S_003', id_last_plume: 'p-kaz-1' }), plumeRows()[2]);
    expect(rec).toEqual({
      sourceName: 'KAZ_S_003',
      sourceId: '0x4b415a5f535f3030330000000000000000000000000000000000000000000000',
      lastPlumeId: 'p-kaz-1',
      lastPlumeAt: 1780217349,
      rateKgPerHour: 7847,
      plumeCount: 5,
      latE5: 4534143,
      lonE5: 5519165,
      country: 'Kazakhstan',
      sector: 'Oil and Gas',
      sourceType: 'Flare',
      persistency: 'persistent',
      notified: 'Yes',
      feedbackOperator: 'No',
      feedbackGovernment: 'No',
    });
  });

  it('refuses a last plume without a flux rate', () => {
    expect(() => buildSourceRecord(source({ source_name: 'X', id_last_plume: 'p' }), plumeRows()[5])).toThrow(
      'no usable ch4_fluxrate',
    );
  });
});

describe('universe, recent set, scenario, ticket set', () => {
  const { sources } = scenarioExport();
  const universe = buildUniverse(sources, plumeRows());

  it('keeps notified Oil and Gas sources with a quantified last plume, sorted by name', () => {
    expect(universe.map((r) => r.sourceName)).toEqual(['IRQ_S_067', 'KAZ_S_003', 'OLD_S_001', 'TKM_S_022']);
  });

  it('keeps the last 365 days before the reference date', () => {
    expect(selectRecent(universe, '2026-10-15').map((r) => r.sourceName)).toEqual([
      'IRQ_S_067',
      'KAZ_S_003',
      'TKM_S_022',
    ]);
  });

  it('picks A (operator responded, absent, >= 2 plumes) and B (silent, persistent)', () => {
    expect(selectScenario(selectRecent(universe, '2026-10-15'))).toEqual({
      operatorA: 'IRQ_S_067',
      operatorB: 'KAZ_S_003',
    });
  });

  it('fails loudly when a scenario rule has no candidate', () => {
    const recent = selectRecent(universe, '2026-10-15');
    expect(() => selectScenario(recent.filter((r) => r.sourceName !== 'IRQ_S_067'))).toThrow(
      'No candidate for operator A',
    );
    expect(() => selectScenario(recent.filter((r) => r.sourceName !== 'KAZ_S_003'))).toThrow(
      'No candidate for operator B',
    );
  });

  it('orders the ticket set by rate and always includes A and B', () => {
    const recent = selectRecent(universe, '2026-10-15');
    const scenario = selectScenario(recent);
    expect(selectTicketSet(recent, scenario)).toEqual(['IRQ_S_067', 'TKM_S_022', 'KAZ_S_003']);
    expect(selectTicketSet(recent, scenario, 1)).toEqual(['IRQ_S_067', 'KAZ_S_003']);
  });

  it('breaks rate ties by source name', () => {
    const base = universe[0];
    const tie = (name: string): NamedRecord => ({ ...base, sourceName: name, rateKgPerHour: 100 });
    expect(selectTicketSet([tie('B_S_1'), tie('A_S_1')], { operatorA: 'A_S_1', operatorB: 'B_S_1' }, 2)).toEqual([
      'A_S_1',
      'B_S_1',
    ]);
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/records.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/records'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/records.ts` with exactly this content:

````ts
import type { PlumeRow, SourceRow } from './imeo';
import { sourceIdFromName } from './merkle';
import type { SourceRecord } from './types';

/** A snapshot record plus its IMEO source_name. */
export type NamedRecord = SourceRecord & { sourceName: string };

const IMEO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/** IMEO 'YYYY-MM-DDTHH:MM:SS' (UTC, 19 chars) -> unix seconds. */
export function parseImeoTimestamp(value: string): number {
  if (!IMEO_TIMESTAMP.test(value)) throw new Error(`Unexpected IMEO timestamp: "${value}"`);
  return Date.parse(`${value}Z`) / 1000;
}

/** Decimal degrees -> int32 degrees * 1e5. */
export function toE5(value: string): number {
  const n = Math.round(Number(value) * 1e5);
  if (!Number.isFinite(n) || value.trim() === '' || n > 0x7fffffff || n < -0x80000000) {
    throw new Error(`Not a coordinate: "${value}"`);
  }
  return n;
}

/** UTC date (YYYY-MM-DD) of an HTTP Last-Modified header. */
export function referenceDateFromLastModified(lastModified: string): string {
  const ms = Date.parse(lastModified);
  if (Number.isNaN(ms)) throw new Error(`Bad Last-Modified: "${lastModified}"`);
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildSourceRecord(src: SourceRow, lastPlume: PlumeRow): NamedRecord {
  const rate = Math.round(Number(lastPlume.ch4_fluxrate));
  if (lastPlume.ch4_fluxrate.trim() === '' || !Number.isFinite(rate) || rate < 0 || rate > 0xffffffff) {
    throw new Error(`Source ${src.source_name}: last plume has no usable ch4_fluxrate`);
  }
  const plumeCount = Number(src.n_plumes_detected);
  if (!Number.isInteger(plumeCount) || plumeCount < 0) {
    throw new Error(`Source ${src.source_name}: bad n_plumes_detected "${src.n_plumes_detected}"`);
  }
  return {
    sourceName: src.source_name,
    sourceId: sourceIdFromName(src.source_name),
    lastPlumeId: src.id_last_plume,
    lastPlumeAt: parseImeoTimestamp(src.last_plume_date),
    rateKgPerHour: rate,
    plumeCount,
    latE5: toE5(src.lat),
    lonE5: toE5(src.lon),
    country: src.country,
    sector: src.sector,
    sourceType: src.source_type,
    persistency: src.persistency_category,
    notified: src.notified,
    feedbackOperator: src.feedback_operator,
    feedbackGovernment: src.feedback_government,
  };
}

/**
 * Universe U: MARS-notified Oil and Gas sources whose last plume has a quantified ch4_fluxrate,
 * sorted by source_name.
 */
export function buildUniverse(sources: readonly SourceRow[], plumes: readonly PlumeRow[]): NamedRecord[] {
  const plumeById = new Map<string, PlumeRow>();
  for (const p of plumes) plumeById.set(p.id_plume, p);
  const out: NamedRecord[] = [];
  for (const s of sources) {
    if (s.sector !== 'Oil and Gas' || s.notified !== 'Yes') continue;
    const last = plumeById.get(s.id_last_plume);
    if (!last || last.ch4_fluxrate.trim() === '') continue;
    out.push(buildSourceRecord(s, last));
  }
  return out.sort((a, b) => (a.sourceName < b.sourceName ? -1 : a.sourceName > b.sourceName ? 1 : 0));
}

/** Recent R: universe records whose last plume is within `days` before the reference date. */
export function selectRecent(universe: readonly NamedRecord[], referenceDate: string, days = 365): NamedRecord[] {
  const cutoff = Date.parse(`${referenceDate}T00:00:00Z`) / 1000 - days * 86_400;
  return universe.filter((r) => r.lastPlumeAt >= cutoff);
}

function byRateDesc(a: NamedRecord, b: NamedRecord): number {
  if (a.rateKgPerHour !== b.rateKgPerHour) return b.rateKgPerHour - a.rateKgPerHour;
  return a.sourceName < b.sourceName ? -1 : a.sourceName > b.sourceName ? 1 : 0;
}

export interface Scenario {
  operatorA: string;
  operatorB: string;
}

/**
 * A: operator responded, persistency absent, >= 2 plumes (the "fixed" story IMEO's data supports).
 * B: no response from operator or government, persistency persistent (IMEO-published silence).
 */
export function selectScenario(recent: readonly NamedRecord[]): Scenario {
  const a = recent
    .filter((r) => r.feedbackOperator === 'Yes' && r.persistency === 'absent' && r.plumeCount >= 2)
    .sort(byRateDesc)[0];
  if (!a) throw new Error('No candidate for operator A (operator responded, absent, >= 2 plumes)');
  const b = recent
    .filter((r) => r.feedbackOperator === 'No' && r.feedbackGovernment === 'No' && r.persistency === 'persistent')
    .sort(byRateDesc)[0];
  if (!b) throw new Error('No candidate for operator B (no response, persistent)');
  return { operatorA: a.sourceName, operatorB: b.sourceName };
}

/** Top `topN` recent records by rate, plus the scenario sources if not already included. */
export function selectTicketSet(recent: readonly NamedRecord[], scenario: Scenario, topN = 40): string[] {
  const names = [...recent].sort(byRateDesc).slice(0, topN).map((r) => r.sourceName);
  for (const s of [scenario.operatorA, scenario.operatorB]) {
    if (!names.includes(s)) names.push(s);
  }
  return names;
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/records.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  11 passed (11)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): source records and locked selection rules`

### Task 2.5: Deterministic triage score

**Files:**
- Create: `src/lib/triage.ts`
- Test:   `test/triage.test.ts`

**Depends on:** Task 2.1
**Effort:** low
**Model tier:** standard
**Provides:** `src/lib/triage.ts: triage(co2eTonnesPerYear: number, persistency: string, label: FeedbackLabel): Triage`
**Requires:** `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

Triage priority = impact x persistence x response history, 0..100 (spec §6). Impact maps CO2e on a log scale (1 kt -> 0, 10 Mt -> 1); persistence weights persistent 1.0 / frequent 0.7 / sporadic 0.4 / undetermined 0.5 / absent 0.1; response factors no response 1.0 / government 0.6 / operator 0.5 / both 0.3. Priority high >= 40, medium >= 15, else low. The LLM never computes this.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

- [ ] **Step 1: Write the failing test**

Create `test/triage.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import { triage } from '../src/lib/triage';

describe('triage', () => {
  it('scores a persistent, unanswered multi-megatonne source as high', () => {
    expect(triage(2_048_443, 'persistent', 'Notified – no response received')).toEqual({
      score: 83,
      priority: 'high',
      impact: 0.828,
      persistenceWeight: 1,
      responseFactor: 1,
    });
  });

  it('scores an answered source with no recent plume as low', () => {
    expect(triage(32_237_078, 'absent', 'Government and operator responded')).toEqual({
      score: 3,
      priority: 'low',
      impact: 1,
      persistenceWeight: 0.1,
      responseFactor: 0.3,
    });
  });

  it('reads persistency case-insensitively and defaults unknown categories to 0.5', () => {
    expect(triage(100_000, 'Undetermined', 'Operator responded').persistenceWeight).toBe(0.5);
    expect(triage(100_000, 'new-category', 'Operator responded').persistenceWeight).toBe(0.5);
  });

  it('clamps impact to [0, 1] and uses the medium band at 15..39', () => {
    expect(triage(0, 'persistent', 'Notified – no response received').impact).toBe(0);
    expect(triage(1e12, 'persistent', 'Notified – no response received').impact).toBe(1);
    expect(triage(100_000, 'frequent', 'Government responded')).toMatchObject({ score: 21, priority: 'medium' });
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/triage.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/triage'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/triage.ts` with exactly this content:

````ts
import type { FeedbackLabel, Priority, Triage } from './types';

/** How often IMEO sees the source emitting (persistency_category, lower-cased). */
export const PERSISTENCE_WEIGHTS: Readonly<Record<string, number>> = {
  persistent: 1.0,
  frequent: 0.7,
  sporadic: 0.4,
  undetermined: 0.5,
  absent: 0.1,
};

/** Response history from IMEO's published feedback state. */
export const RESPONSE_FACTORS: Readonly<Record<FeedbackLabel, number>> = {
  'Notified – no response received': 1.0,
  'Government responded': 0.6,
  'Operator responded': 0.5,
  'Government and operator responded': 0.3,
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Deterministic triage priority = impact x persistence x response history, 0..100.
 * impact maps 1,000 t CO2e/yr -> 0 and 10,000,000 t CO2e/yr -> 1 on a log scale.
 */
export function triage(co2eTonnesPerYear: number, persistency: string, label: FeedbackLabel): Triage {
  const impact = Math.min(1, Math.max(0, (Math.log10(Math.max(co2eTonnesPerYear, 1)) - 3) / 4));
  const persistenceWeight = PERSISTENCE_WEIGHTS[persistency.toLowerCase()] ?? 0.5;
  const responseFactor = RESPONSE_FACTORS[label];
  const score = Math.round(100 * impact * persistenceWeight * responseFactor);
  const priority: Priority = score >= 40 ? 'high' : score >= 15 ? 'medium' : 'low';
  return { score, priority, impact: round3(impact), persistenceWeight, responseFactor };
}
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/triage.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  4 passed (4)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): deterministic triage score`

### Task 2.6: Snapshot pinning library and scripts

**Files:**
- Create: `src/lib/pin.ts`
- Create: `scripts/pin-snapshot.ts`
- Create: `scripts/check-snapshot.ts`
- Test:   `test/pin.test.ts`

**Depends on:** Task 2.1, Task 2.3
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/pin.ts: PIN_USER_AGENT, SNAPSHOT_DIR = 'data/imeo', ATTRIBUTION, PIN_TARGETS, downloadPinned(target, fetcher), buildProvenance(files, fetchedAt), renderNotice(provenance), sha256Hex(bytes), checkSnapshotDir(dir); npm run pin; npm run check:snapshot`
**Requires:** `src/lib/imeo.ts: parsePlumesZip(zip: Uint8Array): { sources: SourceRow[]; plumes: PlumeRow[] }; parseResponseRateZip(zip: Uint8Array): { csvPath: string; rows: ResponseRateRow[] }; PLUMES_ZIP_URL, RESPONSE_RATE_ZIP_URL, PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME, SOURCE_COLUMNS`, `test/helpers/imeoFixtures.ts: source(overrides), plumesZip(sources, plumes), responseRateZip(csv?), scenarioExport(), sourcesCsv(rows), plumesCsv(specs)`, `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

`npm run pin` downloads both IMEO zips into `data/imeo/` and writes `provenance.json` + `NOTICE.md` (CC BY-NC-SA attribution and a changes-made statement). The IMEO host `methanedata.unep.org` answers 403 to default node/curl user agents, so every request sends `User-Agent: PlumeClock-snapshot-pin/0.1 (+https://github.com/bitnormie01/plumeclock)` (verified to get HTTP 200). `npm run check:snapshot` re-hashes the files against provenance and parses them. The tests use a fake fetcher and temp dirs; no network in this task.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/imeo.ts: parsePlumesZip(zip: Uint8Array): { sources: SourceRow[]; plumes: PlumeRow[] }; parseResponseRateZip(zip: Uint8Array): { csvPath: string; rows: ResponseRateRow[] }; PLUMES_ZIP_URL, RESPONSE_RATE_ZIP_URL, PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME, SOURCE_COLUMNS`
- `test/helpers/imeoFixtures.ts: source(overrides), plumesZip(sources, plumes), responseRateZip(csv?), scenarioExport(), sourcesCsv(rows), plumesCsv(specs)`
- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`

- [ ] **Step 1: Write the failing test**

Create `test/pin.test.ts` with exactly this content:

````ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ATTRIBUTION,
  PIN_TARGETS,
  PIN_USER_AGENT,
  buildProvenance,
  checkSnapshotDir,
  downloadPinned,
  renderNotice,
  sha256Hex,
  type Fetcher,
} from '../src/lib/pin';
import type { ProvenanceFile } from '../src/lib/types';
import { plumesZip, responseRateZip, scenarioExport } from './helpers/imeoFixtures';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function fakeFetcher(body: Uint8Array, status = 200, lastModified: string | null = 'Thu, 15 Oct 2026 03:06:52 GMT') {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url, headers: init.headers });
    const headers = new Headers();
    if (lastModified) headers.set('last-modified', lastModified);
    return new Response(status === 200 ? new Uint8Array(body) : 'denied', { status, headers });
  };
  return { fetcher, calls };
}

describe('downloadPinned', () => {
  it('sends the honest User-Agent and records size, sha256 and Last-Modified', async () => {
    const body = new TextEncoder().encode('zip-bytes');
    const { fetcher, calls } = fakeFetcher(body);
    const { bytes, file } = await downloadPinned(PIN_TARGETS[1], fetcher);
    expect(calls).toEqual([{ url: PIN_TARGETS[1].url, headers: { 'User-Agent': PIN_USER_AGENT } }]);
    expect(Array.from(bytes)).toEqual(Array.from(body));
    expect(file).toEqual({
      name: 'unep_methanedata_responserate.zip',
      url: 'https://methanedata.unep.org/downloads/response_rate/unep_methanedata_responserate.zip',
      lastModified: 'Thu, 15 Oct 2026 03:06:52 GMT',
      bytes: 9,
      sha256: sha256Hex(body),
    });
  });

  it('fails with the status and URL on HTTP errors', async () => {
    const { fetcher } = fakeFetcher(new Uint8Array(), 403);
    await expect(downloadPinned(PIN_TARGETS[0], fetcher)).rejects.toThrow(`HTTP 403 for ${PIN_TARGETS[0].url}`);
  });

  it('requires Last-Modified (the snapshot date comes from it)', async () => {
    const { fetcher } = fakeFetcher(new Uint8Array([1]), 200, null);
    await expect(downloadPinned(PIN_TARGETS[0], fetcher)).rejects.toThrow('No Last-Modified header');
  });
});

describe('provenance and notice', () => {
  it('names the license, attribution and every file', () => {
    const file: ProvenanceFile = { name: 'a.zip', url: 'https://x/a.zip', lastModified: 'L', bytes: 3, sha256: 'ab' };
    const prov = buildProvenance([file], '2026-10-16T09:00:00.000Z');
    expect(prov).toEqual({
      schema: 'plumeclock.provenance.v1',
      fetchedAt: '2026-10-16T09:00:00.000Z',
      license: 'CC BY-NC-SA 4.0',
      attribution: ATTRIBUTION,
      files: [file],
    });
    const notice = renderNotice(prov);
    expect(notice).toContain('# IMEO data notice');
    expect(notice).toContain("UNEP's International Methane Emissions Observatory");
    expect(notice).toContain('| `a.zip` | https://x/a.zip | L | 3 | `ab` |');
  });
});

describe('checkSnapshotDir', () => {
  function writeSnapshot(mutate?: (dir: string) => void): string {
    const dir = mkdtempSync(join(tmpdir(), 'plumeclock-pin-'));
    dirs.push(dir);
    const { sources, plumes } = scenarioExport();
    const pz = plumesZip(sources, plumes);
    const rz = responseRateZip();
    writeFileSync(join(dir, 'unep_methanedata_detected_plumes_csv.zip'), pz);
    writeFileSync(join(dir, 'unep_methanedata_responserate.zip'), rz);
    const prov = buildProvenance(
      [
        { name: 'unep_methanedata_detected_plumes_csv.zip', url: PIN_TARGETS[0].url, lastModified: 'Thu, 15 Oct 2026 03:06:52 GMT', bytes: pz.length, sha256: sha256Hex(pz) },
        { name: 'unep_methanedata_responserate.zip', url: PIN_TARGETS[1].url, lastModified: 'Thu, 17 Sep 2026 14:11:42 GMT', bytes: rz.length, sha256: sha256Hex(rz) },
      ],
      '2026-10-16T09:00:00.000Z',
    );
    writeFileSync(join(dir, 'provenance.json'), JSON.stringify(prov));
    mutate?.(dir);
    return dir;
  }

  it('verifies hashes and parses both zips', () => {
    expect(checkSnapshotDir(writeSnapshot())).toEqual({
      sources: 6,
      plumes: 7,
      responseRates: 2,
      lastModified: 'Thu, 15 Oct 2026 03:06:52 GMT',
    });
  });

  it('rejects a zip that no longer matches provenance.json', () => {
    const dir = writeSnapshot((d) => writeFileSync(join(d, 'unep_methanedata_responserate.zip'), 'tampered'));
    expect(() => checkSnapshotDir(dir)).toThrow('unep_methanedata_responserate.zip does not match provenance.json');
  });

  it('rejects a missing provenance.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plumeclock-pin-'));
    dirs.push(dir);
    expect(() => checkSnapshotDir(dir)).toThrow('Missing');
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/pin.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/pin'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/pin.ts` with exactly this content:

````ts
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PLUMES_ZIP_NAME,
  PLUMES_ZIP_URL,
  RESPONSE_RATE_ZIP_NAME,
  RESPONSE_RATE_ZIP_URL,
  parsePlumesZip,
  parseResponseRateZip,
} from './imeo';
import type { Provenance, ProvenanceFile } from './types';

/** methanedata.unep.org answers 403 to default node/curl agents; this honest agent gets 200. */
export const PIN_USER_AGENT = 'PlumeClock-snapshot-pin/0.1 (+https://github.com/bitnormie01/plumeclock)';
export const SNAPSHOT_DIR = 'data/imeo';
export const LICENSE_NAME = 'CC BY-NC-SA 4.0';
export const ATTRIBUTION =
  "Data: UNEP's International Methane Emissions Observatory (IMEO), Eye on Methane // GLOBAL " +
  '(https://methanedata.unep.org), licensed CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/). ' +
  "Changes: PlumeClock keeps MARS-notified oil and gas sources, joins each source's last-plume flux rate, " +
  'and derives CO2e and triage fields; the original zips are redistributed unmodified.';

export interface PinTarget {
  name: string;
  url: string;
}

export const PIN_TARGETS: readonly PinTarget[] = [
  { name: PLUMES_ZIP_NAME, url: PLUMES_ZIP_URL },
  { name: RESPONSE_RATE_ZIP_NAME, url: RESPONSE_RATE_ZIP_URL },
];

export type Fetcher = (url: string, init: { headers: Record<string, string> }) => Promise<Response>;

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function downloadPinned(
  target: PinTarget,
  fetcher: Fetcher,
): Promise<{ bytes: Uint8Array; file: ProvenanceFile }> {
  const res = await fetcher(target.url, { headers: { 'User-Agent': PIN_USER_AGENT } });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} for ${target.url}`);
  const lastModified = res.headers.get('last-modified');
  if (!lastModified) throw new Error(`No Last-Modified header for ${target.url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return {
    bytes,
    file: { name: target.name, url: target.url, lastModified, bytes: bytes.length, sha256: sha256Hex(bytes) },
  };
}

export function buildProvenance(files: ProvenanceFile[], fetchedAt: string): Provenance {
  return { schema: 'plumeclock.provenance.v1', fetchedAt, license: LICENSE_NAME, attribution: ATTRIBUTION, files };
}

export function renderNotice(provenance: Provenance): string {
  const rows = provenance.files.map(
    (f) => `| \`${f.name}\` | ${f.url} | ${f.lastModified} | ${f.bytes} | \`${f.sha256}\` |`,
  );
  return [
    '# IMEO data notice',
    '',
    provenance.attribution,
    '',
    `Pinned ${provenance.fetchedAt}. The zips in this folder are byte-identical to the downloads below.`,
    '',
    '| File | Source URL | Last-Modified | Bytes | SHA-256 |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    'Non-commercial use only (CC BY-NC-SA 4.0); adapted data derived from these files',
    '(public/data/snapshot.json, public/data/notices.json) is shared under the same license.',
    '',
  ].join('\n');
}

export interface SnapshotCheck {
  sources: number;
  plumes: number;
  responseRates: number;
  lastModified: string;
}

/** Verify the pinned files against provenance.json and parse them; throws on any mismatch. */
export function checkSnapshotDir(dir: string): SnapshotCheck {
  const provPath = join(dir, 'provenance.json');
  if (!existsSync(provPath)) throw new Error(`Missing ${provPath}`);
  const provenance = JSON.parse(readFileSync(provPath, 'utf8')) as Provenance;
  if (provenance.schema !== 'plumeclock.provenance.v1') throw new Error('Unexpected provenance schema');
  for (const name of [PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME]) {
    const entry = provenance.files.find((f) => f.name === name);
    if (!entry) throw new Error(`provenance.json lacks ${name}`);
    const bytes = new Uint8Array(readFileSync(join(dir, name)));
    if (bytes.length !== entry.bytes || sha256Hex(bytes) !== entry.sha256) {
      throw new Error(`${name} does not match provenance.json (size or sha256)`);
    }
  }
  const plumes = parsePlumesZip(new Uint8Array(readFileSync(join(dir, PLUMES_ZIP_NAME))));
  const rates = parseResponseRateZip(new Uint8Array(readFileSync(join(dir, RESPONSE_RATE_ZIP_NAME))));
  const plumesEntry = provenance.files.find((f) => f.name === PLUMES_ZIP_NAME) as ProvenanceFile;
  return {
    sources: plumes.sources.length,
    plumes: plumes.plumes.length,
    responseRates: rates.rows.length,
    lastModified: plumesEntry.lastModified,
  };
}
````

Create `scripts/pin-snapshot.ts` with exactly this content:

````ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIN_TARGETS, SNAPSHOT_DIR, buildProvenance, downloadPinned, renderNotice } from '../src/lib/pin';
import type { ProvenanceFile } from '../src/lib/types';

// Usage: npm run pin   (downloads IMEO's public zips into data/imeo/ and records their provenance)
const fetchedAt = new Date().toISOString();
mkdirSync(SNAPSHOT_DIR, { recursive: true });
const files: ProvenanceFile[] = [];
for (const target of PIN_TARGETS) {
  const { bytes, file } = await downloadPinned(target, fetch);
  writeFileSync(join(SNAPSHOT_DIR, target.name), bytes);
  files.push(file);
  console.log(`pinned ${file.name}: ${file.bytes} bytes, Last-Modified ${file.lastModified}, sha256 ${file.sha256}`);
}
const provenance = buildProvenance(files, fetchedAt);
writeFileSync(join(SNAPSHOT_DIR, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
writeFileSync(join(SNAPSHOT_DIR, 'NOTICE.md'), renderNotice(provenance));
console.log(`wrote ${SNAPSHOT_DIR}/provenance.json and ${SNAPSHOT_DIR}/NOTICE.md`);
````

Create `scripts/check-snapshot.ts` with exactly this content:

````ts
import { SNAPSHOT_DIR, checkSnapshotDir } from '../src/lib/pin';

const check = checkSnapshotDir(SNAPSHOT_DIR);
console.log(
  `SNAPSHOT OK sources=${check.sources} plumes=${check.plumes} responseRates=${check.responseRates} lastModified="${check.lastModified}"`,
);
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/pin.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  7 passed (7)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): IMEO snapshot pinning with provenance`

### Task 2.7: Pin today's IMEO snapshot (download)

**Files:**
- Create: `data/imeo/unep_methanedata_detected_plumes_csv.zip`
- Create: `data/imeo/unep_methanedata_responserate.zip`
- Create: `data/imeo/provenance.json`
- Create: `data/imeo/NOTICE.md`

**Depends on:** Task 2.6
**Effort:** low
**Model tier:** standard
**Provides:** `data/imeo/: unep_methanedata_detected_plumes_csv.zip, unep_methanedata_responserate.zip, provenance.json, NOTICE.md (pinned IMEO snapshot)`
**Requires:** `src/lib/pin.ts: PIN_USER_AGENT, SNAPSHOT_DIR = 'data/imeo', ATTRIBUTION, PIN_TARGETS, downloadPinned(target, fetcher), buildProvenance(files, fetchedAt), renderNotice(provenance), sha256Hex(bytes), checkSnapshotDir(dir); npm run pin; npm run check:snapshot`

Runs the pin script once and commits its outputs. This downloads about 10.9 MB of public data from UNEP IMEO (approved in the spec); the files are committed byte-for-byte (the `.gitattributes` from Task 1.1 marks `*.zip` binary). The data changes daily, so counts and hashes will differ from the 2026-10-15 inspection — that is expected. If a download returns HTTP 403 or the check reports a missing column, report BLOCKED with the exact message; do not change the code.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/pin.ts: PIN_USER_AGENT, SNAPSHOT_DIR = 'data/imeo', ATTRIBUTION, PIN_TARGETS, downloadPinned(target, fetcher), buildProvenance(files, fetchedAt), renderNotice(provenance), sha256Hex(bytes), checkSnapshotDir(dir); npm run pin; npm run check:snapshot`

- [ ] **Step 1: Confirm no snapshot is pinned yet**
      Run: `npm run check:snapshot`
      Expected: FAIL — `Missing data\imeo\provenance.json` (Node prints backslashes on Windows; forward slashes elsewhere)

- [ ] **Step 2: Download and pin the snapshot**
      Run: `npm run pin`
      Expected: two `pinned ...` lines (plumes zip about 10.8 MB, response-rate zip about 38 KB) and `wrote data/imeo/provenance.json and data/imeo/NOTICE.md`

- [ ] **Step 3: Run to confirm it passes (gate)**
      Run: `npm run check:snapshot`
      Expected: PASS — one line starting `SNAPSHOT OK sources=` (about 4,200 sources, 30,000 plumes, 34 response-rate rows on 2026-10-15)

- [ ] **Step 4: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `data: pin UNEP IMEO snapshot with provenance`

### Task 2.8: Build the snapshot fixture (records, root, proofs, overlay)

**Files:**
- Create: `src/lib/fixtures.ts`
- Create: `scripts/build-fixtures.ts`
- Test:   `test/fixtures.test.ts`

**Depends on:** Task 2.4, Task 2.5, Task 2.6
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/fixtures.ts: buildSnapshotFile({ provenance, plumesZip, responseRateZip, generatedAt }): SnapshotFile; npm run fixtures`
**Requires:** `src/lib/records.ts: NamedRecord; buildUniverse(sources, plumes): NamedRecord[]; selectRecent(universe, referenceDate, days = 365); selectScenario(recent): { operatorA; operatorB }; selectTicketSet(recent, scenario, topN = 40): string[]; parseImeoTimestamp; toE5; referenceDateFromLastModified`, `src/lib/triage.ts: triage(co2eTonnesPerYear: number, persistency: string, label: FeedbackLabel): Triage`, `src/lib/merkle.ts: sourceIdFromName(name): Hex; hashSourceRecord(rec: SourceRecord): Hex; hashReobservation(obs: Reobservation): Hex; toAbiSourceRecord(rec); toAbiReobservation(obs); buildTree(leaves): MerkleTree; getProof(tree, leaf): Hex[]; verifyProof(leaf, proof, root): boolean`, `src/lib/imeo.ts: parsePlumesZip(zip: Uint8Array): { sources: SourceRow[]; plumes: PlumeRow[] }; parseResponseRateZip(zip: Uint8Array): { csvPath: string; rows: ResponseRateRow[] }; PLUMES_ZIP_URL, RESPONSE_RATE_ZIP_URL, PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME, SOURCE_COLUMNS`, `test/helpers/imeoFixtures.ts: source(overrides), plumesZip(sources, plumes), responseRateZip(csv?), scenarioExport(), sourcesCsv(rows), plumesCsv(specs)`, `src/lib/pin.ts: PIN_USER_AGENT, SNAPSHOT_DIR = 'data/imeo', ATTRIBUTION, PIN_TARGETS, downloadPinned(target, fetcher), buildProvenance(files, fetchedAt), renderNotice(provenance), sha256Hex(bytes), checkSnapshotDir(dir); npm run pin; npm run check:snapshot`, `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`, `src/lib/co2e.ts: co2eTonnesPerYear(rateKgPerHour: number): number, GWP100 = 29.8, GWP100_X10 = 298n, HOURS_PER_YEAR = 8760n; src/lib/feedback.ts: feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel, IMEO_RESPONSE_CAVEAT`

Pure function from the pinned zips to `public/data/snapshot.json` (schema `plumeclock.snapshot.v1`): every universe record with its leaf, CO2e, IMEO label and triage; the Merkle root over all of them; the ticket set with proofs and newest-first plume histories (max 20); the scenario; and the country response-rate rows placed at the mean location of each country's universe sources (null when none). Output is deterministic for the same inputs (`generatedAt` = provenance `fetchedAt`).

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/records.ts: NamedRecord; buildUniverse(sources, plumes): NamedRecord[]; selectRecent(universe, referenceDate, days = 365); selectScenario(recent): { operatorA; operatorB }; selectTicketSet(recent, scenario, topN = 40): string[]; parseImeoTimestamp; toE5; referenceDateFromLastModified`
- `src/lib/triage.ts: triage(co2eTonnesPerYear: number, persistency: string, label: FeedbackLabel): Triage`
- `src/lib/merkle.ts: sourceIdFromName(name): Hex; hashSourceRecord(rec: SourceRecord): Hex; hashReobservation(obs: Reobservation): Hex; toAbiSourceRecord(rec); toAbiReobservation(obs); buildTree(leaves): MerkleTree; getProof(tree, leaf): Hex[]; verifyProof(leaf, proof, root): boolean`
- `src/lib/imeo.ts: parsePlumesZip(zip: Uint8Array): { sources: SourceRow[]; plumes: PlumeRow[] }; parseResponseRateZip(zip: Uint8Array): { csvPath: string; rows: ResponseRateRow[] }; PLUMES_ZIP_URL, RESPONSE_RATE_ZIP_URL, PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME, SOURCE_COLUMNS`
- `test/helpers/imeoFixtures.ts: source(overrides), plumesZip(sources, plumes), responseRateZip(csv?), scenarioExport(), sourcesCsv(rows), plumesCsv(specs)`
- `src/lib/pin.ts: PIN_USER_AGENT, SNAPSHOT_DIR = 'data/imeo', ATTRIBUTION, PIN_TARGETS, downloadPinned(target, fetcher), buildProvenance(files, fetchedAt), renderNotice(provenance), sha256Hex(bytes), checkSnapshotDir(dir); npm run pin; npm run check:snapshot`
- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`
- `src/lib/co2e.ts: co2eTonnesPerYear(rateKgPerHour: number): number, GWP100 = 29.8, GWP100_X10 = 298n, HOURS_PER_YEAR = 8760n; src/lib/feedback.ts: feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel, IMEO_RESPONSE_CAVEAT`

- [ ] **Step 1: Write the failing test**

Create `test/fixtures.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import { buildSnapshotFile } from '../src/lib/fixtures';
import { buildTree, getProof, verifyProof } from '../src/lib/merkle';
import { buildProvenance } from '../src/lib/pin';
import { plumesZip, responseRateZip, scenarioExport } from './helpers/imeoFixtures';

function build() {
  const { sources, plumes } = scenarioExport();
  const provenance = buildProvenance(
    [
      { name: 'unep_methanedata_detected_plumes_csv.zip', url: 'u1', lastModified: 'Thu, 15 Oct 2026 03:06:52 GMT', bytes: 1, sha256: 'a' },
      { name: 'unep_methanedata_responserate.zip', url: 'u2', lastModified: 'Thu, 17 Sep 2026 14:11:42 GMT', bytes: 1, sha256: 'b' },
    ],
    '2026-10-16T09:00:00.000Z',
  );
  return buildSnapshotFile({
    provenance,
    plumesZip: plumesZip(sources, plumes),
    responseRateZip: responseRateZip(),
    generatedAt: '2026-10-16T09:00:00.000Z',
  });
}

describe('buildSnapshotFile', () => {
  const snap = build();

  it('commits every universe record to the root', () => {
    expect(snap.schema).toBe('plumeclock.snapshot.v1');
    expect(snap.referenceDate).toBe('2026-10-15');
    expect(snap.universeCount).toBe(4);
    expect(snap.records.map((r) => r.sourceName)).toEqual(['IRQ_S_067', 'KAZ_S_003', 'OLD_S_001', 'TKM_S_022']);
    expect(buildTree(snap.records.map((r) => r.leaf)).root).toBe(snap.root);
  });

  it('derives CO2e, the IMEO label and triage per record', () => {
    const kaz = snap.records.find((r) => r.sourceName === 'KAZ_S_003');
    expect(kaz).toMatchObject({
      rateKgPerHour: 7847,
      co2eTonnesPerYear: 2_048_443,
      feedbackLabel: 'Notified – no response received',
      triage: { score: 83, priority: 'high' },
    });
  });

  it('selects the scenario and ticket set and proves each ticket-set record', () => {
    expect(snap.scenario).toEqual({ operatorA: 'IRQ_S_067', operatorB: 'KAZ_S_003' });
    expect(snap.ticketSet).toEqual(['IRQ_S_067', 'TKM_S_022', 'KAZ_S_003']);
    for (const name of snap.ticketSet) {
      const rec = snap.records.find((r) => r.sourceName === name);
      expect(rec).toBeDefined();
      expect(verifyProof(rec!.leaf, snap.proofs[name], snap.root)).toBe(true);
    }
    expect(Object.keys(snap.proofs).sort()).toEqual([...snap.ticketSet].sort());
  });

  it('keeps newest-first plume histories for the ticket set only', () => {
    expect(Object.keys(snap.histories).sort()).toEqual(['IRQ_S_067', 'KAZ_S_003', 'TKM_S_022']);
    expect(snap.histories.IRQ_S_067.map((h) => h.plumeId)).toEqual(['p-irq-2', 'p-irq-1']);
    expect(snap.histories.IRQ_S_067[0]).toEqual({
      plumeId: 'p-irq-2',
      observedAt: 1761905340,
      rateKgPerHour: 123491,
      satellite: 'Sentinel-2 - ESA',
    });
  });

  it('places each response-rate row at the mean location of its sources', () => {
    expect(snap.responseRates).toEqual([
      { country: 'Kazakhstan', from: '2025-08-01', until: '2026-07-31', sourcesNotified: 50, sourcesWithFeedback: 10, ratePct: 20, lat: 45.341, lon: 55.192 },
      { country: 'Iraq', from: '2025-08-01', until: '2026-07-31', sourcesNotified: 21, sourcesWithFeedback: 15, ratePct: 71, lat: 31.431, lon: 45.699 },
    ]);
  });

  it('is deterministic for the same inputs', () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(snap));
    expect(getProof(buildTree(snap.records.map((r) => r.leaf)), snap.records[0].leaf).length).toBeGreaterThan(0);
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/fixtures.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/fixtures'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/fixtures.ts` with exactly this content:

````ts
import { co2eTonnesPerYear } from './co2e';
import { feedbackLabel } from './feedback';
import { PLUMES_ZIP_NAME, parsePlumesZip, parseResponseRateZip, type PlumeRow } from './imeo';
import { buildTree, getProof, hashSourceRecord } from './merkle';
import {
  buildUniverse,
  parseImeoTimestamp,
  referenceDateFromLastModified,
  selectRecent,
  selectScenario,
  selectTicketSet,
  type NamedRecord,
} from './records';
import { triage } from './triage';
import type { PlumeHistoryEntry, Provenance, ResponseRate, SnapshotFile, SnapshotRecord } from './types';

export const HISTORY_LIMIT = 20;

export interface FixtureInput {
  provenance: Provenance;
  plumesZip: Uint8Array;
  responseRateZip: Uint8Array;
  generatedAt: string;
}

function toSnapshotRecord(r: NamedRecord): SnapshotRecord {
  const co2e = co2eTonnesPerYear(r.rateKgPerHour);
  const label = feedbackLabel(r.feedbackOperator, r.feedbackGovernment);
  return {
    ...r,
    leaf: hashSourceRecord(r),
    co2eTonnesPerYear: co2e,
    feedbackLabel: label,
    triage: triage(co2e, r.persistency, label),
  };
}

function historyFor(sourceName: string, plumes: readonly PlumeRow[]): PlumeHistoryEntry[] {
  return plumes
    .filter((p) => p.source_name === sourceName)
    .map((p) => ({
      plumeId: p.id_plume,
      observedAt: parseImeoTimestamp(p.tile_date),
      rateKgPerHour: p.ch4_fluxrate.trim() === '' ? null : Math.round(Number(p.ch4_fluxrate)),
      satellite: p.satellite,
    }))
    .sort((a, b) => b.observedAt - a.observedAt)
    .slice(0, HISTORY_LIMIT);
}

/** Pinned IMEO zips -> public/data/snapshot.json content (pure: same inputs, same output). */
export function buildSnapshotFile(input: FixtureInput): SnapshotFile {
  const plumesFile = input.provenance.files.find((f) => f.name === PLUMES_ZIP_NAME);
  if (!plumesFile) throw new Error(`provenance lacks ${PLUMES_ZIP_NAME}`);
  const { sources, plumes } = parsePlumesZip(input.plumesZip);
  const rates = parseResponseRateZip(input.responseRateZip);
  const referenceDate = referenceDateFromLastModified(plumesFile.lastModified);
  const universe = buildUniverse(sources, plumes);
  if (universe.length === 0) throw new Error('Empty universe: no notified Oil and Gas sources with a flux rate');
  const recent = selectRecent(universe, referenceDate);
  const scenario = selectScenario(recent);
  const ticketSet = selectTicketSet(recent, scenario);
  const records = universe.map(toSnapshotRecord);
  const tree = buildTree(records.map((r) => r.leaf));
  const byName = new Map(records.map((r) => [r.sourceName, r]));
  const proofs: Record<string, `0x${string}`[]> = {};
  const histories: Record<string, PlumeHistoryEntry[]> = {};
  for (const name of ticketSet) {
    const rec = byName.get(name);
    if (!rec) throw new Error(`Ticket-set source ${name} missing from universe`);
    proofs[name] = getProof(tree, rec.leaf);
    histories[name] = historyFor(name, plumes);
  }
  const responseRates: ResponseRate[] = rates.rows.map((row) => {
    const inCountry = records.filter((r) => r.country === row.country);
    const mean = (xs: number[]) => (xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1e3) / 1e3);
    return {
      country: row.country,
      from: row.notification_date_from,
      until: row.notification_date_until,
      sourcesNotified: Number(row.n_sources_notified),
      sourcesWithFeedback: Number(row.n_sources_notified_feedback),
      ratePct: Number(row['response_rate (%)']),
      lat: mean(inCountry.map((r) => r.latE5 / 1e5)),
      lon: mean(inCountry.map((r) => r.lonE5 / 1e5)),
    };
  });
  return {
    schema: 'plumeclock.snapshot.v1',
    generatedAt: input.generatedAt,
    provenance: input.provenance,
    referenceDate,
    root: tree.root,
    universeCount: records.length,
    records,
    ticketSet,
    proofs,
    scenario,
    histories,
    responseRates,
  };
}
````

Create `scripts/build-fixtures.ts` with exactly this content:

````ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSnapshotFile } from '../src/lib/fixtures';
import { PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME } from '../src/lib/imeo';
import { SNAPSHOT_DIR, checkSnapshotDir } from '../src/lib/pin';
import type { Provenance } from '../src/lib/types';

checkSnapshotDir(SNAPSHOT_DIR);
const provenance = JSON.parse(readFileSync(join(SNAPSHOT_DIR, 'provenance.json'), 'utf8')) as Provenance;
const snapshot = buildSnapshotFile({
  provenance,
  plumesZip: new Uint8Array(readFileSync(join(SNAPSHOT_DIR, PLUMES_ZIP_NAME))),
  responseRateZip: new Uint8Array(readFileSync(join(SNAPSHOT_DIR, RESPONSE_RATE_ZIP_NAME))),
  generatedAt: provenance.fetchedAt,
});
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/snapshot.json', `${JSON.stringify(snapshot)}\n`);
console.log(
  `snapshot.json: ${snapshot.universeCount} records, ${snapshot.ticketSet.length} tickets, root ${snapshot.root}, ` +
    `A=${snapshot.scenario.operatorA} B=${snapshot.scenario.operatorB}`,
);
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/fixtures.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  6 passed (6)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): snapshot fixture builder`

### Task 2.9: Generate and commit public/data/snapshot.json

**Files:**
- Create: `public/data/snapshot.json`
- Test:   `test/snapshot-data.test.ts`

**Depends on:** Task 2.7, Task 2.8
**Effort:** low
**Model tier:** standard
**Provides:** `public/data/snapshot.json (schema plumeclock.snapshot.v1, built from the pinned snapshot)`
**Requires:** `data/imeo/: unep_methanedata_detected_plumes_csv.zip, unep_methanedata_responserate.zip, provenance.json, NOTICE.md (pinned IMEO snapshot)`, `src/lib/fixtures.ts: buildSnapshotFile({ provenance, plumesZip, responseRateZip, generatedAt }): SnapshotFile; npm run fixtures`

Runs the fixture builder on the pinned snapshot and commits the result, guarded by invariant tests that do not hard-code day-specific counts: every leaf recomputes, the root recomputes, every ticket-set proof verifies, and both scenario sources satisfy the locked rules. If any step fails, report BLOCKED with the exact message; do not change code or tests.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `data/imeo/: unep_methanedata_detected_plumes_csv.zip, unep_methanedata_responserate.zip, provenance.json, NOTICE.md (pinned IMEO snapshot)`
- `src/lib/fixtures.ts: buildSnapshotFile({ provenance, plumesZip, responseRateZip, generatedAt }): SnapshotFile; npm run fixtures`

- [ ] **Step 1: Write the failing test**

Create `test/snapshot-data.test.ts` with exactly this content:

````ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { co2eTonnesPerYear } from '../src/lib/co2e';
import { feedbackLabel } from '../src/lib/feedback';
import { buildTree, hashSourceRecord, verifyProof } from '../src/lib/merkle';
import { referenceDateFromLastModified } from '../src/lib/records';
import type { SnapshotFile } from '../src/lib/types';

const snap = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
const byName = new Map(snap.records.map((r) => [r.sourceName, r]));

describe('committed public/data/snapshot.json (real IMEO data)', () => {
  it('has the v1 schema and a pinned provenance', () => {
    expect(snap.schema).toBe('plumeclock.snapshot.v1');
    expect(snap.provenance.files.map((f) => f.name).sort()).toEqual([
      'unep_methanedata_detected_plumes_csv.zip',
      'unep_methanedata_responserate.zip',
    ]);
    const plumes = snap.provenance.files.find((f) => f.name === 'unep_methanedata_detected_plumes_csv.zip');
    expect(snap.referenceDate).toBe(referenceDateFromLastModified(plumes!.lastModified));
  });

  it('only holds MARS-notified oil and gas sources, each leaf recomputable', () => {
    expect(snap.universeCount).toBe(snap.records.length);
    expect(snap.records.length).toBeGreaterThan(100);
    for (const r of snap.records) {
      expect(r.sector).toBe('Oil and Gas');
      expect(r.notified).toBe('Yes');
      expect(hashSourceRecord(r)).toBe(r.leaf);
      expect(r.co2eTonnesPerYear).toBe(co2eTonnesPerYear(r.rateKgPerHour));
      expect(r.feedbackLabel).toBe(feedbackLabel(r.feedbackOperator, r.feedbackGovernment));
    }
  });

  it('commits all records to the root', () => {
    expect(buildTree(snap.records.map((r) => r.leaf)).root).toBe(snap.root);
  });

  it('has a ticket set with valid proofs that includes both scenario sources', () => {
    expect(snap.ticketSet.length).toBeGreaterThanOrEqual(2);
    expect(snap.ticketSet.length).toBeLessThanOrEqual(42);
    expect(snap.ticketSet).toContain(snap.scenario.operatorA);
    expect(snap.ticketSet).toContain(snap.scenario.operatorB);
    for (const name of snap.ticketSet) {
      const rec = byName.get(name);
      expect(rec, name).toBeDefined();
      expect(verifyProof(rec!.leaf, snap.proofs[name], snap.root)).toBe(true);
      expect(snap.histories[name].length).toBeGreaterThan(0);
    }
  });

  it('picks scenario sources that obey the locked rules', () => {
    const a = byName.get(snap.scenario.operatorA)!;
    expect(a.feedbackOperator).toBe('Yes');
    expect(a.persistency).toBe('absent');
    expect(a.plumeCount).toBeGreaterThanOrEqual(2);
    const b = byName.get(snap.scenario.operatorB)!;
    expect(b.feedbackOperator).toBe('No');
    expect(b.feedbackGovernment).toBe('No');
    expect(b.persistency).toBe('persistent');
  });

  it('carries the country response-rate overlay', () => {
    expect(snap.responseRates.length).toBeGreaterThan(0);
    for (const rr of snap.responseRates) {
      expect(rr.ratePct).toBeGreaterThanOrEqual(0);
      expect(rr.ratePct).toBeLessThanOrEqual(100);
    }
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/snapshot-data.test.ts`
      Expected: FAIL — ENOENT: no such file or directory, open 'public/data/snapshot.json'

- [ ] **Step 3: Build the fixture from the pinned snapshot**
      Run: `npm run fixtures`
      Expected: one line like `snapshot.json: 1941 records, 41 tickets, root 0x..., A=IRQ_S_067 B=KAZ_S_003` (counts and IDs follow the pinned data)

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/snapshot-data.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  6 passed (6)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `data: build snapshot.json (records, Merkle root, proofs)`

### Task 2.10: AI plume analyst notices with template fallback

**Files:**
- Create: `src/lib/notices.ts`
- Create: `scripts/notices.ts`
- Test:   `test/notices.test.ts`

**Depends on:** Task 2.1
**Effort:** medium
**Model tier:** standard
**Provides:** `src/lib/notices.ts: templateNotice(rec), isValidNotice(text, rec), buildNotices(records, generatedAt, drafter?, model?): Promise<NoticesFile>, makeClaudeDrafter(apiKey, model), DEFAULT_LLM_MODEL = 'claude-opus-5-5', TEMPLATE_GENERATOR = 'template'; npm run notices [-- --template]`
**Requires:** `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`, `src/lib/co2e.ts: co2eTonnesPerYear(rateKgPerHour: number): number, GWP100 = 29.8, GWP100_X10 = 298n, HOURS_PER_YEAR = 8760n; src/lib/feedback.ts: feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel, IMEO_RESPONSE_CAVEAT`

Drafts a short public notice per ticket. Default: deterministic template text (four short factual sentences). With `LLM_API_KEY`, Claude writes 2-3 sentences through the Anthropic Messages API (`@anthropic-ai/sdk`): `client.beta.messages.create` with model `claude-opus-5-5` (override `LLM_MODEL`), `max_tokens: 2000`, `output_config: { effort: 'low' }`, `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`. A refusal, API error or output without the source id or over 600 chars falls back to the template for that record; an authentication or permission error stops all LLM calls for the run. Tests inject fake drafters; this task never calls the API.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `src/lib/types.ts: SourceRecord, Reobservation, FeedbackLabel, Priority, Triage, SnapshotRecord, PlumeHistoryEntry, ResponseRate, ProvenanceFile, Provenance, SnapshotFile, Notice, NoticesFile, NetworkName, DeploymentActors, DeploymentFile`
- `src/lib/co2e.ts: co2eTonnesPerYear(rateKgPerHour: number): number, GWP100 = 29.8, GWP100_X10 = 298n, HOURS_PER_YEAR = 8760n; src/lib/feedback.ts: feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel, IMEO_RESPONSE_CAVEAT`

- [ ] **Step 1: Write the failing test**

Create `test/notices.test.ts` with exactly this content:

````ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LLM_MODEL,
  NOTICE_SYSTEM_PROMPT,
  buildNotices,
  isValidNotice,
  noticePrompt,
  templateNotice,
  type Drafter,
} from '../src/lib/notices';
import type { SnapshotRecord } from '../src/lib/types';

const REC: SnapshotRecord = {
  sourceName: 'KAZ_S_003',
  sourceId: '0x4b415a5f535f3030330000000000000000000000000000000000000000000000',
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
  leaf: '0x344386895199e3ec178a6af01c28960407b752ee1970bd3f2d42e658558340c8',
  co2eTonnesPerYear: 2048443,
  feedbackLabel: 'Notified – no response received',
  triage: { score: 83, priority: 'high', impact: 0.828, persistenceWeight: 1, responseFactor: 1 },
};
const REC2: SnapshotRecord = { ...REC, sourceName: 'IRQ_S_067', country: 'Iraq' };

describe('templateNotice', () => {
  it('states only the facts, with the CO2e assumption and the IMEO status', () => {
    expect(templateNotice(REC)).toBe(
      'KAZ_S_003 (Transmission Compressor Station, Kazakhstan): satellites recorded a methane plume of ' +
        '7,847 kg/h on 2026-05-31. If it persisted all year that is about 2,048,443 t CO2e (GWP100 29.8). ' +
        'IMEO status: Notified – no response received. Triage priority: high (83/100).',
    );
    expect(isValidNotice(templateNotice(REC), REC)).toBe(true);
  });
});

describe('prompting', () => {
  it('forbids speculation and passes the facts verbatim', () => {
    expect(NOTICE_SYSTEM_PROMPT).toContain('Do not guess who operates the site');
    expect(noticePrompt(REC)).toContain('Source ID: KAZ_S_003');
    expect(noticePrompt(REC)).toContain('IMEO status: Notified – no response received');
    expect(DEFAULT_LLM_MODEL).toBe('claude-opus-5-5');
  });
});

describe('isValidNotice', () => {
  it('requires the source id and at most 600 characters', () => {
    expect(isValidNotice('A notice about KAZ_S_003.', REC)).toBe(true);
    expect(isValidNotice('A notice without the id.', REC)).toBe(false);
    expect(isValidNotice(`KAZ_S_003 ${'x'.repeat(600)}`, REC)).toBe(false);
    expect(isValidNotice('   ', REC)).toBe(false);
  });
});

describe('buildNotices', () => {
  it('uses templates when no drafter is configured', async () => {
    const file = await buildNotices([REC], '2026-10-16T09:00:00.000Z');
    expect(file).toEqual({
      schema: 'plumeclock.notices.v1',
      generatedAt: '2026-10-16T09:00:00.000Z',
      generator: 'template',
      notices: { KAZ_S_003: { text: templateNotice(REC), generator: 'template' } },
    });
  });

  it('keeps valid LLM text and falls back per record otherwise', async () => {
    const drafter: Drafter = async (rec) =>
      rec.sourceName === 'KAZ_S_003'
        ? { kind: 'text', text: '  KAZ_S_003 keeps emitting; IMEO lists no response.  ' }
        : { kind: 'fallback', reason: 'refusal' };
    const file = await buildNotices([REC, REC2], 't', drafter, 'claude-opus-5-5');
    expect(file.generator).toBe('claude-opus-5-5');
    expect(file.notices.KAZ_S_003).toEqual({
      text: 'KAZ_S_003 keeps emitting; IMEO lists no response.',
      generator: 'claude-opus-5-5',
    });
    expect(file.notices.IRQ_S_067).toEqual({ text: templateNotice(REC2), generator: 'template' });
  });

  it('rejects LLM text that drops the source id', async () => {
    const drafter: Drafter = async () => ({ kind: 'text', text: 'A plume was seen.' });
    const file = await buildNotices([REC], 't', drafter);
    expect(file.notices.KAZ_S_003.generator).toBe('template');
    expect(file.generator).toBe('template');
  });

  it('stops calling the LLM after an abort (e.g. bad key)', async () => {
    let calls = 0;
    const drafter: Drafter = async () => {
      calls++;
      return { kind: 'abort', reason: 'auth: 401' };
    };
    const file = await buildNotices([REC, REC2], 't', drafter);
    expect(calls).toBe(1);
    expect(Object.values(file.notices).every((n) => n.generator === 'template')).toBe(true);
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/notices.test.ts`
      Expected: FAIL — tsc: Cannot find module '../src/lib/notices'

- [ ] **Step 3: Minimal implementation**

Create `src/lib/notices.ts` with exactly this content:

````ts
import Anthropic from '@anthropic-ai/sdk';
import { GWP100 } from './co2e';
import type { Notice, NoticesFile, SnapshotRecord } from './types';

export const DEFAULT_LLM_MODEL = 'claude-opus-5-5';
export const TEMPLATE_GENERATOR = 'template';
export const MAX_NOTICE_CHARS = 600;

export type DraftResult =
  | { kind: 'text'; text: string }
  | { kind: 'fallback'; reason: string }
  | { kind: 'abort'; reason: string };

/** Drafts one notice; `abort` stops all further LLM calls for the run (e.g. a bad API key). */
export type Drafter = (rec: SnapshotRecord) => Promise<DraftResult>;

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/** Deterministic fallback notice: facts only, IMEO status verbatim. */
export function templateNotice(rec: SnapshotRecord): string {
  return (
    `${rec.sourceName} (${rec.sourceType}, ${rec.country}): satellites recorded a methane plume of ` +
    `${rec.rateKgPerHour.toLocaleString('en-US')} kg/h on ${formatDate(rec.lastPlumeAt)}. ` +
    `If it persisted all year that is about ${rec.co2eTonnesPerYear.toLocaleString('en-US')} t CO2e ` +
    `(GWP100 ${GWP100}). IMEO status: ${rec.feedbackLabel}. ` +
    `Triage priority: ${rec.triage.priority} (${rec.triage.score}/100).`
  );
}

export function isValidNotice(text: string, rec: SnapshotRecord): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_NOTICE_CHARS && t.includes(rec.sourceName);
}

export const NOTICE_SYSTEM_PROMPT =
  'You write plain-language public notices for an open methane accountability dashboard. ' +
  'Use only the facts given. Do not guess who operates the site, why it emits, or whether anyone is negligent; ' +
  'IMEO notes that low response rates may not necessarily signal indifference. ' +
  'Write 2 or 3 short sentences, under 500 characters, with no headings or lists. ' +
  'Always mention the source ID exactly as given, the CO2e figure with its assumption ' +
  '(GWP100 29.8, if the emission persisted for a year), and the IMEO status exactly as given.';

export function noticePrompt(rec: SnapshotRecord): string {
  return [
    `Source ID: ${rec.sourceName}`,
    `Country: ${rec.country}`,
    `Sector: ${rec.sector}`,
    `Source type: ${rec.sourceType}`,
    `Last satellite detection (UTC date): ${formatDate(rec.lastPlumeAt)}`,
    `Emission rate at that detection: ${rec.rateKgPerHour} kg CH4/h`,
    `Plumes attributed to this source: ${rec.plumeCount}`,
    `IMEO persistency category: ${rec.persistency}`,
    `CO2e if persisted for a year (GWP100 29.8): ${rec.co2eTonnesPerYear} t`,
    `IMEO status: ${rec.feedbackLabel}`,
    `Triage priority: ${rec.triage.priority} (${rec.triage.score}/100)`,
  ].join('\n');
}

/** Build the notices for the ticket set; any LLM problem falls back to the template text. */
export async function buildNotices(
  records: readonly SnapshotRecord[],
  generatedAt: string,
  drafter?: Drafter,
  model = DEFAULT_LLM_MODEL,
): Promise<NoticesFile> {
  const notices: Record<string, Notice> = {};
  let useLlm = drafter !== undefined;
  let llmCount = 0;
  for (const rec of records) {
    let notice: Notice = { text: templateNotice(rec), generator: TEMPLATE_GENERATOR };
    if (useLlm && drafter) {
      const result = await drafter(rec);
      if (result.kind === 'abort') {
        useLlm = false;
      } else if (result.kind === 'text' && isValidNotice(result.text, rec)) {
        notice = { text: result.text.trim(), generator: model };
        llmCount++;
      }
    }
    notices[rec.sourceName] = notice;
  }
  return {
    schema: 'plumeclock.notices.v1',
    generatedAt,
    generator: llmCount > 0 ? model : TEMPLATE_GENERATOR,
    notices,
  };
}

/** Real drafter: Anthropic Messages API (low effort, server-side refusal fallbacks). */
export function makeClaudeDrafter(apiKey: string, model = DEFAULT_LLM_MODEL): Drafter {
  const client = new Anthropic({ apiKey });
  return async (rec) => {
    try {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: NOTICE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: noticePrompt(rec) }],
      });
      if (response.stop_reason === 'refusal') return { kind: 'fallback', reason: 'refusal' };
      const text = response.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('')
        .trim();
      return { kind: 'text', text };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        return { kind: 'abort', reason: `auth: ${error.status}` };
      }
      if (error instanceof Anthropic.APIError) return { kind: 'fallback', reason: `api ${error.status}` };
      return { kind: 'fallback', reason: error instanceof Error ? error.message : 'unknown error' };
    }
  };
}
````

Create `scripts/notices.ts` with exactly this content:

````ts
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_LLM_MODEL, buildNotices, makeClaudeDrafter } from '../src/lib/notices';
import type { SnapshotFile } from '../src/lib/types';

// Usage: npm run notices            (Claude if LLM_API_KEY is set in the env or .env, else templates)
//        npm run notices -- --template   (always templates, never calls an API)
const templateOnly = process.argv.includes('--template');
if (!templateOnly) {
  try {
    process.loadEnvFile('.env');
  } catch {
    // no .env file: template mode unless LLM_API_KEY is already in the environment
  }
}
const snapshot = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
const byName = new Map(snapshot.records.map((r) => [r.sourceName, r]));
const records = snapshot.ticketSet.map((name) => {
  const rec = byName.get(name);
  if (!rec) throw new Error(`Ticket-set source ${name} is not in snapshot.records`);
  return rec;
});
const apiKey = templateOnly ? undefined : process.env.LLM_API_KEY?.trim();
const model = process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
const drafter = apiKey ? makeClaudeDrafter(apiKey, model) : undefined;
const generatedAt = drafter ? new Date().toISOString() : snapshot.generatedAt;
const notices = await buildNotices(records, generatedAt, drafter, model);
writeFileSync('public/data/notices.json', `${JSON.stringify(notices, null, 2)}\n`);
console.log(`notices.json: ${Object.keys(notices.notices).length} notices, generator=${notices.generator}`);
````

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/notices.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  7 passed (7)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `feat(data): AI plume analyst notices with template fallback`

### Task 2.11: Generate and commit template notices

**Files:**
- Create: `public/data/notices.json`
- Test:   `test/notices-data.test.ts`

**Depends on:** Task 2.9, Task 2.10
**Effort:** low
**Model tier:** standard
**Provides:** `public/data/notices.json (schema plumeclock.notices.v1)`
**Requires:** `public/data/snapshot.json (schema plumeclock.snapshot.v1, built from the pinned snapshot)`, `src/lib/notices.ts: templateNotice(rec), isValidNotice(text, rec), buildNotices(records, generatedAt, drafter?, model?): Promise<NoticesFile>, makeClaudeDrafter(apiKey, model), DEFAULT_LLM_MODEL = 'claude-opus-5-5', TEMPLATE_GENERATOR = 'template'; npm run notices [-- --template]`

Commits template-generated notices for the ticket set. `--template` guarantees no API call even if an `LLM_API_KEY` happens to be set. (Task 2.12 is the optional human-gated Claude regeneration.) If any step fails, report BLOCKED with the exact message; do not change code or tests.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `public/data/snapshot.json (schema plumeclock.snapshot.v1, built from the pinned snapshot)`
- `src/lib/notices.ts: templateNotice(rec), isValidNotice(text, rec), buildNotices(records, generatedAt, drafter?, model?): Promise<NoticesFile>, makeClaudeDrafter(apiKey, model), DEFAULT_LLM_MODEL = 'claude-opus-5-5', TEMPLATE_GENERATOR = 'template'; npm run notices [-- --template]`

- [ ] **Step 1: Write the failing test**

Create `test/notices-data.test.ts` with exactly this content:

````ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_GENERATOR, isValidNotice, templateNotice } from '../src/lib/notices';
import type { NoticesFile, SnapshotFile } from '../src/lib/types';

const snap = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
const notices = JSON.parse(readFileSync('public/data/notices.json', 'utf8')) as NoticesFile;
const byName = new Map(snap.records.map((r) => [r.sourceName, r]));

describe('committed public/data/notices.json', () => {
  it('has one valid notice per ticket-set source', () => {
    expect(notices.schema).toBe('plumeclock.notices.v1');
    expect(Object.keys(notices.notices).sort()).toEqual([...snap.ticketSet].sort());
    for (const name of snap.ticketSet) {
      expect(isValidNotice(notices.notices[name].text, byName.get(name)!)).toBe(true);
    }
  });

  it('matches the template exactly wherever the template generated it', () => {
    for (const name of snap.ticketSet) {
      const n = notices.notices[name];
      if (n.generator === TEMPLATE_GENERATOR) expect(n.text).toBe(templateNotice(byName.get(name)!));
    }
  });
});
````

- [ ] **Step 2: Run to confirm it fails**
      Run: `npm run check -- test/notices-data.test.ts`
      Expected: FAIL — ENOENT: no such file or directory, open 'public/data/notices.json'

- [ ] **Step 3: Generate template notices**
      Run: `npm run notices -- --template`
      Expected: `notices.json: 41 notices, generator=template` (the count equals the ticket-set size)

- [ ] **Step 4: Run to confirm it passes (gate)**
      Run: `npm run check -- test/notices-data.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  2 passed (2)`

- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `data: template notices for the ticket set`

### Task 2.12: Optional: regenerate notices with Claude (human-gated, uses LLM_API_KEY)

**Files:**
- Modify: `public/data/notices.json`

**Depends on:** Task 2.11
**Effort:** low
**Model tier:** top
**Provides:** `public/data/notices.json regenerated with Claude (optional, human-gated)`
**Requires:** `public/data/notices.json (schema plumeclock.notices.v1)`

HUMAN-GATED (secret). A human or the gate-concierge runs this with their own Anthropic API key in the git-ignored `.env`; no executor ever handles the key. Skipping this task is fine: the dashboard shows `drafted by template`.

Upstream interfaces this task builds on (already committed by the tasks it depends on):

- `public/data/notices.json (schema plumeclock.notices.v1)`

- [ ] **Step 1: Prerequisite (human): put the key in .env**
      Add `LLM_API_KEY=` with your Anthropic API key to the git-ignored `.env` (copy `.env.example` first if `.env` does not exist). Never paste the key into chat or a commit.

- [ ] **Step 2: Regenerate the notices**
      Run: `npm run notices`
      Expected: `notices.json: 41 notices, generator=claude-opus-5-5` (if it prints `generator=template`, every call fell back: check the key, then stop)

- [ ] **Step 3: Count the Claude-drafted notices**
      Run: `node -e "const n=require('./public/data/notices.json').notices;const c={};for(const v of Object.values(n))c[v.generator]=(c[v.generator]||0)+1;console.log(c)"`
      Expected: `{ 'claude-opus-5-5': 41 }` (the count equals the ticket-set size). The top-level `generator` names the model as soon as one notice used it, so this per-notice count is the real check; any `template` entries fell back for that record (acceptable, but note how many).

- [ ] **Step 4: Review (human)**
      Skim `public/data/notices.json`: each notice names its source ID, states the CO2e assumption and the IMEO status, and does not speculate about the operator.

- [ ] **Step 5: Run to confirm it passes (gate)**
      Run: `npm run check -- test/notices-data.test.ts`
      Expected: PASS — tsc prints no errors; vitest reports `Test Files  1 passed (1)` and `Tests  2 passed (2)`

- [ ] **Step 6: Commit (kernel-performed — no agent runs this)**
      The orchestrator re-runs the gate, scope-checks the worktree against **Files:**, and commits exactly
      those paths (plus lockfiles) with this message. Executors never run git.
      Message: `data: Claude-drafted notices for the ticket set`

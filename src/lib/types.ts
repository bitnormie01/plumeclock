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

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

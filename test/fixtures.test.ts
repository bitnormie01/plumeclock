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

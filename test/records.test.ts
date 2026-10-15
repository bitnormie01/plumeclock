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

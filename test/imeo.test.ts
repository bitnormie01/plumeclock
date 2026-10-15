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

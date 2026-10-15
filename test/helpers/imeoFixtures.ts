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

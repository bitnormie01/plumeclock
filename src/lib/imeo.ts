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

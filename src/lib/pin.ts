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

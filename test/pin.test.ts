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

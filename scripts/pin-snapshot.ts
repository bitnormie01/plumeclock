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

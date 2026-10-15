import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSnapshotFile } from '../src/lib/fixtures';
import { PLUMES_ZIP_NAME, RESPONSE_RATE_ZIP_NAME } from '../src/lib/imeo';
import { SNAPSHOT_DIR, checkSnapshotDir } from '../src/lib/pin';
import type { Provenance } from '../src/lib/types';

checkSnapshotDir(SNAPSHOT_DIR);
const provenance = JSON.parse(readFileSync(join(SNAPSHOT_DIR, 'provenance.json'), 'utf8')) as Provenance;
const snapshot = buildSnapshotFile({
  provenance,
  plumesZip: new Uint8Array(readFileSync(join(SNAPSHOT_DIR, PLUMES_ZIP_NAME))),
  responseRateZip: new Uint8Array(readFileSync(join(SNAPSHOT_DIR, RESPONSE_RATE_ZIP_NAME))),
  generatedAt: provenance.fetchedAt,
});
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/snapshot.json', `${JSON.stringify(snapshot)}\n`);
console.log(
  `snapshot.json: ${snapshot.universeCount} records, ${snapshot.ticketSet.length} tickets, root ${snapshot.root}, ` +
    `A=${snapshot.scenario.operatorA} B=${snapshot.scenario.operatorB}`,
);

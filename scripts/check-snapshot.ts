import { SNAPSHOT_DIR, checkSnapshotDir } from '../src/lib/pin';

const check = checkSnapshotDir(SNAPSHOT_DIR);
console.log(
  `SNAPSHOT OK sources=${check.sources} plumes=${check.plumes} responseRates=${check.responseRates} lastModified="${check.lastModified}"`,
);

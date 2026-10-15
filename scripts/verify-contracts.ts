import { spawnSync } from 'node:child_process';
import { networkConfig } from '../src/lib/chain';
import { readDeployment } from '../src/lib/deploy';
import { verifyCommands } from '../src/lib/verifyCommands';

// Usage: npm run verify:contracts   (verifies the committed Base Sepolia deployment on Blockscout)
const cfg = networkConfig('base-sepolia');
const deployment = readDeployment('base-sepolia');
let failed = 0;
for (const args of verifyCommands(deployment, cfg.rpcUrl)) {
  console.log(`forge ${args.join(' ')}`);
  const result = spawnSync('forge', args, { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}
if (failed > 0) {
  console.error(`${failed} verification(s) failed; re-run npm run verify:contracts`);
  process.exit(1);
}
console.log('VERIFIED on Blockscout');

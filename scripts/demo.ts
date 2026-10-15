import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createPublicClient, http, type Chain, type PublicClient, type Transport } from 'viem';
import { anvilActors, envActors } from '../src/lib/actors';
import { networkConfig } from '../src/lib/chain';
import { deployPlumeClock, readDeployment, writeDeployment } from '../src/lib/deploy';
import { runDemo } from '../src/lib/demo';
import { fundActors } from '../src/lib/funding';
import type { DeploymentFile, SnapshotFile } from '../src/lib/types';
import { anvilWaiter, pollingWaiter } from '../src/lib/waiters';

// Usage: npm run demo -- --network anvil|base-sepolia [--deploy] [--fund] [--pause 4000]
const { values } = parseArgs({
  options: {
    network: { type: 'string', default: 'anvil' },
    deploy: { type: 'boolean', default: false },
    fund: { type: 'boolean', default: false },
    pause: { type: 'string', default: '0' },
  },
});
const cfg = networkConfig(String(values.network));
if (cfg.name !== 'anvil') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // keys may already be in the environment
  }
}
const log = (line: string) => console.log(line);
const rpcUrl = cfg.name === 'anvil' ? cfg.rpcUrl : process.env.RPC_URL?.trim() || cfg.rpcUrl;
const publicClient = createPublicClient({ chain: cfg.chain, transport: http(rpcUrl) }) as PublicClient<Transport, Chain>;
const actors = cfg.name === 'anvil' ? await anvilActors(cfg.chain, rpcUrl) : envActors(process.env, cfg.chain, rpcUrl);
const bondWei = BigInt(process.env.DEMO_BOND_WEI ?? '1000000000000000');
if (values.fund && cfg.name !== 'anvil') await fundActors(publicClient, actors, bondWei, log);
let deployment: DeploymentFile;
if (values.deploy) {
  deployment = await deployPlumeClock({
    network: cfg.name,
    rpcUrl,
    publicClient,
    actors,
    responseWindowSeconds: Number(process.env.RESPONSE_WINDOW_SECONDS ?? '180'),
    minBondWei: BigInt(process.env.MIN_BOND_WEI ?? '500000000000000'),
  });
  log(`Deployed PlumeClock ${deployment.plumeClock} -> ${writeDeployment(deployment)}`);
} else {
  deployment = readDeployment(cfg.name);
}
const snapshot = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
const run = await runDemo({
  publicClient,
  deployment,
  snapshot,
  actors,
  bondWei,
  waitForDeadline: cfg.name === 'anvil' ? anvilWaiter(cfg.chain, rpcUrl) : pollingWaiter(publicClient, log),
  log,
  pauseMs: Number(values.pause),
});
const out = `public/deployments/${cfg.name}.demo.json`;
writeFileSync(out, `${JSON.stringify(run, null, 2)}\n`);
log(`DEMO OK ${run.txs.length} transactions -> ${out}`);

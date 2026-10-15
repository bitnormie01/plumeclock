import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createPublicClient, http, type Chain, type PublicClient, type Transport } from 'viem';
import { networkConfig } from '../src/lib/chain';
import { checkDemoRun } from '../src/lib/checkDemo';
import { readDeployment } from '../src/lib/deploy';
import type { DemoRun } from '../src/lib/demo';

// Usage: npm run check:demo -- --network anvil|base-sepolia
const { values } = parseArgs({ options: { network: { type: 'string', default: 'base-sepolia' } } });
const cfg = networkConfig(String(values.network));
const deployment = readDeployment(cfg.name);
const run = JSON.parse(readFileSync(`public/deployments/${cfg.name}.demo.json`, 'utf8')) as DemoRun;
const rpcUrl = cfg.name === 'anvil' ? deployment.rpcUrl : process.env.RPC_URL?.trim() || cfg.rpcUrl;
const publicClient = createPublicClient({ chain: cfg.chain, transport: http(rpcUrl) }) as PublicClient<Transport, Chain>;
console.log(await checkDemoRun(publicClient, deployment, run));

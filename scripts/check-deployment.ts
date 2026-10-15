import { parseArgs } from 'node:util';
import { createPublicClient, http, type Chain, type PublicClient, type Transport } from 'viem';
import { networkConfig } from '../src/lib/chain';
import { checkDeployment } from '../src/lib/checkDeployment';
import { readDeployment } from '../src/lib/deploy';

// Usage: npm run check:deployment -- --network anvil|base-sepolia
const { values } = parseArgs({ options: { network: { type: 'string', default: 'base-sepolia' } } });
const cfg = networkConfig(String(values.network));
const deployment = readDeployment(cfg.name);
const rpcUrl = cfg.name === 'anvil' ? deployment.rpcUrl : process.env.RPC_URL?.trim() || cfg.rpcUrl;
const publicClient = createPublicClient({ chain: cfg.chain, transport: http(rpcUrl) }) as PublicClient<Transport, Chain>;
console.log(await checkDeployment(publicClient, deployment));

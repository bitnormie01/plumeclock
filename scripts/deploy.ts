import { parseArgs } from 'node:util';
import { createPublicClient, formatEther, http, type Chain, type PublicClient, type Transport } from 'viem';
import { KEY_ENV_VARS, anvilActors, envActors } from '../src/lib/actors';
import { networkConfig } from '../src/lib/chain';
import { deployPlumeClock, writeDeployment } from '../src/lib/deploy';

// Usage: npm run deploy -- --network anvil|base-sepolia           (base-sepolia reads keys from .env)
//        npm run deploy -- --network base-sepolia --check   (prints actor addresses and balances, sends nothing)
const { values } = parseArgs({
  options: { network: { type: 'string', default: 'anvil' }, check: { type: 'boolean', default: false } },
});
const cfg = networkConfig(String(values.network));
if (cfg.name !== 'anvil') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // keys may already be in the environment
  }
}
const rpcUrl = cfg.name === 'anvil' ? cfg.rpcUrl : process.env.RPC_URL?.trim() || cfg.rpcUrl;
const publicClient = createPublicClient({ chain: cfg.chain, transport: http(rpcUrl) }) as PublicClient<Transport, Chain>;
const actors = cfg.name === 'anvil' ? await anvilActors(cfg.chain, rpcUrl) : envActors(process.env, cfg.chain, rpcUrl);
if (values.check) {
  for (const role of Object.keys(KEY_ENV_VARS) as (keyof typeof KEY_ENV_VARS)[]) {
    const address = actors[role].account.address;
    const balance = await publicClient.getBalance({ address });
    console.log(`${role.padEnd(9)} ${address} ${formatEther(balance)} ETH`);
  }
} else {
  const deployment = await deployPlumeClock({
    network: cfg.name,
    rpcUrl,
    publicClient,
    actors,
    responseWindowSeconds: Number(process.env.RESPONSE_WINDOW_SECONDS ?? '180'),
    minBondWei: BigInt(process.env.MIN_BOND_WEI ?? '500000000000000'),
  });
  const path = writeDeployment(deployment);
  console.log(
    `DEPLOYED PlumeClock ${deployment.plumeClock} MitigationFund ${deployment.mitigationFund} on ${cfg.name} ` +
      `(block ${deployment.deployBlock}) -> ${path}`,
  );
}

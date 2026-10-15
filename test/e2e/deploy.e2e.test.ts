import { spawn, type ChildProcess } from 'node:child_process';
import { createPublicClient, http, parseEther, type Chain, type PublicClient, type Transport } from 'viem';
import { foundry } from 'viem/chains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anvilActors } from '../../src/lib/actors';
import { checkDeployment } from '../../src/lib/checkDeployment';
import { deployPlumeClock } from '../../src/lib/deploy';
import { anvilWaiter } from '../../src/lib/waiters';

const PORT = 8547;
const RPC = `http://127.0.0.1:${PORT}`;
let anvil: ChildProcess | undefined;

async function waitForRpc(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      });
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`anvil did not start on ${url}`);
}

beforeAll(async () => {
  anvil = spawn('anvil', ['--port', String(PORT), '--silent'], { stdio: 'ignore' });
  await waitForRpc(RPC);
});

afterAll(() => {
  anvil?.kill();
});

describe('deployPlumeClock on anvil', () => {
  it('deploys both contracts with the requested immutables and passes checkDeployment', async () => {
    const publicClient = createPublicClient({ chain: foundry, transport: http(RPC) }) as PublicClient<Transport, Chain>;
    const actors = await anvilActors(foundry, RPC);
    const deployment = await deployPlumeClock({
      network: 'anvil',
      rpcUrl: RPC,
      publicClient,
      actors,
      responseWindowSeconds: 180,
      minBondWei: parseEther('0.0005'),
    });
    expect(deployment).toMatchObject({
      schema: 'plumeclock.deployment.v1',
      network: 'anvil',
      chainId: 31337,
      rpcUrl: RPC,
      explorerUrl: '',
      responseWindowSeconds: 180,
      minBondWei: '500000000000000',
    });
    expect(deployment.actors.arbiter).toBe(actors.deployer.account.address);
    expect(deployment.actors.feeder).toBe(actors.feeder.account.address);
    expect(await checkDeployment(publicClient, deployment)).toBe(
      `DEPLOYMENT OK anvil PlumeClock ${deployment.plumeClock} (response window 180 s)`,
    );
    await expect(checkDeployment(publicClient, { ...deployment, responseWindowSeconds: 60 })).rejects.toThrow(
      'Deployment file does not match chain: responseWindow',
    );
  });

  it('anvilWaiter moves chain time past a deadline', async () => {
    const publicClient = createPublicClient({ chain: foundry, transport: http(RPC) }) as PublicClient<Transport, Chain>;
    const before = Number((await publicClient.getBlock()).timestamp);
    await anvilWaiter(foundry, RPC)(before + 500);
    expect(Number((await publicClient.getBlock()).timestamp)).toBeGreaterThan(before + 500);
  });
});

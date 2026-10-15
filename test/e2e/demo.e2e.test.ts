import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createPublicClient, http, parseEther, type Chain, type PublicClient, type Transport } from 'viem';
import { foundry } from 'viem/chains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mitigationFundAbi } from '../../src/lib/abi.generated';
import { anvilActors } from '../../src/lib/actors';
import { checkDemoRun } from '../../src/lib/checkDemo';
import { deployPlumeClock } from '../../src/lib/deploy';
import { runDemo } from '../../src/lib/demo';
import { fetchTickets, fetchTransitions } from '../../src/lib/readModel';
import type { SnapshotFile } from '../../src/lib/types';
import { anvilWaiter } from '../../src/lib/waiters';

const PORT = 8546;
const RPC = `http://127.0.0.1:${PORT}`;
const ZERO = '0x0000000000000000000000000000000000000000';
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

describe('PlumeClock money shot on a local anvil chain', () => {
  it('opens real IMEO tickets, resolves operator A, slashes operator B into the fund', async () => {
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
    const snapshot = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
    const lines: string[] = [];
    const run = await runDemo({
      publicClient,
      deployment,
      snapshot,
      actors,
      bondWei: parseEther('0.001'),
      waitForDeadline: anvilWaiter(foundry, RPC),
      log: (line) => lines.push(line),
    });

    const tickets = await fetchTickets(publicClient, deployment.plumeClock);
    expect(tickets).toHaveLength(snapshot.ticketSet.length);
    const a = tickets.find((t) => t.id === run.tickets.operatorA);
    const b = tickets.find((t) => t.id === run.tickets.operatorB);
    expect(a?.sourceName).toBe(snapshot.scenario.operatorA);
    expect(a?.status).toBe(3);
    expect(b?.sourceName).toBe(snapshot.scenario.operatorB);
    expect(b?.status).toBe(4);
    expect(b?.slashedAmount).toBe(parseEther('0.001'));
    for (const t of tickets.filter((x) => x.id !== a?.id && x.id !== b?.id)) {
      expect(t.status).toBe(1);
      expect(t.operator).toBe(ZERO);
    }
    expect(await publicClient.getBalance({ address: deployment.mitigationFund })).toBe(parseEther('0.001'));
    expect(
      await publicClient.readContract({
        address: deployment.mitigationFund,
        abi: mitigationFundAbi,
        functionName: 'totalReceived',
      }),
    ).toBe(parseEther('0.001'));
    const eventsA = await fetchTransitions(publicClient, deployment.plumeClock, run.tickets.operatorA);
    expect(eventsA.map((e) => e.eventName)).toEqual(['TicketOpened', 'Responded', 'Resolved']);
    const eventsB = await fetchTransitions(publicClient, deployment.plumeClock, run.tickets.operatorB);
    expect(eventsB.map((e) => e.eventName)).toEqual(['TicketOpened', 'Slashed']);
    expect(run.txs.filter((t) => t.scene === '4')).toHaveLength(1);
    expect(lines.some((l) => l.startsWith('Scene 4'))).toBe(true);
    expect(await checkDemoRun(publicClient, deployment, run)).toBe(
      `DEMO RUN OK ${snapshot.scenario.operatorA} resolved, ${snapshot.scenario.operatorB} slashed (0.001 ETH to the fund)`,
    );
  });
});

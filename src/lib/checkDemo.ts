import { formatEther, type Chain, type PublicClient, type Transport } from 'viem';
import { plumeClockAbi } from './abi.generated';
import type { DemoRun } from './demo';
import type { DeploymentFile } from './types';

function same(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Confirms a recorded demo run left operator A resolved and operator B slashed into the fund. */
export async function checkDemoRun(
  publicClient: PublicClient<Transport, Chain>,
  deployment: DeploymentFile,
  run: DemoRun,
): Promise<string> {
  if (!same(run.plumeClock, deployment.plumeClock)) throw new Error('Demo run used a different PlumeClock deployment');
  const scenes = new Set(run.txs.map((t) => t.scene));
  for (const scene of ['setup', '1', '2', '3', '4']) {
    if (!scenes.has(scene)) throw new Error(`Demo run is missing scene ${scene}`);
  }
  const getTicket = (id: `0x${string}`) =>
    publicClient.readContract({ address: deployment.plumeClock, abi: plumeClockAbi, functionName: 'getTicket', args: [id] });
  const [a, b] = await Promise.all([getTicket(run.tickets.operatorA), getTicket(run.tickets.operatorB)]);
  if (a.status !== 3) throw new Error(`Operator A ticket is status ${a.status}, expected 3 (Resolved)`);
  if (b.status !== 4) throw new Error(`Operator B ticket is status ${b.status}, expected 4 (Slashed)`);
  const fundBalance = await publicClient.getBalance({ address: deployment.mitigationFund });
  if (fundBalance < b.slashedAmount) throw new Error('Mitigation fund holds less than the slashed bond');
  return `DEMO RUN OK ${run.scenario.operatorA} resolved, ${run.scenario.operatorB} slashed (${formatEther(b.slashedAmount)} ETH to the fund)`;
}

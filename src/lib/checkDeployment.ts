import type { Chain, PublicClient, Transport } from 'viem';
import { mitigationFundAbi, plumeClockAbi } from './abi.generated';
import type { DeploymentFile } from './types';

function same(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Confirms both contracts exist and their immutables match the committed deployment file. */
export async function checkDeployment(
  publicClient: PublicClient<Transport, Chain>,
  deployment: DeploymentFile,
): Promise<string> {
  for (const [name, address] of [
    ['PlumeClock', deployment.plumeClock],
    ['MitigationFund', deployment.mitigationFund],
  ] as const) {
    const code = await publicClient.getCode({ address });
    if (!code || code === '0x') throw new Error(`No contract code for ${name} at ${address}`);
  }
  const read = <T>(functionName: 'feeder' | 'arbiter' | 'mitigationFund' | 'responseWindow' | 'minBond') =>
    publicClient.readContract({ address: deployment.plumeClock, abi: plumeClockAbi, functionName }) as Promise<T>;
  const [feeder, arbiter, fund, window, minBond] = await Promise.all([
    read<string>('feeder'),
    read<string>('arbiter'),
    read<string>('mitigationFund'),
    read<bigint>('responseWindow'),
    read<bigint>('minBond'),
  ]);
  const steward = (await publicClient.readContract({
    address: deployment.mitigationFund,
    abi: mitigationFundAbi,
    functionName: 'steward',
  })) as string;
  const mismatches: string[] = [];
  if (!same(feeder, deployment.actors.feeder)) mismatches.push('feeder');
  if (!same(arbiter, deployment.actors.arbiter)) mismatches.push('arbiter');
  if (!same(fund, deployment.mitigationFund)) mismatches.push('mitigationFund');
  if (Number(window) !== deployment.responseWindowSeconds) mismatches.push('responseWindow');
  if (minBond.toString() !== deployment.minBondWei) mismatches.push('minBond');
  if (!same(steward, deployment.actors.deployer)) mismatches.push('steward');
  if (mismatches.length > 0) throw new Error(`Deployment file does not match chain: ${mismatches.join(', ')}`);
  return `DEPLOYMENT OK ${deployment.network} PlumeClock ${deployment.plumeClock} (response window ${window} s)`;
}

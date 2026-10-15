import { parseEther, type Chain, type PublicClient, type Transport } from 'viem';
import type { ActorWallets, Wallet } from './actors';

/** Testnet only: the deployer tops up feeder and operators from faucet ETH so the demo can run. */
export async function fundActors(
  publicClient: PublicClient<Transport, Chain>,
  actors: ActorWallets,
  bondWei: bigint,
  log: (line: string) => void,
): Promise<void> {
  const targets: [string, Wallet, bigint][] = [
    ['feeder', actors.feeder, parseEther('0.003')],
    ['operatorA', actors.operatorA, bondWei + parseEther('0.002')],
    ['operatorB', actors.operatorB, bondWei + parseEther('0.002')],
  ];
  for (const [name, wallet, target] of targets) {
    const balance = await publicClient.getBalance({ address: wallet.account.address });
    if (balance >= target) continue;
    const hash = await actors.deployer.sendTransaction({ to: wallet.account.address, value: target - balance });
    await publicClient.waitForTransactionReceipt({ hash });
    log(`  funded ${name} with ${target - balance} wei (${hash})`);
  }
}

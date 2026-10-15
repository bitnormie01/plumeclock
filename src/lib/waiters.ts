import { createPublicClient, createTestClient, http, type Chain, type PublicClient, type Transport } from 'viem';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** anvil: jump chain time just past the deadline and mine a block. */
export function anvilWaiter(chain: Chain, rpcUrl: string): (deadline: number) => Promise<void> {
  const test = createTestClient({ chain, mode: 'anvil', transport: http(rpcUrl) });
  const pub = createPublicClient({ chain, transport: http(rpcUrl) });
  return async (deadline) => {
    const block = await pub.getBlock();
    const gap = deadline - Number(block.timestamp) + 1;
    if (gap > 0) await test.increaseTime({ seconds: gap });
    await test.mine({ blocks: 1 });
  };
}

/** Public testnet: wait in real time until the latest block is past the deadline. */
export function pollingWaiter(
  publicClient: PublicClient<Transport, Chain>,
  log: (line: string) => void,
  intervalMs = 5000,
): (deadline: number) => Promise<void> {
  return async (deadline) => {
    for (;;) {
      const block = await publicClient.getBlock();
      const left = deadline - Number(block.timestamp);
      if (left < 0) return;
      log(`  waiting for the deadline: ${left + 1} s of chain time left`);
      await sleep(Math.min(intervalMs, (left + 1) * 1000));
    }
  };
}

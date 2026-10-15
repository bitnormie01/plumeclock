import type { DeploymentFile } from './types';

export const BLOCKSCOUT_VERIFIER_URL = 'https://base-sepolia.blockscout.com/api/';

/** `forge verify-contract` argument lists for both contracts; constructor args are read from the chain. */
export function verifyCommands(deployment: DeploymentFile, rpcUrl: string): string[][] {
  if (deployment.network !== 'base-sepolia') throw new Error('Blockscout verification is only set up for base-sepolia');
  return [
    [deployment.plumeClock, 'contracts/src/PlumeClock.sol:PlumeClock'],
    [deployment.mitigationFund, 'contracts/src/MitigationFund.sol:MitigationFund'],
  ].map(([address, contract]) => [
    'verify-contract',
    address,
    contract,
    '--chain',
    String(deployment.chainId),
    '--rpc-url',
    rpcUrl,
    '--guess-constructor-args',
    '--verifier',
    'blockscout',
    '--verifier-url',
    BLOCKSCOUT_VERIFIER_URL,
    '--watch',
  ]);
}

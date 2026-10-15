import type { Chain } from 'viem';
import { baseSepolia, foundry } from 'viem/chains';
import type { NetworkName } from './types';

export interface NetworkConfig {
  name: NetworkName;
  chain: Chain;
  /** Public RPC endpoint; never a keyed URL (deployment files are committed). */
  rpcUrl: string;
  explorerUrl: string;
}

export const NETWORKS: Readonly<Record<NetworkName, NetworkConfig>> = {
  anvil: { name: 'anvil', chain: foundry, rpcUrl: 'http://127.0.0.1:8545', explorerUrl: '' },
  'base-sepolia': {
    name: 'base-sepolia',
    chain: baseSepolia,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://base-sepolia.blockscout.com',
  },
};

export function networkConfig(name: string): NetworkConfig {
  if (name === 'anvil' || name === 'base-sepolia') return NETWORKS[name];
  throw new Error(`Unknown network "${name}" (use anvil or base-sepolia)`);
}

export function txUrl(explorerUrl: string, hash: string): string | null {
  return explorerUrl ? `${explorerUrl}/tx/${hash}` : null;
}

export function addressUrl(explorerUrl: string, address: string): string | null {
  return explorerUrl ? `${explorerUrl}/address/${address}` : null;
}

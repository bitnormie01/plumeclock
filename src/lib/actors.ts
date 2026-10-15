import { createWalletClient, http, type Account, type Chain, type Hex, type Transport, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export type Wallet = WalletClient<Transport, Chain, Account>;

export interface ActorWallets {
  deployer: Wallet;
  feeder: Wallet;
  operatorA: Wallet;
  operatorB: Wallet;
}

/** Env var names (never values) the testnet scripts read. */
export const KEY_ENV_VARS = {
  deployer: 'DEPLOYER_PRIVATE_KEY',
  feeder: 'FEEDER_PRIVATE_KEY',
  operatorA: 'OPERATOR_A_PRIVATE_KEY',
  operatorB: 'OPERATOR_B_PRIVATE_KEY',
} as const;

function wallet(chain: Chain, rpcUrl: string, account: Account | Hex): Wallet {
  return createWalletClient({ chain, transport: http(rpcUrl), account }) as Wallet;
}

/** Anvil's unlocked default accounts 0..3, signing through the node (no keys in code). */
export async function anvilActors(chain: Chain, rpcUrl: string): Promise<ActorWallets> {
  const accounts = await createWalletClient({ chain, transport: http(rpcUrl) }).getAddresses();
  if (accounts.length < 4) throw new Error(`anvil exposes ${accounts.length} accounts; need 4`);
  return {
    deployer: wallet(chain, rpcUrl, accounts[0]),
    feeder: wallet(chain, rpcUrl, accounts[1]),
    operatorA: wallet(chain, rpcUrl, accounts[2]),
    operatorB: wallet(chain, rpcUrl, accounts[3]),
  };
}

/** Testnet actors from private keys in the environment; errors name the variable, never the value. */
export function envActors(env: Readonly<Record<string, string | undefined>>, chain: Chain, rpcUrl: string): ActorWallets {
  const load = (name: string): Account => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing ${name} (set it in the git-ignored .env file)`);
    if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`${name} must be a 0x-prefixed 32-byte hex private key`);
    return privateKeyToAccount(value as Hex);
  };
  return {
    deployer: wallet(chain, rpcUrl, load(KEY_ENV_VARS.deployer)),
    feeder: wallet(chain, rpcUrl, load(KEY_ENV_VARS.feeder)),
    operatorA: wallet(chain, rpcUrl, load(KEY_ENV_VARS.operatorA)),
    operatorB: wallet(chain, rpcUrl, load(KEY_ENV_VARS.operatorB)),
  };
}

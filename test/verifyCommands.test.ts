import { describe, expect, it } from 'vitest';
import type { DeploymentFile } from '../src/lib/types';
import { verifyCommands } from '../src/lib/verifyCommands';

const DEPLOYMENT: DeploymentFile = {
  schema: 'plumeclock.deployment.v1',
  network: 'base-sepolia',
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://base-sepolia.blockscout.com',
  plumeClock: '0x00000000000000000000000000000000000000c1',
  mitigationFund: '0x00000000000000000000000000000000000000f1',
  deployBlock: 1,
  responseWindowSeconds: 180,
  minBondWei: '500000000000000',
  actors: {
    deployer: '0x00000000000000000000000000000000000000d1',
    feeder: '0x00000000000000000000000000000000000000e1',
    arbiter: '0x00000000000000000000000000000000000000d1',
    operatorA: '0x00000000000000000000000000000000000000a1',
    operatorB: '0x00000000000000000000000000000000000000b2',
  },
  deployedAt: '2026-10-20T10:00:00.000Z',
};

describe('verifyCommands', () => {
  it('builds Blockscout forge verify-contract calls that read constructor args from the chain', () => {
    expect(verifyCommands(DEPLOYMENT, 'https://sepolia.base.org')).toEqual([
      [
        'verify-contract',
        '0x00000000000000000000000000000000000000c1',
        'contracts/src/PlumeClock.sol:PlumeClock',
        '--chain',
        '84532',
        '--rpc-url',
        'https://sepolia.base.org',
        '--guess-constructor-args',
        '--verifier',
        'blockscout',
        '--verifier-url',
        'https://base-sepolia.blockscout.com/api/',
        '--watch',
      ],
      [
        'verify-contract',
        '0x00000000000000000000000000000000000000f1',
        'contracts/src/MitigationFund.sol:MitigationFund',
        '--chain',
        '84532',
        '--rpc-url',
        'https://sepolia.base.org',
        '--guess-constructor-args',
        '--verifier',
        'blockscout',
        '--verifier-url',
        'https://base-sepolia.blockscout.com/api/',
        '--watch',
      ],
    ]);
  });

  it('refuses networks without a Blockscout setup', () => {
    expect(() => verifyCommands({ ...DEPLOYMENT, network: 'anvil' }, 'http://127.0.0.1:8545')).toThrow(
      'only set up for base-sepolia',
    );
  });
});

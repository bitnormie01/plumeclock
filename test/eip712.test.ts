import { describe, expect, it } from 'vitest';
import { recoverTypedDataAddress } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { KEY_ENV_VARS, envActors } from '../src/lib/actors';
import { attestationTypedData, disputeTypedData, plumeClockDomain } from '../src/lib/eip712';

const CONTRACT = '0x00000000000000000000000000000000000000c1';
const TICKET = '0x1111111111111111111111111111111111111111111111111111111111111111';

describe('EIP-712 typed data', () => {
  it('uses the PlumeClock v1 domain', () => {
    expect(plumeClockDomain(84532, CONTRACT)).toEqual({
      name: 'PlumeClock',
      version: '1',
      chainId: 84532,
      verifyingContract: CONTRACT,
    });
  });

  it('lists the Attestation and DisputeClaim fields in the Solidity typehash order', () => {
    const att = attestationTypedData(84532, CONTRACT, { ticketId: TICKET, cause: 'c', action: 'a', evidenceHash: TICKET });
    expect(att.primaryType).toBe('Attestation');
    expect(att.types.Attestation.map((f) => `${f.type} ${f.name}`).join(',')).toBe(
      'bytes32 ticketId,string cause,string action,bytes32 evidenceHash',
    );
    const dis = disputeTypedData(84532, CONTRACT, { ticketId: TICKET, reason: 'r', evidenceHash: TICKET });
    expect(dis.primaryType).toBe('DisputeClaim');
    expect(dis.types.DisputeClaim.map((f) => `${f.type} ${f.name}`).join(',')).toBe(
      'bytes32 ticketId,string reason,bytes32 evidenceHash',
    );
  });

  it('round-trips an operator signature', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const typed = attestationTypedData(84532, CONTRACT, {
      ticketId: TICKET,
      cause: 'Pressure-relief valve stuck open',
      action: 'Valve replaced',
      evidenceHash: TICKET,
    });
    const signature = await account.signTypedData(typed);
    expect(await recoverTypedDataAddress({ ...typed, signature })).toBe(account.address);
  });
});

describe('envActors', () => {
  const keys = () => ({
    [KEY_ENV_VARS.deployer]: generatePrivateKey(),
    [KEY_ENV_VARS.feeder]: generatePrivateKey(),
    [KEY_ENV_VARS.operatorA]: generatePrivateKey(),
    [KEY_ENV_VARS.operatorB]: generatePrivateKey(),
  });

  it('builds four wallets from the named env vars', () => {
    const env = keys();
    const actors = envActors(env, baseSepolia, 'https://sepolia.base.org');
    expect(actors.feeder.account.address).toBe(privateKeyToAccount(env.FEEDER_PRIVATE_KEY as `0x${string}`).address);
    expect(actors.operatorB.chain.id).toBe(84532);
  });

  it('names a missing variable without printing any value', () => {
    const env = { ...keys(), OPERATOR_A_PRIVATE_KEY: undefined };
    expect(() => envActors(env, baseSepolia, 'https://sepolia.base.org')).toThrow(
      'Missing OPERATOR_A_PRIVATE_KEY (set it in the git-ignored .env file)',
    );
  });

  it('rejects a malformed key and never echoes it', () => {
    const bad = '0xnot-a-key-value-12345';
    const env = { ...keys(), DEPLOYER_PRIVATE_KEY: bad };
    let message = '';
    try {
      envActors(env, baseSepolia, 'https://sepolia.base.org');
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toBe('DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex private key');
    expect(message).not.toContain(bad);
  });
});

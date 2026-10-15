import { describe, expect, it } from 'vitest';
import { addressUrl, networkConfig, txUrl } from '../src/lib/chain';
import {
  decodeSourceId,
  displayRemainingSeconds,
  formatClock,
  formatDate,
  formatEth,
  formatRate,
  formatTonnes,
  shortAddress,
  warpLabel,
} from '../src/lib/format';
import { STATUS_LABELS, displayStatus } from '../src/lib/status';

describe('chain', () => {
  it('knows anvil and Base Sepolia with public RPCs only', () => {
    expect(networkConfig('base-sepolia').chain.id).toBe(84532);
    expect(networkConfig('base-sepolia').rpcUrl).toBe('https://sepolia.base.org');
    expect(networkConfig('anvil').chain.id).toBe(31337);
    expect(() => networkConfig('mainnet')).toThrow('Unknown network "mainnet"');
  });

  it('builds Blockscout links and none without an explorer', () => {
    expect(txUrl('https://base-sepolia.blockscout.com', '0xabc')).toBe('https://base-sepolia.blockscout.com/tx/0xabc');
    expect(addressUrl('https://base-sepolia.blockscout.com', '0x1')).toBe('https://base-sepolia.blockscout.com/address/0x1');
    expect(txUrl('', '0xabc')).toBeNull();
  });
});

describe('format', () => {
  it('maps the chain response window onto a 30-day display clock', () => {
    expect(displayRemainingSeconds(180, 180)).toBe(30 * 86_400);
    expect(displayRemainingSeconds(90, 180)).toBe(15 * 86_400);
    expect(displayRemainingSeconds(-5, 180)).toBe(0);
    expect(displayRemainingSeconds(10, 0)).toBe(0);
    expect(formatClock(30 * 86_400)).toBe('30d 00h 00m');
    expect(formatClock(86_400 + 3_600 * 4 + 60 * 5 + 59)).toBe('1d 04h 05m');
    expect(warpLabel(180)).toBe('demo time-warp: 30 days = 180 s');
  });

  it('formats tonnes, rates, dates, addresses and ETH', () => {
    expect(formatTonnes(2_048_443)).toBe('2.05 Mt');
    expect(formatTonnes(48_210)).toBe('48.2 kt');
    expect(formatTonnes(530)).toBe('530 t');
    expect(formatRate(7847)).toBe('7,847 kg/h');
    expect(formatDate(1780217349)).toBe('2026-05-31');
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
    expect(formatEth(1_000_000_000_000_000n)).toBe('0.001 ETH');
  });

  it('decodes bytes32 source ids', () => {
    expect(decodeSourceId('0x4b415a5f535f3030330000000000000000000000000000000000000000000000')).toBe('KAZ_S_003');
  });
});

describe('displayStatus', () => {
  const bonded = { operator: '0x00000000000000000000000000000000000000a1', deadline: 100 };
  const unbonded = { operator: '0x0000000000000000000000000000000000000000', deadline: 100 };

  it('splits Open by bond and clock', () => {
    expect(displayStatus({ ...unbonded, status: 1 }, 50)).toBe('unbonded');
    expect(displayStatus({ ...bonded, status: 1 }, 100)).toBe('running');
    expect(displayStatus({ ...bonded, status: 1 }, 101)).toBe('overdue');
  });

  it('maps every other chain status', () => {
    expect([2, 3, 4, 5, 6].map((s) => displayStatus({ ...bonded, status: s }, 0))).toEqual([
      'responded',
      'resolved',
      'slashed',
      'disputed',
      'dismissed',
    ]);
    expect(() => displayStatus({ ...bonded, status: 0 }, 0)).toThrow('Unknown ticket status 0');
    expect(STATUS_LABELS.slashed).toBe('Slashed · bond to mitigation fund');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mitigationFundAbi, plumeClockAbi } from '../src/lib/abi.generated';

function artifactAbi(path: string): unknown {
  return (JSON.parse(readFileSync(path, 'utf8')) as { abi: unknown }).abi;
}

describe('src/lib/abi.generated.ts', () => {
  it('equals the PlumeClock Foundry artifact ABI', () => {
    expect(JSON.parse(JSON.stringify(plumeClockAbi))).toEqual(artifactAbi('contracts/out/PlumeClock.sol/PlumeClock.json'));
  });

  it('equals the MitigationFund Foundry artifact ABI', () => {
    expect(JSON.parse(JSON.stringify(mitigationFundAbi))).toEqual(
      artifactAbi('contracts/out/MitigationFund.sol/MitigationFund.json'),
    );
  });

  it('exposes every function the scripts and dashboard call', () => {
    const names = plumeClockAbi.filter((i) => i.type === 'function').map((i) => i.name);
    for (const fn of [
      'postRoot',
      'pledge',
      'withdrawBond',
      'openTicket',
      'openTickets',
      'respond',
      'dispute',
      'settleDispute',
      'resolve',
      'reopen',
      'slash',
      'getTickets',
      'getTicket',
      'ticketCount',
      'getBond',
      'rootInfo',
      'getTransitionBlocks',
      'attestationDigest',
      'hashSourceRecord',
      'responseWindow',
    ]) {
      expect(names).toContain(fn);
    }
  });
});

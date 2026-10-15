import { describe, expect, it } from 'vitest';
import { buildViewModel, clockFor, latestTicketBySource, operatorLabel } from '../src/lib/view';
import { DEPLOYMENT, OPERATOR_A, OPERATOR_B, SNAPSHOT, ZERO, ticket } from './helpers/viewFixtures';

const NOW = 1_800_000_090;

describe('latestTicketBySource', () => {
  it('keeps the most recently opened ticket per source', () => {
    const older = ticket('KAZ_S_003', { id: '0x01', openedAt: 10 });
    const newer = ticket('KAZ_S_003', { id: '0x02', openedAt: 20 });
    expect(latestTicketBySource([newer, older]).get('KAZ_S_003')?.id).toBe('0x02');
  });
});

describe('clockFor', () => {
  it('scales the remaining chain time to the 30-day clock', () => {
    const t = ticket('KAZ_S_003', { operator: OPERATOR_B });
    expect(clockFor(t, 'running', 180, NOW)).toBe('15d 00h 00m');
    expect(clockFor(t, 'overdue', 180, 1_800_000_500)).toBe('0d 00h 00m');
    expect(clockFor({ ...t, pausedRemaining: 60 }, 'disputed', 180, NOW)).toBe('10d 00h 00m (paused)');
    expect(clockFor(t, 'resolved', 180, NOW)).toBeNull();
    expect(clockFor(t, 'running', null, NOW)).toBeNull();
  });
});

describe('operatorLabel', () => {
  it('labels the simulated demo operators and hides unbonded tickets', () => {
    expect(operatorLabel(OPERATOR_A, DEPLOYMENT.actors)).toBe('Operator A (simulated)');
    expect(operatorLabel(OPERATOR_B.toUpperCase().replace('0X', '0x'), DEPLOYMENT.actors)).toBe('Operator B (simulated)');
    expect(operatorLabel(ZERO, DEPLOYMENT.actors)).toBeNull();
    expect(operatorLabel('0x1234567890abcdef1234567890abcdef12345678', null)).toBe('Self-pledged operator 0x1234…5678');
  });
});

describe('buildViewModel', () => {
  it('works in snapshot-only mode (no tickets on-chain)', () => {
    const vm = buildViewModel(SNAPSHOT, [], null, NOW);
    expect(vm.rows.map((r) => [r.sourceName, r.status])).toEqual([
      ['IRQ_S_067', null],
      ['KAZ_S_003', null],
    ]);
    expect(vm.mapTickets).toEqual([]);
    expect(vm.dots).toHaveLength(3);
    expect(vm.bubbles.map((b) => b.country)).toEqual(['Kazakhstan']);
    expect(vm.stats).toEqual({ alerts: 3, noResponsePct: 67, opened: 0, resolved: 0, slashed: 0, slashedWei: 0n });
  });

  it('joins on-chain tickets to records and summarises outcomes', () => {
    const tickets = [
      ticket('IRQ_S_067', { status: 3, operator: OPERATOR_A }),
      ticket('KAZ_S_003', { status: 4, operator: OPERATOR_B, slashedAmount: 1_000_000_000_000_000n }),
    ];
    const vm = buildViewModel(SNAPSHOT, tickets, 180, NOW);
    expect(vm.rows.map((r) => [r.sourceName, r.status])).toEqual([
      ['IRQ_S_067', 'resolved'],
      ['KAZ_S_003', 'slashed'],
    ]);
    expect(vm.mapTickets.map((t) => [t.sourceName, t.status, t.lat])).toEqual([
      ['IRQ_S_067', 'resolved', 31.43071],
      ['KAZ_S_003', 'slashed', 45.34143],
    ]);
    expect(vm.stats).toMatchObject({ opened: 2, resolved: 1, slashed: 1, slashedWei: 1_000_000_000_000_000n });
    expect(vm.dots.find((d) => d.sourceName === 'IRQ_S_067')?.responded).toBe(true);
  });
});

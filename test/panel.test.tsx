// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TicketPanel } from '../src/components/TicketPanel';
import { NOTICES, SNAPSHOT } from './helpers/viewFixtures';

afterEach(cleanup);

describe('TicketPanel', () => {
  const record = SNAPSHOT.records[1];

  it('shows IMEO facts verbatim, the CO2e assumption, the clock, history links and the notice', () => {
    const onVerify = vi.fn();
    render(
      <TicketPanel
        record={record}
        status="running"
        clock="15d 00h 00m"
        warp="demo time-warp: 30 days = 180 s"
        operatorLabel="Operator B (simulated)"
        bondWei={1_000_000_000_000_000n}
        slashedWei={0n}
        transitions={[{ eventName: 'TicketOpened', blockNumber: 7n, transactionHash: '0xabc' }]}
        explorerUrl="https://base-sepolia.blockscout.com"
        history={SNAPSHOT.histories.KAZ_S_003}
        notice={NOTICES.notices.KAZ_S_003}
        verification={{ leafMatches: true, proofValid: true, rootOnChain: true }}
        onVerify={onVerify}
      />,
    );
    expect(screen.getByTestId('imeo-status').textContent).toBe('Notified – no response received');
    expect(screen.getByText(/may not necessarily signal indifference/)).toBeTruthy();
    expect(screen.getByTestId('co2e').textContent).toBe('≈ 2.05 Mt CO2e / yr');
    expect(screen.getByText(/GWP100 29.8/)).toBeTruthy();
    expect(screen.getByTestId('clock').textContent).toContain('15d 00h 00m');
    expect(screen.getByText('Operator: Operator B (simulated)')).toBeTruthy();
    expect(screen.getByText('Bond at stake: 0.001 ETH')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'view tx' }).getAttribute('href')).toBe(
      'https://base-sepolia.blockscout.com/tx/0xabc',
    );
    expect(screen.getByTestId('notice').textContent).toBe('KAZ_S_003 notice text.');
    expect(screen.getByTestId('verification').textContent).toBe(
      '✓ leaf recomputed · ✓ Merkle proof · ✓ root posted on-chain',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Verify record against on-chain root' }));
    expect(onVerify).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardView, type DashboardViewProps } from '../src/components/DashboardView';
import { DEPLOYMENT, NOTICES, OPERATOR_A, OPERATOR_B, SNAPSHOT, ticket } from './helpers/viewFixtures';

afterEach(cleanup);

describe('DashboardView', () => {
  function props(overrides: Partial<DashboardViewProps> = {}): DashboardViewProps {
    return {
      snapshot: SNAPSHOT,
      notices: NOTICES,
      deployment: DEPLOYMENT,
      tickets: [
        ticket('IRQ_S_067', { status: 3, operator: OPERATOR_A }),
        ticket('KAZ_S_003', { status: 1, operator: OPERATOR_B }),
      ],
      responseWindowSeconds: 180,
      nowSeconds: 1_800_000_090,
      selected: 'KAZ_S_003',
      layers: { alerts: true, overlay: true },
      transitions: [],
      bondWei: 1_000_000_000_000_000n,
      verification: null,
      chainError: null,
      onSelect: () => {},
      onToggleLayer: () => {},
      onVerify: () => {},
      ...overrides,
    };
  }

  it('always shows the honesty banner and the attribution', () => {
    render(<DashboardView {...props()} />);
    expect(screen.getByRole('note').textContent).toContain('No real operator was contacted or identified.');
    expect(screen.getByRole('note').textContent).toContain('Base Sepolia testnet');
    expect(screen.getByText(/International Methane Emissions Observatory/)).toBeTruthy();
  });

  it('renders the selected ticket with its live clock and the operator label', () => {
    render(<DashboardView {...props()} />);
    expect(screen.getByRole('complementary', { name: 'Ticket KAZ_S_003' })).toBeTruthy();
    expect(screen.getAllByText('15d 00h 00m').length).toBeGreaterThan(0);
    expect(screen.getByText('Operator: Operator B (simulated)')).toBeTruthy();
  });

  it('falls back to snapshot-only mode without a deployment', () => {
    render(<DashboardView {...props({ deployment: null, tickets: [], responseWindowSeconds: null })} />);
    expect(screen.getByText('No deployment found: showing the committed snapshot only.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Verify record against on-chain root' })).toBeNull();
  });

  it('wires layer toggles', () => {
    const onToggleLayer = vi.fn();
    render(<DashboardView {...props({ onToggleLayer })} />);
    fireEvent.click(screen.getByLabelText('Country response rates'));
    expect(onToggleLayer).toHaveBeenCalledWith('overlay');
  });
});

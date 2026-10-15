// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatusBadge } from '../src/components/StatusBadge';
import { TicketList, sortRows, type TicketRow } from '../src/components/TicketList';
import { WorldMap, markerRadius, rateColor } from '../src/components/WorldMap';

afterEach(cleanup);

describe('WorldMap', () => {
  const props = {
    dots: [
      { sourceName: 'KAZ_S_003', lat: 45.3, lon: 55.2, responded: false },
      { sourceName: 'IRQ_S_067', lat: 31.4, lon: 45.7, responded: true },
    ],
    tickets: [{ sourceName: 'KAZ_S_003', lat: 45.3, lon: 55.2, status: 'running' as const, co2eTonnesPerYear: 2_048_443 }],
    bubbles: [{ country: 'Kazakhstan', lat: 45.3, lon: 55.2, ratePct: 20, sourcesNotified: 50, sourcesWithFeedback: 10 }],
  };

  it('draws land, alert dots, overlay bubbles and ticket markers', () => {
    const onSelect = vi.fn();
    render(<WorldMap {...props} showAlerts showOverlay selected="KAZ_S_003" onSelect={onSelect} />);
    expect(screen.getByRole('img', { name: /World map of PlumeClock methane tickets/ })).toBeTruthy();
    expect(screen.getAllByTestId('alert-dot')).toHaveLength(2);
    expect(screen.getAllByTestId('rr-bubble')).toHaveLength(1);
    const marker = screen.getByTestId('ticket-marker');
    expect(marker.getAttribute('class')).toBe('ticket-marker status-running selected');
    fireEvent.click(marker);
    expect(onSelect).toHaveBeenCalledWith('KAZ_S_003');
    expect(document.querySelector('.map-land')?.getAttribute('d')?.length).toBeGreaterThan(1000);
  });

  it('hides toggled-off layers', () => {
    render(<WorldMap {...props} showAlerts={false} showOverlay={false} selected={null} onSelect={() => {}} />);
    expect(screen.queryAllByTestId('alert-dot')).toHaveLength(0);
    expect(screen.queryAllByTestId('rr-bubble')).toHaveLength(0);
    expect(screen.getAllByTestId('ticket-marker')).toHaveLength(1);
  });

  it('scales markers and colours response rates', () => {
    expect(markerRadius(10_000)).toBe(4);
    expect(markerRadius(1e12)).toBe(12);
    expect(rateColor(0)).toBe('hsl(0, 70%, 45%)');
    expect(rateColor(100)).toBe('hsl(120, 70%, 45%)');
  });
});

describe('StatusBadge and TicketList', () => {
  it('labels statuses and the not-yet-opened state', () => {
    render(
      <div>
        <StatusBadge status="slashed" />
        <StatusBadge status={null} />
      </div>,
    );
    expect(screen.getByText('Slashed · bond to mitigation fund')).toBeTruthy();
    expect(screen.getByText('Committed · not opened on-chain')).toBeTruthy();
  });

  const rows: TicketRow[] = [
    { sourceName: 'IRQ_S_067', country: 'Iraq', sourceType: 'Pipeline valve', status: 'resolved', co2eTonnesPerYear: 32_237_078, score: 3, priority: 'low', clock: null },
    { sourceName: 'KAZ_S_003', country: 'Kazakhstan', sourceType: 'Compressor', status: 'running', co2eTonnesPerYear: 2_048_443, score: 83, priority: 'high', clock: '15d 00h 00m' },
  ];

  it('sorts by triage score and reports clicks', () => {
    expect(sortRows(rows).map((r) => r.sourceName)).toEqual(['KAZ_S_003', 'IRQ_S_067']);
    const onSelect = vi.fn();
    render(<TicketList rows={rows} selected="KAZ_S_003" onSelect={onSelect} />);
    const listed = screen.getAllByTestId('ticket-row');
    expect(within(listed[0]).getByText('KAZ_S_003')).toBeTruthy();
    expect(within(listed[0]).getByText('15d 00h 00m')).toBeTruthy();
    expect(within(listed[0]).getByText('high (83)')).toBeTruthy();
    fireEvent.click(listed[1]);
    expect(onSelect).toHaveBeenCalledWith('IRQ_S_067');
  });
});

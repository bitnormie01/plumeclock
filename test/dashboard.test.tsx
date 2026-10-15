// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard, resolveNetwork } from '../src/components/Dashboard';
import { NOTICES, SNAPSHOT } from './helpers/viewFixtures';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(files: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const hit = Object.keys(files).find((suffix) => input.endsWith(suffix));
      return hit ? new Response(JSON.stringify(files[hit])) : new Response('missing', { status: 404 });
    }),
  );
}

describe('Dashboard data loading', () => {
  it('shows the committed snapshot when no deployment file exists, selecting operator B first', async () => {
    stubFetch({ '/data/snapshot.json': SNAPSHOT, '/data/notices.json': NOTICES });
    render(<Dashboard />);
    expect(await screen.findByText('No deployment found: showing the committed snapshot only.')).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Ticket KAZ_S_003' })).toBeTruthy();
    expect(screen.getByTestId('notice').textContent).toBe('KAZ_S_003 notice text.');
  });

  it('lets ?network= pick anvil or base-sepolia and ignores anything else', () => {
    expect(resolveNetwork('?network=anvil')).toBe('anvil');
    expect(resolveNetwork('?network=base-sepolia')).toBe('base-sepolia');
    expect(resolveNetwork('?network=mainnet')).toBe('base-sepolia');
    expect(resolveNetwork('')).toBe('base-sepolia');
  });

  it('reports a missing snapshot instead of crashing', async () => {
    stubFetch({});
    render(<Dashboard />);
    expect(await screen.findByText('Could not load PlumeClock data: public/data/snapshot.json is missing')).toBeTruthy();
  });
});

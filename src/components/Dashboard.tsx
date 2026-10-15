'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { networkConfig } from '../lib/chain';
import {
  fetchBondAmount,
  fetchResponseWindow,
  fetchRootKind,
  fetchTickets,
  fetchTransitions,
  makeReadClient,
  verifyRecord,
  type TicketView,
  type TransitionEvent,
  type Verification,
} from '../lib/readModel';
import type { DeploymentFile, NoticesFile, SnapshotFile } from '../lib/types';
import { latestTicketBySource } from '../lib/view';
import { DashboardView, type Layers } from './DashboardView';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? 'base-sepolia';
const POLL_MS = 4000;

async function loadJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE_PATH}${path}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** `?network=anvil` (or base-sepolia) overrides the build-time NEXT_PUBLIC_NETWORK. */
export function resolveNetwork(search: string): string {
  const fromQuery = new URLSearchParams(search).get('network');
  return fromQuery === 'anvil' || fromQuery === 'base-sepolia' ? fromQuery : NETWORK;
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<SnapshotFile | null>(null);
  const [notices, setNotices] = useState<NoticesFile | null>(null);
  const [deployment, setDeployment] = useState<DeploymentFile | null>(null);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [responseWindow, setResponseWindow] = useState<number | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [selected, setSelected] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>({ alerts: true, overlay: true });
  const [transitions, setTransitions] = useState<TransitionEvent[]>([]);
  const [bondWei, setBondWei] = useState<bigint | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadJson<SnapshotFile>('/data/snapshot.json'),
      loadJson<NoticesFile>('/data/notices.json'),
      loadJson<DeploymentFile>(`/deployments/${resolveNetwork(window.location.search)}.json`),
    ])
      .then(([s, n, d]) => {
        if (!s) throw new Error('public/data/snapshot.json is missing');
        setSnapshot(s);
        setNotices(n);
        setDeployment(d);
        setSelected(s.scenario.operatorB);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const client = useMemo(() => {
    if (!deployment) return null;
    const rpc = process.env.NEXT_PUBLIC_RPC_URL || deployment.rpcUrl;
    return makeReadClient(networkConfig(deployment.network).chain, rpc);
  }, [deployment]);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!client || !deployment) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const [list, window] = await Promise.all([
          fetchTickets(client, deployment.plumeClock),
          fetchResponseWindow(client, deployment.plumeClock),
        ]);
        if (cancelled) return;
        setTickets(list);
        setResponseWindow(window);
        setChainError(null);
      } catch (e) {
        if (!cancelled) setChainError(e instanceof Error ? e.message.split('\n')[0] : String(e));
      }
    };
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, deployment]);

  const selectedTicket = selected ? latestTicketBySource(tickets).get(selected) ?? null : null;
  const ticketKey = selectedTicket ? `${selectedTicket.id}:${selectedTicket.status}:${selectedTicket.deadline}` : '';

  useEffect(() => {
    setVerification(null);
    if (!client || !deployment || !selectedTicket) {
      setTransitions([]);
      setBondWei(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchTransitions(client, deployment.plumeClock, selectedTicket.id),
      fetchBondAmount(client, deployment.plumeClock, selectedTicket.sourceId),
    ])
      .then(([events, bond]) => {
        if (cancelled) return;
        setTransitions(events);
        setBondWei(selectedTicket.operator === '0x0000000000000000000000000000000000000000' ? null : bond);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // ticketKey captures every field of selectedTicket that the effect reads
  }, [client, deployment, ticketKey]);

  const onVerify = useCallback(() => {
    if (!snapshot || !selected || !client || !deployment) return;
    const record = snapshot.records.find((r) => r.sourceName === selected);
    const proof = snapshot.proofs[selected];
    if (!record || !proof) return;
    void verifyRecord(record, proof, snapshot.root, () =>
      fetchRootKind(client, deployment.plumeClock, snapshot.root),
    ).then(setVerification);
  }, [snapshot, selected, client, deployment]);

  if (loadError) return <p className="warning">Could not load PlumeClock data: {loadError}</p>;
  if (!snapshot) return <p className="muted">Loading PlumeClock…</p>;

  return (
    <DashboardView
      snapshot={snapshot}
      notices={notices}
      deployment={deployment}
      tickets={tickets}
      responseWindowSeconds={responseWindow}
      nowSeconds={now}
      selected={selected}
      layers={layers}
      transitions={transitions}
      bondWei={bondWei}
      verification={verification}
      chainError={chainError}
      onSelect={(name) => setSelected(name)}
      onToggleLayer={(layer) => setLayers((l) => ({ ...l, [layer]: !l[layer] }))}
      onVerify={onVerify}
    />
  );
}

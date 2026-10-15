import type { MapBubble, MapDot, MapTicket } from '../components/WorldMap';
import type { TicketRow } from '../components/TicketList';
import { displayRemainingSeconds, formatClock } from './format';
import type { TicketView } from './readModel';
import { displayStatus, type DisplayStatus } from './status';
import type { DeploymentActors, SnapshotFile, SnapshotRecord } from './types';

export interface DashboardStats {
  alerts: number;
  noResponsePct: number;
  opened: number;
  resolved: number;
  slashed: number;
  slashedWei: bigint;
}

export interface ViewModel {
  rows: TicketRow[];
  mapTickets: MapTicket[];
  dots: MapDot[];
  bubbles: MapBubble[];
  stats: DashboardStats;
}

/** The most recently opened on-chain ticket per source. */
export function latestTicketBySource(tickets: readonly TicketView[]): Map<string, TicketView> {
  const out = new Map<string, TicketView>();
  for (const t of tickets) {
    const prev = out.get(t.sourceName);
    if (!prev || t.openedAt >= prev.openedAt) out.set(t.sourceName, t);
  }
  return out;
}

/** Display countdown for a running clock, or the frozen remainder of a disputed one. */
export function clockFor(
  ticket: TicketView,
  status: DisplayStatus,
  responseWindowSeconds: number | null,
  nowSeconds: number,
): string | null {
  if (responseWindowSeconds === null) return null;
  if (status === 'running' || status === 'overdue') {
    return formatClock(displayRemainingSeconds(ticket.deadline - nowSeconds, responseWindowSeconds));
  }
  if (status === 'disputed') {
    return `${formatClock(displayRemainingSeconds(ticket.pausedRemaining, responseWindowSeconds))} (paused)`;
  }
  return null;
}

export function operatorLabel(operator: string, actors: DeploymentActors | null): string | null {
  const op = operator.toLowerCase();
  if (op === '0x0000000000000000000000000000000000000000') return null;
  if (actors && op === actors.operatorA.toLowerCase()) return 'Operator A (simulated)';
  if (actors && op === actors.operatorB.toLowerCase()) return 'Operator B (simulated)';
  return `Self-pledged operator ${operator.slice(0, 6)}…${operator.slice(-4)}`;
}

function isNoResponse(r: SnapshotRecord): boolean {
  return r.feedbackLabel === 'Notified – no response received';
}

export function buildViewModel(
  snapshot: SnapshotFile,
  tickets: readonly TicketView[],
  responseWindowSeconds: number | null,
  nowSeconds: number,
): ViewModel {
  const byName = new Map(snapshot.records.map((r) => [r.sourceName, r]));
  const latest = latestTicketBySource(tickets);
  const rows: TicketRow[] = [];
  const mapTickets: MapTicket[] = [];
  for (const name of snapshot.ticketSet) {
    const rec = byName.get(name);
    if (!rec) continue;
    const ticket = latest.get(name);
    const status = ticket ? displayStatus(ticket, nowSeconds) : null;
    rows.push({
      sourceName: name,
      country: rec.country,
      sourceType: rec.sourceType,
      status,
      co2eTonnesPerYear: rec.co2eTonnesPerYear,
      score: rec.triage.score,
      priority: rec.triage.priority,
      clock: ticket && status ? clockFor(ticket, status, responseWindowSeconds, nowSeconds) : null,
    });
    if (ticket && status) {
      mapTickets.push({
        sourceName: name,
        lat: rec.latE5 / 1e5,
        lon: rec.lonE5 / 1e5,
        status,
        co2eTonnesPerYear: rec.co2eTonnesPerYear,
      });
    }
  }
  const dots: MapDot[] = snapshot.records.map((r) => ({
    sourceName: r.sourceName,
    lat: r.latE5 / 1e5,
    lon: r.lonE5 / 1e5,
    responded: !isNoResponse(r),
  }));
  const bubbles: MapBubble[] = snapshot.responseRates.flatMap((rr) =>
    rr.lat === null || rr.lon === null
      ? []
      : [
          {
            country: rr.country,
            lat: rr.lat,
            lon: rr.lon,
            ratePct: rr.ratePct,
            sourcesNotified: rr.sourcesNotified,
            sourcesWithFeedback: rr.sourcesWithFeedback,
          },
        ],
  );
  const noResponse = snapshot.records.filter(isNoResponse).length;
  return {
    rows,
    mapTickets,
    dots,
    bubbles,
    stats: {
      alerts: snapshot.records.length,
      noResponsePct: snapshot.records.length === 0 ? 0 : Math.round((noResponse / snapshot.records.length) * 100),
      opened: tickets.length,
      resolved: tickets.filter((t) => t.status === 3).length,
      slashed: tickets.filter((t) => t.status === 4).length,
      slashedWei: tickets.reduce((sum, t) => sum + t.slashedAmount, 0n),
    },
  };
}

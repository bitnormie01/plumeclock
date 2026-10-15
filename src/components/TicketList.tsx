import { formatTonnes } from '../lib/format';
import type { DisplayStatus } from '../lib/status';
import type { Priority } from '../lib/types';
import { StatusBadge } from './StatusBadge';

export interface TicketRow {
  sourceName: string;
  country: string;
  sourceType: string;
  status: DisplayStatus | null;
  co2eTonnesPerYear: number;
  score: number;
  priority: Priority;
  clock: string | null;
}

export interface TicketListProps {
  rows: TicketRow[];
  selected: string | null;
  onSelect: (sourceName: string) => void;
}

/** Highest triage score first; ties by source name. */
export function sortRows(rows: readonly TicketRow[]): TicketRow[] {
  return [...rows].sort((a, b) => b.score - a.score || (a.sourceName < b.sourceName ? -1 : 1));
}

export function TicketList({ rows, selected, onSelect }: TicketListProps) {
  return (
    <table className="ticket-list">
      <thead>
        <tr>
          <th>Source</th>
          <th>Status</th>
          <th>Clock</th>
          <th>CO2e/yr if it persists</th>
          <th>Triage</th>
        </tr>
      </thead>
      <tbody>
        {sortRows(rows).map((r) => (
          <tr
            key={r.sourceName}
            data-testid="ticket-row"
            className={selected === r.sourceName ? 'selected' : undefined}
            onClick={() => onSelect(r.sourceName)}
          >
            <td>
              <strong>{r.sourceName}</strong>
              <br />
              <small>
                {r.sourceType} · {r.country}
              </small>
            </td>
            <td>
              <StatusBadge status={r.status} />
            </td>
            <td className="mono">{r.clock ?? '—'}</td>
            <td>{formatTonnes(r.co2eTonnesPerYear)}</td>
            <td className={`priority priority-${r.priority}`}>
              {r.priority} ({r.score})
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

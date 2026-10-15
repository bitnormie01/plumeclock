import { STATUS_LABELS, type DisplayStatus } from '../lib/status';

export function StatusBadge({ status }: { status: DisplayStatus | null }) {
  if (status === null) return <span className="badge status-none">Committed · not opened on-chain</span>;
  return <span className={`badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}

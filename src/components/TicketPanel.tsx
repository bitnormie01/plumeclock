import { txUrl } from '../lib/chain';
import { GWP100 } from '../lib/co2e';
import { IMEO_RESPONSE_CAVEAT } from '../lib/feedback';
import { formatDate, formatEth, formatRate, formatTonnes } from '../lib/format';
import type { TransitionEvent, Verification } from '../lib/readModel';
import type { DisplayStatus } from '../lib/status';
import type { Notice, PlumeHistoryEntry, SnapshotRecord } from '../lib/types';
import { StatusBadge } from './StatusBadge';

export interface TicketPanelProps {
  record: SnapshotRecord;
  status: DisplayStatus | null;
  clock: string | null;
  warp: string | null;
  operatorLabel: string | null;
  bondWei: bigint | null;
  slashedWei: bigint | null;
  transitions: TransitionEvent[];
  explorerUrl: string;
  history: PlumeHistoryEntry[];
  notice: Notice | null;
  verification: Verification | null;
  onVerify: (() => void) | null;
}

function check(ok: boolean): string {
  return ok ? '✓' : '✗';
}

export function TicketPanel(props: TicketPanelProps) {
  const { record } = props;
  return (
    <aside className="ticket-panel" aria-label={`Ticket ${record.sourceName}`}>
      <h2>{record.sourceName}</h2>
      <p className="muted">
        {record.sourceType} · {record.country} · {record.sector}
      </p>

      <section>
        <h3>IMEO detection (verbatim)</h3>
        <dl>
          <dt>Last plume</dt>
          <dd>
            {formatRate(record.rateKgPerHour)} on {formatDate(record.lastPlumeAt)}
          </dd>
          <dt>Plumes attributed</dt>
          <dd>{record.plumeCount}</dd>
          <dt>Persistency</dt>
          <dd>{record.persistency}</dd>
          <dt>IMEO status</dt>
          <dd data-testid="imeo-status">{record.feedbackLabel}</dd>
        </dl>
        <p className="caveat">IMEO: “{IMEO_RESPONSE_CAVEAT}”</p>
      </section>

      <section>
        <h3>Climate stakes</h3>
        <p className="big" data-testid="co2e">
          ≈ {formatTonnes(record.co2eTonnesPerYear)} CO2e / yr
        </p>
        <p className="muted">
          if it persists at the last-detected rate all year · GWP100 {GWP100} (IPCC AR6, fossil CH4)
        </p>
      </section>

      <section>
        <h3>PlumeClock ticket</h3>
        <StatusBadge status={props.status} />
        {props.clock && (
          <p className="clock" data-testid="clock">
            {props.clock} <small>{props.warp}</small>
          </p>
        )}
        {props.operatorLabel && <p>Operator: {props.operatorLabel}</p>}
        {props.bondWei !== null && props.bondWei > 0n && <p>Bond at stake: {formatEth(props.bondWei)}</p>}
        {props.slashedWei !== null && props.slashedWei > 0n && (
          <p className="slashed">Slashed to mitigation fund: {formatEth(props.slashedWei)}</p>
        )}
        {props.transitions.length > 0 && (
          <ol className="transitions">
            {props.transitions.map((t) => {
              const url = txUrl(props.explorerUrl, t.transactionHash);
              return (
                <li key={`${t.transactionHash}-${t.eventName}`} data-testid="transition">
                  {t.eventName} · block {t.blockNumber.toString()}{' '}
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      view tx
                    </a>
                  ) : (
                    <code>{t.transactionHash.slice(0, 10)}…</code>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {props.onVerify && (
          <button type="button" onClick={props.onVerify}>
            Verify record against on-chain root
          </button>
        )}
        {props.verification && (
          <p className="verification" data-testid="verification">
            {check(props.verification.leafMatches)} leaf recomputed · {check(props.verification.proofValid)} Merkle
            proof · {check(props.verification.rootOnChain)} root posted on-chain
          </p>
        )}
      </section>

      {props.notice && (
        <section>
          <h3>AI plume analyst</h3>
          <p data-testid="notice">{props.notice.text}</p>
          <p className="muted">
            Triage {record.triage.priority} ({record.triage.score}/100) = impact {record.triage.impact} × persistence{' '}
            {record.triage.persistenceWeight} × response {record.triage.responseFactor} · drafted by{' '}
            {props.notice.generator}
          </p>
        </section>
      )}

      {props.history.length > 0 && (
        <section>
          <h3>Plume history (newest first)</h3>
          <ul className="history">
            {props.history.map((h) => (
              <li key={h.plumeId}>
                {formatDate(h.observedAt)} · {h.rateKgPerHour === null ? 'not quantified' : formatRate(h.rateKgPerHour)}{' '}
                · {h.satellite}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

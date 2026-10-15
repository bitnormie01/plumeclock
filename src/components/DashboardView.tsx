import { formatEth, warpLabel } from '../lib/format';
import type { TicketView, TransitionEvent, Verification } from '../lib/readModel';
import { displayStatus } from '../lib/status';
import type { DeploymentFile, NoticesFile, SnapshotFile } from '../lib/types';
import { buildViewModel, clockFor, latestTicketBySource, operatorLabel } from '../lib/view';
import { TicketList } from './TicketList';
import { TicketPanel } from './TicketPanel';
import { WorldMap } from './WorldMap';

export interface Layers {
  alerts: boolean;
  overlay: boolean;
}

export interface DashboardViewProps {
  snapshot: SnapshotFile;
  notices: NoticesFile | null;
  deployment: DeploymentFile | null;
  tickets: TicketView[];
  responseWindowSeconds: number | null;
  nowSeconds: number;
  selected: string | null;
  layers: Layers;
  transitions: TransitionEvent[];
  bondWei: bigint | null;
  verification: Verification | null;
  chainError: string | null;
  onSelect: (sourceName: string) => void;
  onToggleLayer: (layer: keyof Layers) => void;
  onVerify: () => void;
}

export function DashboardView(props: DashboardViewProps) {
  const { snapshot, deployment, tickets, responseWindowSeconds, nowSeconds, selected } = props;
  const vm = buildViewModel(snapshot, tickets, responseWindowSeconds, nowSeconds);
  const record = selected ? snapshot.records.find((r) => r.sourceName === selected) ?? null : null;
  const ticket = record ? latestTicketBySource(tickets).get(record.sourceName) ?? null : null;
  const status = ticket ? displayStatus(ticket, nowSeconds) : null;
  const network = deployment?.network === 'anvil' ? 'local anvil' : 'Base Sepolia testnet';

  return (
    <div className="dashboard">
      <header>
        <h1>PlumeClock</h1>
        <p className="tagline">
          Every satellite-detected methane super-emitter gets an on-chain ticket with a public response clock.
        </p>
        <p className="banner" role="note">
          Real UNEP IMEO MARS detections (snapshot {snapshot.referenceDate}). Operators, bonds, attestations and
          re-observation replays are simulated on {network}. No real operator was contacted or identified.
        </p>
        <ul className="stats">
          <li>
            <strong>{vm.stats.alerts.toLocaleString('en-US')}</strong> notified super-emitters committed on-chain
          </li>
          <li>
            <strong>{vm.stats.noResponsePct}%</strong> with no response received (IMEO)
          </li>
          <li>
            <strong>{vm.stats.opened}</strong> tickets opened · <strong>{vm.stats.resolved}</strong> resolved ·{' '}
            <strong>{vm.stats.slashed}</strong> slashed ({formatEth(vm.stats.slashedWei)} to the mitigation fund)
          </li>
        </ul>
        {!deployment && <p className="warning">No deployment found: showing the committed snapshot only.</p>}
        {props.chainError && <p className="warning">Chain unreachable, retrying: {props.chainError}</p>}
      </header>

      <main>
        <section className="map-section">
          <div className="layer-toggles">
            <label>
              <input type="checkbox" checked={props.layers.alerts} onChange={() => props.onToggleLayer('alerts')} />{' '}
              IMEO alerts
            </label>
            <label>
              <input type="checkbox" checked={props.layers.overlay} onChange={() => props.onToggleLayer('overlay')} />{' '}
              Country response rates
            </label>
            {responseWindowSeconds !== null && <span className="muted">{warpLabel(responseWindowSeconds)}</span>}
          </div>
          <WorldMap
            dots={vm.dots}
            tickets={vm.mapTickets}
            bubbles={vm.bubbles}
            showAlerts={props.layers.alerts}
            showOverlay={props.layers.overlay}
            selected={selected}
            onSelect={props.onSelect}
          />
          <TicketList rows={vm.rows} selected={selected} onSelect={props.onSelect} />
        </section>
        {record ? (
          <TicketPanel
            record={record}
            status={status}
            clock={ticket && status ? clockFor(ticket, status, responseWindowSeconds, nowSeconds) : null}
            warp={responseWindowSeconds !== null ? warpLabel(responseWindowSeconds) : null}
            operatorLabel={ticket ? operatorLabel(ticket.operator, deployment?.actors ?? null) : null}
            bondWei={props.bondWei}
            slashedWei={ticket ? ticket.slashedAmount : null}
            transitions={props.transitions}
            explorerUrl={deployment?.explorerUrl ?? ''}
            history={snapshot.histories[record.sourceName] ?? []}
            notice={props.notices?.notices[record.sourceName] ?? null}
            verification={props.verification}
            onVerify={deployment && snapshot.proofs[record.sourceName] ? props.onVerify : null}
          />
        ) : (
          <aside className="ticket-panel empty">Select a ticket on the map or in the list.</aside>
        )}
      </main>

      <footer>
        <p>{snapshot.provenance.attribution}</p>
        <p className="mono">Snapshot root {snapshot.root}</p>
      </footer>
    </div>
  );
}

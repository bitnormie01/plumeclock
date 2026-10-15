import { co2eTonnesPerYear } from './co2e';
import { feedbackLabel } from './feedback';
import { PLUMES_ZIP_NAME, parsePlumesZip, parseResponseRateZip, type PlumeRow } from './imeo';
import { buildTree, getProof, hashSourceRecord } from './merkle';
import {
  buildUniverse,
  parseImeoTimestamp,
  referenceDateFromLastModified,
  selectRecent,
  selectScenario,
  selectTicketSet,
  type NamedRecord,
} from './records';
import { triage } from './triage';
import type { PlumeHistoryEntry, Provenance, ResponseRate, SnapshotFile, SnapshotRecord } from './types';

export const HISTORY_LIMIT = 20;

export interface FixtureInput {
  provenance: Provenance;
  plumesZip: Uint8Array;
  responseRateZip: Uint8Array;
  generatedAt: string;
}

function toSnapshotRecord(r: NamedRecord): SnapshotRecord {
  const co2e = co2eTonnesPerYear(r.rateKgPerHour);
  const label = feedbackLabel(r.feedbackOperator, r.feedbackGovernment);
  return {
    ...r,
    leaf: hashSourceRecord(r),
    co2eTonnesPerYear: co2e,
    feedbackLabel: label,
    triage: triage(co2e, r.persistency, label),
  };
}

function historyFor(sourceName: string, plumes: readonly PlumeRow[]): PlumeHistoryEntry[] {
  return plumes
    .filter((p) => p.source_name === sourceName)
    .map((p) => ({
      plumeId: p.id_plume,
      observedAt: parseImeoTimestamp(p.tile_date),
      rateKgPerHour: p.ch4_fluxrate.trim() === '' ? null : Math.round(Number(p.ch4_fluxrate)),
      satellite: p.satellite,
    }))
    .sort((a, b) => b.observedAt - a.observedAt)
    .slice(0, HISTORY_LIMIT);
}

/** Pinned IMEO zips -> public/data/snapshot.json content (pure: same inputs, same output). */
export function buildSnapshotFile(input: FixtureInput): SnapshotFile {
  const plumesFile = input.provenance.files.find((f) => f.name === PLUMES_ZIP_NAME);
  if (!plumesFile) throw new Error(`provenance lacks ${PLUMES_ZIP_NAME}`);
  const { sources, plumes } = parsePlumesZip(input.plumesZip);
  const rates = parseResponseRateZip(input.responseRateZip);
  const referenceDate = referenceDateFromLastModified(plumesFile.lastModified);
  const universe = buildUniverse(sources, plumes);
  if (universe.length === 0) throw new Error('Empty universe: no notified Oil and Gas sources with a flux rate');
  const recent = selectRecent(universe, referenceDate);
  const scenario = selectScenario(recent);
  const ticketSet = selectTicketSet(recent, scenario);
  const records = universe.map(toSnapshotRecord);
  const tree = buildTree(records.map((r) => r.leaf));
  const byName = new Map(records.map((r) => [r.sourceName, r]));
  const proofs: Record<string, `0x${string}`[]> = {};
  const histories: Record<string, PlumeHistoryEntry[]> = {};
  for (const name of ticketSet) {
    const rec = byName.get(name);
    if (!rec) throw new Error(`Ticket-set source ${name} missing from universe`);
    proofs[name] = getProof(tree, rec.leaf);
    histories[name] = historyFor(name, plumes);
  }
  const responseRates: ResponseRate[] = rates.rows.map((row) => {
    const inCountry = records.filter((r) => r.country === row.country);
    const mean = (xs: number[]) => (xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1e3) / 1e3);
    return {
      country: row.country,
      from: row.notification_date_from,
      until: row.notification_date_until,
      sourcesNotified: Number(row.n_sources_notified),
      sourcesWithFeedback: Number(row.n_sources_notified_feedback),
      ratePct: Number(row['response_rate (%)']),
      lat: mean(inCountry.map((r) => r.latE5 / 1e5)),
      lon: mean(inCountry.map((r) => r.lonE5 / 1e5)),
    };
  });
  return {
    schema: 'plumeclock.snapshot.v1',
    generatedAt: input.generatedAt,
    provenance: input.provenance,
    referenceDate,
    root: tree.root,
    universeCount: records.length,
    records,
    ticketSet,
    proofs,
    scenario,
    histories,
    responseRates,
  };
}

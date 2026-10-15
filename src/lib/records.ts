import type { PlumeRow, SourceRow } from './imeo';
import { sourceIdFromName } from './merkle';
import type { SourceRecord } from './types';

/** A snapshot record plus its IMEO source_name. */
export type NamedRecord = SourceRecord & { sourceName: string };

const IMEO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/** IMEO 'YYYY-MM-DDTHH:MM:SS' (UTC, 19 chars) -> unix seconds. */
export function parseImeoTimestamp(value: string): number {
  if (!IMEO_TIMESTAMP.test(value)) throw new Error(`Unexpected IMEO timestamp: "${value}"`);
  return Date.parse(`${value}Z`) / 1000;
}

/** Decimal degrees -> int32 degrees * 1e5. */
export function toE5(value: string): number {
  const n = Math.round(Number(value) * 1e5);
  if (!Number.isFinite(n) || value.trim() === '' || n > 0x7fffffff || n < -0x80000000) {
    throw new Error(`Not a coordinate: "${value}"`);
  }
  return n;
}

/** UTC date (YYYY-MM-DD) of an HTTP Last-Modified header. */
export function referenceDateFromLastModified(lastModified: string): string {
  const ms = Date.parse(lastModified);
  if (Number.isNaN(ms)) throw new Error(`Bad Last-Modified: "${lastModified}"`);
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildSourceRecord(src: SourceRow, lastPlume: PlumeRow): NamedRecord {
  const rate = Math.round(Number(lastPlume.ch4_fluxrate));
  if (lastPlume.ch4_fluxrate.trim() === '' || !Number.isFinite(rate) || rate < 0 || rate > 0xffffffff) {
    throw new Error(`Source ${src.source_name}: last plume has no usable ch4_fluxrate`);
  }
  const plumeCount = Number(src.n_plumes_detected);
  if (!Number.isInteger(plumeCount) || plumeCount < 0) {
    throw new Error(`Source ${src.source_name}: bad n_plumes_detected "${src.n_plumes_detected}"`);
  }
  return {
    sourceName: src.source_name,
    sourceId: sourceIdFromName(src.source_name),
    lastPlumeId: src.id_last_plume,
    lastPlumeAt: parseImeoTimestamp(src.last_plume_date),
    rateKgPerHour: rate,
    plumeCount,
    latE5: toE5(src.lat),
    lonE5: toE5(src.lon),
    country: src.country,
    sector: src.sector,
    sourceType: src.source_type,
    persistency: src.persistency_category,
    notified: src.notified,
    feedbackOperator: src.feedback_operator,
    feedbackGovernment: src.feedback_government,
  };
}

/**
 * Universe U: MARS-notified Oil and Gas sources whose last plume has a quantified ch4_fluxrate,
 * sorted by source_name.
 */
export function buildUniverse(sources: readonly SourceRow[], plumes: readonly PlumeRow[]): NamedRecord[] {
  const plumeById = new Map<string, PlumeRow>();
  for (const p of plumes) plumeById.set(p.id_plume, p);
  const out: NamedRecord[] = [];
  for (const s of sources) {
    if (s.sector !== 'Oil and Gas' || s.notified !== 'Yes') continue;
    const last = plumeById.get(s.id_last_plume);
    if (!last || last.ch4_fluxrate.trim() === '') continue;
    out.push(buildSourceRecord(s, last));
  }
  return out.sort((a, b) => (a.sourceName < b.sourceName ? -1 : a.sourceName > b.sourceName ? 1 : 0));
}

/** Recent R: universe records whose last plume is within `days` before the reference date. */
export function selectRecent(universe: readonly NamedRecord[], referenceDate: string, days = 365): NamedRecord[] {
  const cutoff = Date.parse(`${referenceDate}T00:00:00Z`) / 1000 - days * 86_400;
  return universe.filter((r) => r.lastPlumeAt >= cutoff);
}

function byRateDesc(a: NamedRecord, b: NamedRecord): number {
  if (a.rateKgPerHour !== b.rateKgPerHour) return b.rateKgPerHour - a.rateKgPerHour;
  return a.sourceName < b.sourceName ? -1 : a.sourceName > b.sourceName ? 1 : 0;
}

export interface Scenario {
  operatorA: string;
  operatorB: string;
}

/**
 * A: operator responded, persistency absent, >= 2 plumes (the "fixed" story IMEO's data supports).
 * B: no response from operator or government, persistency persistent (IMEO-published silence).
 */
export function selectScenario(recent: readonly NamedRecord[]): Scenario {
  const a = recent
    .filter((r) => r.feedbackOperator === 'Yes' && r.persistency === 'absent' && r.plumeCount >= 2)
    .sort(byRateDesc)[0];
  if (!a) throw new Error('No candidate for operator A (operator responded, absent, >= 2 plumes)');
  const b = recent
    .filter((r) => r.feedbackOperator === 'No' && r.feedbackGovernment === 'No' && r.persistency === 'persistent')
    .sort(byRateDesc)[0];
  if (!b) throw new Error('No candidate for operator B (no response, persistent)');
  return { operatorA: a.sourceName, operatorB: b.sourceName };
}

/** Top `topN` recent records by rate, plus the scenario sources if not already included. */
export function selectTicketSet(recent: readonly NamedRecord[], scenario: Scenario, topN = 40): string[] {
  const names = [...recent].sort(byRateDesc).slice(0, topN).map((r) => r.sourceName);
  for (const s of [scenario.operatorA, scenario.operatorB]) {
    if (!names.includes(s)) names.push(s);
  }
  return names;
}

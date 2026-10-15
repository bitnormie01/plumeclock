import { createPublicClient, http, type Chain, type Hex, type PublicClient, type Transport } from 'viem';
import { plumeClockAbi } from './abi.generated';
import { decodeSourceId } from './format';
import { buildTree, hashSourceRecord, verifyProof } from './merkle';
import type { SnapshotRecord } from './types';

export interface TicketView {
  id: Hex;
  sourceId: Hex;
  sourceName: string;
  snapshotRoot: Hex;
  operator: Hex;
  status: number;
  rateKgPerHour: number;
  reopenCount: number;
  lastPlumeAt: number;
  openedAt: number;
  deadline: number;
  respondedAt: number;
  closedAt: number;
  pausedRemaining: number;
  co2eTonnesPerYear: bigint;
  slashedAmount: bigint;
}

/** Shape viem returns for one Solidity `Ticket` struct. */
export interface RawTicket {
  id: Hex;
  sourceId: Hex;
  snapshotRoot: Hex;
  operator: Hex;
  status: number;
  rateKgPerHour: number;
  reopenCount: number;
  lastPlumeAt: bigint;
  openedAt: bigint;
  deadline: bigint;
  respondedAt: bigint;
  closedAt: bigint;
  pausedRemaining: bigint;
  co2eTonnesPerYear: bigint;
  slashedAmount: bigint;
}

export function toTicketView(raw: RawTicket): TicketView {
  return {
    id: raw.id,
    sourceId: raw.sourceId,
    sourceName: decodeSourceId(raw.sourceId),
    snapshotRoot: raw.snapshotRoot,
    operator: raw.operator,
    status: raw.status,
    rateKgPerHour: raw.rateKgPerHour,
    reopenCount: raw.reopenCount,
    lastPlumeAt: Number(raw.lastPlumeAt),
    openedAt: Number(raw.openedAt),
    deadline: Number(raw.deadline),
    respondedAt: Number(raw.respondedAt),
    closedAt: Number(raw.closedAt),
    pausedRemaining: Number(raw.pausedRemaining),
    co2eTonnesPerYear: raw.co2eTonnesPerYear,
    slashedAmount: raw.slashedAmount,
  };
}

export type ReadClient = PublicClient<Transport, Chain>;

export function makeReadClient(chain: Chain, rpcUrl: string): ReadClient {
  return createPublicClient({ chain, transport: http(rpcUrl) }) as ReadClient;
}

const PAGE = 200n;

export async function fetchTickets(client: ReadClient, address: Hex): Promise<TicketView[]> {
  const out: TicketView[] = [];
  for (let start = 0n; ; start += PAGE) {
    const page = (await client.readContract({
      address,
      abi: plumeClockAbi,
      functionName: 'getTickets',
      args: [start, PAGE],
    })) as readonly RawTicket[];
    out.push(...page.map(toTicketView));
    if (BigInt(page.length) < PAGE) return out;
  }
}

export async function fetchBondAmount(client: ReadClient, address: Hex, sourceId: Hex): Promise<bigint> {
  const bond = (await client.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'getBond',
    args: [sourceId],
  })) as { operator: Hex; amount: bigint };
  return bond.amount;
}

export async function fetchResponseWindow(client: ReadClient, address: Hex): Promise<number> {
  const w = await client.readContract({ address, abi: plumeClockAbi, functionName: 'responseWindow' });
  return Number(w);
}

/** 0 None, 1 Snapshot, 2 Reobservation. */
export async function fetchRootKind(client: ReadClient, address: Hex, root: Hex): Promise<number> {
  const info = (await client.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'rootInfo',
    args: [root],
  })) as { kind: number; postedAt: bigint };
  return info.kind;
}

export interface TransitionEvent {
  eventName: string;
  blockNumber: bigint;
  transactionHash: Hex;
}

/** Every state-change event of one ticket, read with one-block log queries. */
export async function fetchTransitions(client: ReadClient, address: Hex, ticketId: Hex): Promise<TransitionEvent[]> {
  const blocks = (await client.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'getTransitionBlocks',
    args: [ticketId],
  })) as readonly bigint[];
  const unique = [...new Set(blocks.map((b) => BigInt(b)))];
  const out: TransitionEvent[] = [];
  for (const block of unique) {
    const logs = await client.getContractEvents({ address, abi: plumeClockAbi, fromBlock: block, toBlock: block });
    for (const log of logs) {
      const args = (log as unknown as { args?: { ticketId?: Hex } }).args;
      if (args?.ticketId?.toLowerCase() !== ticketId.toLowerCase()) continue;
      out.push({ eventName: log.eventName, blockNumber: log.blockNumber, transactionHash: log.transactionHash });
    }
  }
  return out;
}

export interface Verification {
  leafMatches: boolean;
  proofValid: boolean;
  rootOnChain: boolean;
}

/** Recompute the leaf from the record fields, check its proof, and confirm the root on-chain. */
export async function verifyRecord(
  record: SnapshotRecord,
  proof: readonly Hex[],
  root: Hex,
  rootKindOnChain: () => Promise<number>,
): Promise<Verification> {
  const leaf = hashSourceRecord(record);
  return {
    leafMatches: leaf === record.leaf,
    proofValid: verifyProof(leaf, proof, root),
    rootOnChain: (await rootKindOnChain()) === 1,
  };
}

/** Root over every snapshot leaf (lets the UI show the committed root without trusting the file). */
export function recomputeRoot(records: readonly SnapshotRecord[]): Hex {
  return buildTree(records.map((r) => r.leaf)).root;
}

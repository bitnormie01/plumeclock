import { describe, expect, it } from 'vitest';
import {
  createPublicClient,
  custom,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  type Hex,
} from 'viem';
import { foundry } from 'viem/chains';
import { plumeClockAbi } from '../src/lib/abi.generated';
import { hashSourceRecord, sourceIdFromName } from '../src/lib/merkle';
import {
  fetchBondAmount,
  fetchResponseWindow,
  fetchRootKind,
  fetchTickets,
  fetchTransitions,
  toTicketView,
  verifyRecord,
  type RawTicket,
  type ReadClient,
} from '../src/lib/readModel';
import type { SnapshotRecord } from '../src/lib/types';

const CONTRACT: Hex = '0x00000000000000000000000000000000000000c1';
const TICKET_ID: Hex = '0x1111111111111111111111111111111111111111111111111111111111111111';
const TX: Hex = '0x2222222222222222222222222222222222222222222222222222222222222222';

const RAW: RawTicket = {
  id: TICKET_ID,
  sourceId: sourceIdFromName('KAZ_S_003'),
  snapshotRoot: '0x00000000000000000000000000000000000000000000000000000000000000aa',
  operator: '0x00000000000000000000000000000000000000b2',
  status: 1,
  rateKgPerHour: 7847,
  reopenCount: 0,
  lastPlumeAt: 1780217349n,
  openedAt: 1800000000n,
  deadline: 1800000180n,
  respondedAt: 0n,
  closedAt: 0n,
  pausedRemaining: 0n,
  co2eTonnesPerYear: 2048443n,
  slashedAmount: 0n,
};

/** A fake JSON-RPC node that answers PlumeClock reads with ABI-encoded results. */
function fakeClient(): ReadClient {
  return createPublicClient({
    chain: foundry,
    transport: custom({
      async request({ method, params }) {
        if (method === 'eth_chainId') return '0x7a69';
        if (method === 'eth_call') {
          const [{ data }] = params as [{ data: Hex }];
          const call = decodeFunctionData({ abi: plumeClockAbi, data });
          switch (call.functionName) {
            case 'getTickets':
              return encodeFunctionResult({ abi: plumeClockAbi, functionName: 'getTickets', result: [RAW] });
            case 'getBond':
              return encodeFunctionResult({
                abi: plumeClockAbi,
                functionName: 'getBond',
                result: { operator: RAW.operator, amount: 1_000_000_000_000_000n },
              });
            case 'responseWindow':
              return encodeFunctionResult({ abi: plumeClockAbi, functionName: 'responseWindow', result: 180n });
            case 'rootInfo':
              return encodeFunctionResult({
                abi: plumeClockAbi,
                functionName: 'rootInfo',
                result: { kind: 1, postedAt: 1800000000n },
              });
            case 'getTransitionBlocks':
              return encodeFunctionResult({
                abi: plumeClockAbi,
                functionName: 'getTransitionBlocks',
                result: [7n, 7n, 9n],
              });
            default:
              throw new Error(`unexpected call ${call.functionName}`);
          }
        }
        if (method === 'eth_getLogs') {
          const [{ fromBlock }] = params as [{ fromBlock: Hex }];
          const topics = encodeEventTopics({
            abi: plumeClockAbi,
            eventName: fromBlock === '0x7' ? 'TicketOpened' : 'Slashed',
            args: fromBlock === '0x7'
              ? { ticketId: TICKET_ID, sourceId: RAW.sourceId, operator: RAW.operator }
              : { ticketId: TICKET_ID, operator: RAW.operator },
          });
          const data =
            fromBlock === '0x7'
              ? encodeAbiParameters(
                  [{ type: 'bytes32' }, { type: 'uint64' }, { type: 'uint32' }, { type: 'uint256' }],
                  [RAW.snapshotRoot, 1800000180n, 7847, 2048443n],
                )
              : encodeAbiParameters(
                  [{ type: 'uint256' }, { type: 'address' }],
                  [1_000_000_000_000_000n, '0x00000000000000000000000000000000000000f1'],
                );
          return [
            {
              address: CONTRACT,
              topics,
              data,
              blockNumber: fromBlock,
              transactionHash: TX,
              transactionIndex: '0x0',
              blockHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
              logIndex: '0x0',
              removed: false,
            },
          ];
        }
        throw new Error(`unexpected RPC ${method}`);
      },
    }),
  }) as ReadClient;
}

describe('toTicketView', () => {
  it('decodes the source name and converts uint64 fields to numbers', () => {
    expect(toTicketView(RAW)).toMatchObject({
      sourceName: 'KAZ_S_003',
      lastPlumeAt: 1780217349,
      deadline: 1800000180,
      co2eTonnesPerYear: 2048443n,
    });
  });
});

describe('chain reads against a fake node', () => {
  const client = fakeClient();

  it('pages tickets, bonds, the response window and root kinds', async () => {
    const tickets = await fetchTickets(client, CONTRACT);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].sourceName).toBe('KAZ_S_003');
    expect(await fetchBondAmount(client, CONTRACT, RAW.sourceId)).toBe(1_000_000_000_000_000n);
    expect(await fetchResponseWindow(client, CONTRACT)).toBe(180);
    expect(await fetchRootKind(client, CONTRACT, RAW.snapshotRoot)).toBe(1);
  });

  it('reads one-block logs for each distinct transition block', async () => {
    expect(await fetchTransitions(client, CONTRACT, TICKET_ID)).toEqual([
      { eventName: 'TicketOpened', blockNumber: 7n, transactionHash: TX },
      { eventName: 'Slashed', blockNumber: 9n, transactionHash: TX },
    ]);
  });
});

describe('verifyRecord', () => {
  const base = {
    sourceName: 'KAZ_S_003',
    sourceId: sourceIdFromName('KAZ_S_003'),
    lastPlumeId: 'p-kaz-1',
    lastPlumeAt: 1780217349,
    rateKgPerHour: 7847,
    plumeCount: 23,
    latE5: 4534143,
    lonE5: 5519165,
    country: 'Kazakhstan',
    sector: 'Oil and Gas',
    sourceType: 'Transmission Compressor Station',
    persistency: 'persistent',
    notified: 'Yes',
    feedbackOperator: 'No',
    feedbackGovernment: 'No',
    co2eTonnesPerYear: 2048443,
    feedbackLabel: 'Notified – no response received',
    triage: { score: 83, priority: 'high', impact: 0.828, persistenceWeight: 1, responseFactor: 1 },
  } as const;
  const leaf = hashSourceRecord(base);
  const record: SnapshotRecord = { ...base, leaf };

  it('passes all three checks for an untouched record whose root is on-chain', async () => {
    expect(await verifyRecord(record, [], leaf, async () => 1)).toEqual({
      leafMatches: true,
      proofValid: true,
      rootOnChain: true,
    });
  });

  it('flags a tampered field and a root that is not a snapshot root', async () => {
    const tampered: SnapshotRecord = { ...record, feedbackOperator: 'Yes' };
    expect(await verifyRecord(tampered, [], leaf, async () => 2)).toEqual({
      leafMatches: false,
      proofValid: false,
      rootOnChain: false,
    });
  });
});

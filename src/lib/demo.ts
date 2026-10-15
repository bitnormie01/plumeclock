import { encodeAbiParameters, keccak256, toHex, type Chain, type Hex, type PublicClient, type Transport } from 'viem';
import { plumeClockAbi } from './abi.generated';
import type { ActorWallets } from './actors';
import { txUrl } from './chain';
import { attestationTypedData } from './eip712';
import { buildTree, getProof, hashReobservation, toAbiReobservation, toAbiSourceRecord } from './merkle';
import type { DeploymentFile, Reobservation, SnapshotFile, SnapshotRecord } from './types';

export const SNAPSHOT_ROOT_KIND = 1;
export const REOBSERVATION_ROOT_KIND = 2;
export const OPEN_BATCH = 10;

export interface DemoTx {
  scene: string;
  label: string;
  hash: Hex;
  url: string | null;
}

export interface DemoRun {
  schema: 'plumeclock.demo-run.v1';
  network: string;
  plumeClock: Hex;
  snapshotRoot: Hex;
  reobservationRoot: Hex;
  tickets: { operatorA: Hex; operatorB: Hex };
  scenario: { operatorA: string; operatorB: string };
  txs: DemoTx[];
  finishedAt: string;
}

export interface DemoContext {
  publicClient: PublicClient<Transport, Chain>;
  deployment: DeploymentFile;
  snapshot: SnapshotFile;
  actors: ActorWallets;
  bondWei: bigint;
  /** Resolves once chain time is past `deadline` (anvil: warp; testnet: wait). */
  waitForDeadline: (deadline: number) => Promise<void>;
  log: (line: string) => void;
  pauseMs?: number;
}

export function ticketIdFor(sourceId: Hex, lastPlumeAt: number): Hex {
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'uint64' }], [sourceId, BigInt(lastPlumeAt)]));
}

/** Replayed pass from IMEO persistency: persistent/frequent = plume, absent/sporadic = none, undetermined omitted. */
export function replayedObservations(
  records: readonly SnapshotRecord[],
  observedAt: number,
  referenceDate: string,
): Reobservation[] {
  const out: Reobservation[] = [];
  for (const r of records) {
    const category = r.persistency.toLowerCase();
    if (category === 'undetermined') continue;
    out.push({
      sourceId: r.sourceId,
      observedAt,
      plumeDetected: category === 'persistent' || category === 'frequent',
      basis: `IMEO persistency_category=${r.persistency} (snapshot ${referenceDate}); replayed for the demo`,
    });
  }
  return out;
}

function recordFor(snapshot: SnapshotFile, sourceName: string): SnapshotRecord {
  const rec = snapshot.records.find((r) => r.sourceName === sourceName);
  if (!rec) throw new Error(`Snapshot has no record ${sourceName}`);
  return rec;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs setup + the four money-shot scenes against a fresh deployment. */
export async function runDemo(ctx: DemoContext): Promise<DemoRun> {
  const { publicClient, deployment, snapshot, actors, log } = ctx;
  const address = deployment.plumeClock;
  const txs: DemoTx[] = [];

  const confirm = async (scene: string, label: string, hash: Hex) => {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${label} reverted (${hash})`);
    const url = txUrl(deployment.explorerUrl, hash);
    txs.push({ scene, label, hash, url });
    log(`  [${scene}] ${label}: ${url ?? hash}`);
  };
  const pause = async () => {
    if (ctx.pauseMs && ctx.pauseMs > 0) await sleep(ctx.pauseMs);
  };

  const a = recordFor(snapshot, snapshot.scenario.operatorA);
  const b = recordFor(snapshot, snapshot.scenario.operatorB);
  const ticketA = ticketIdFor(a.sourceId, a.lastPlumeAt);
  const ticketB = ticketIdFor(b.sourceId, b.lastPlumeAt);
  const plumesSha = snapshot.provenance.files.find((f) => f.name.includes('plumes'))?.sha256 ?? 'unknown';

  log('Setup: operators pledge bonds, the feeder posts the IMEO snapshot root, background tickets open');
  await confirm(
    'setup',
    `Operator A pledges for ${a.sourceName}`,
    await actors.operatorA.writeContract({
      address,
      abi: plumeClockAbi,
      functionName: 'pledge',
      args: [a.sourceId],
      value: ctx.bondWei,
    }),
  );
  await confirm(
    'setup',
    `Operator B pledges for ${b.sourceName}`,
    await actors.operatorB.writeContract({
      address,
      abi: plumeClockAbi,
      functionName: 'pledge',
      args: [b.sourceId],
      value: ctx.bondWei,
    }),
  );
  await confirm(
    'setup',
    `Feeder posts snapshot root (${snapshot.universeCount} IMEO records)`,
    await actors.feeder.writeContract({
      address,
      abi: plumeClockAbi,
      functionName: 'postRoot',
      args: [snapshot.root, SNAPSHOT_ROOT_KIND, `plumeclock:imeo:${snapshot.referenceDate}:sha256=${plumesSha}`],
    }),
  );
  const background = snapshot.ticketSet
    .filter((n) => n !== a.sourceName && n !== b.sourceName)
    .map((n) => recordFor(snapshot, n));
  for (let i = 0; i < background.length; i += OPEN_BATCH) {
    const batch = background.slice(i, i + OPEN_BATCH);
    await confirm(
      'setup',
      `Open ${batch.length} background tickets`,
      await actors.feeder.writeContract({
        address,
        abi: plumeClockAbi,
        functionName: 'openTickets',
        args: [snapshot.root, batch.map(toAbiSourceRecord), batch.map((r) => snapshot.proofs[r.sourceName])],
      }),
    );
  }
  await pause();

  log(`Scene 1: real super-emitters ${a.sourceName} and ${b.sourceName} open tickets with a 30-day clock`);
  await confirm(
    '1',
    `Open tickets for ${a.sourceName} and ${b.sourceName}`,
    await actors.feeder.writeContract({
      address,
      abi: plumeClockAbi,
      functionName: 'openTickets',
      args: [
        snapshot.root,
        [toAbiSourceRecord(a), toAbiSourceRecord(b)],
        [snapshot.proofs[a.sourceName], snapshot.proofs[b.sourceName]],
      ],
    }),
  );
  await pause();

  log(`Scene 2: Operator A signs an EIP-712 repair attestation for ${a.sourceName}`);
  const message = {
    ticketId: ticketA,
    cause: 'Pressure-relief valve stuck open (simulated operator statement)',
    action: 'Valve replaced and line re-pressurised (simulated operator statement)',
    evidenceHash: keccak256(toHex(`PlumeClock demo evidence for ${a.sourceName}`)),
  };
  const signature = await actors.operatorA.signTypedData(attestationTypedData(deployment.chainId, address, message));
  await confirm(
    '2',
    `Operator A responds to ${a.sourceName}`,
    await actors.operatorA.writeContract({
      address,
      abi: plumeClockAbi,
      functionName: 'respond',
      args: [ticketA, message, signature],
    }),
  );
  await pause();

  log(`Scene 3: the replayed satellite pass shows no plume at ${a.sourceName}; the ticket resolves`);
  const responded = await publicClient.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'getTicket',
    args: [ticketA],
  });
  const latest = await publicClient.getBlock();
  const observedAt = Math.max(Number(responded.respondedAt) + 1, Number(latest.timestamp));
  const observations = replayedObservations(
    snapshot.ticketSet.map((n) => recordFor(snapshot, n)),
    observedAt,
    snapshot.referenceDate,
  );
  const obsA = observations.find((o) => o.sourceId === a.sourceId);
  if (!obsA || obsA.plumeDetected) throw new Error(`Replay for ${a.sourceName} must show no plume`);
  const obsTree = buildTree(observations.map(hashReobservation));
  await confirm(
    '3',
    `Feeder posts replayed re-observation root (${observations.length} sources)`,
    await actors.feeder.writeContract({
      address,
      abi: plumeClockAbi,
      functionName: 'postRoot',
      args: [obsTree.root, REOBSERVATION_ROOT_KIND, `plumeclock:replay:${snapshot.referenceDate}`],
    }),
  );
  await confirm(
    '3',
    `Resolve ${a.sourceName} (no plume on re-observation)`,
    await actors.feeder.writeContract({
      address,
      abi: plumeClockAbi,
      functionName: 'resolve',
      args: [ticketA, obsTree.root, toAbiReobservation(obsA), getProof(obsTree, hashReobservation(obsA))],
    }),
  );
  await pause();

  log('Scene 4: Operator B stays silent; when the clock hits zero anyone can slash');
  const silent = await publicClient.readContract({
    address,
    abi: plumeClockAbi,
    functionName: 'getTicket',
    args: [ticketB],
  });
  await ctx.waitForDeadline(Number(silent.deadline));
  await confirm(
    '4',
    `Slash ${b.sourceName}: bond to the mitigation fund`,
    await actors.feeder.writeContract({ address, abi: plumeClockAbi, functionName: 'slash', args: [ticketB] }),
  );

  return {
    schema: 'plumeclock.demo-run.v1',
    network: deployment.network,
    plumeClock: address,
    snapshotRoot: snapshot.root,
    reobservationRoot: obsTree.root,
    tickets: { operatorA: ticketA, operatorB: ticketB },
    scenario: snapshot.scenario,
    txs,
    finishedAt: new Date().toISOString(),
  };
}

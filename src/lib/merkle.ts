import { concat, encodeAbiParameters, keccak256, stringToHex, type Hex } from 'viem';
import type { Reobservation, SourceRecord } from './types';

/** ABI tuple of Solidity `SourceRecord`; order and types must match contracts/src/PlumeTypes.sol. */
export const sourceRecordAbiParameter = {
  type: 'tuple',
  components: [
    { name: 'sourceId', type: 'bytes32' },
    { name: 'lastPlumeId', type: 'string' },
    { name: 'lastPlumeAt', type: 'uint64' },
    { name: 'rateKgPerHour', type: 'uint32' },
    { name: 'plumeCount', type: 'uint32' },
    { name: 'latE5', type: 'int32' },
    { name: 'lonE5', type: 'int32' },
    { name: 'country', type: 'string' },
    { name: 'sector', type: 'string' },
    { name: 'sourceType', type: 'string' },
    { name: 'persistency', type: 'string' },
    { name: 'notified', type: 'string' },
    { name: 'feedbackOperator', type: 'string' },
    { name: 'feedbackGovernment', type: 'string' },
  ],
} as const;

/** ABI tuple of Solidity `Reobservation`. */
export const reobservationAbiParameter = {
  type: 'tuple',
  components: [
    { name: 'sourceId', type: 'bytes32' },
    { name: 'observedAt', type: 'uint64' },
    { name: 'plumeDetected', type: 'bool' },
    { name: 'basis', type: 'string' },
  ],
} as const;

/** IMEO source_name -> bytes32 (ASCII, right-padded). Throws on non-ASCII or > 32 bytes. */
export function sourceIdFromName(sourceName: string): Hex {
  if (!/^[\x20-\x7e]{1,32}$/.test(sourceName)) throw new Error(`Invalid source name: ${sourceName}`);
  return stringToHex(sourceName, { size: 32 });
}

/** Viem-ready struct value (uint64 as bigint, extra JSON keys dropped). */
export function toAbiSourceRecord(rec: SourceRecord) {
  return {
    sourceId: rec.sourceId,
    lastPlumeId: rec.lastPlumeId,
    lastPlumeAt: BigInt(rec.lastPlumeAt),
    rateKgPerHour: rec.rateKgPerHour,
    plumeCount: rec.plumeCount,
    latE5: rec.latE5,
    lonE5: rec.lonE5,
    country: rec.country,
    sector: rec.sector,
    sourceType: rec.sourceType,
    persistency: rec.persistency,
    notified: rec.notified,
    feedbackOperator: rec.feedbackOperator,
    feedbackGovernment: rec.feedbackGovernment,
  };
}

export function toAbiReobservation(obs: Reobservation) {
  return {
    sourceId: obs.sourceId,
    observedAt: BigInt(obs.observedAt),
    plumeDetected: obs.plumeDetected,
    basis: obs.basis,
  };
}

/** Same as Solidity PlumeBase.hashSourceRecord: keccak256(bytes.concat(keccak256(abi.encode(rec)))). */
export function hashSourceRecord(rec: SourceRecord): Hex {
  return keccak256(keccak256(encodeAbiParameters([sourceRecordAbiParameter], [toAbiSourceRecord(rec)])));
}

/** Same as Solidity PlumeBase.hashReobservation. */
export function hashReobservation(obs: Reobservation): Hex {
  return keccak256(keccak256(encodeAbiParameters([reobservationAbiParameter], [toAbiReobservation(obs)])));
}

/** OpenZeppelin Hashes.commutativeKeccak256: hash of the sorted pair. */
export function hashPair(a: Hex, b: Hex): Hex {
  return BigInt(a) < BigInt(b) ? keccak256(concat([a, b])) : keccak256(concat([b, a]));
}

export interface MerkleTree {
  root: Hex;
  /** layers[0] = leaves sorted ascending; last layer = [root]. */
  layers: Hex[][];
}

function compareHex(a: Hex, b: Hex): number {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Sorted leaves, sorted-pair hashing, odd node carried up unchanged (OZ MerkleProof compatible). */
export function buildTree(leaves: readonly Hex[]): MerkleTree {
  if (leaves.length === 0) throw new Error('Merkle tree needs at least one leaf');
  const layers: Hex[][] = [[...leaves].map((l) => l.toLowerCase() as Hex).sort(compareHex)];
  while (layers[layers.length - 1].length > 1) {
    const level = layers[layers.length - 1];
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

export function getProof(tree: MerkleTree, leaf: Hex): Hex[] {
  let index = tree.layers[0].indexOf(leaf.toLowerCase() as Hex);
  if (index < 0) throw new Error(`Leaf not in tree: ${leaf}`);
  const proof: Hex[] = [];
  for (let depth = 0; depth < tree.layers.length - 1; depth++) {
    const level = tree.layers[depth];
    const sibling = index ^ 1;
    if (sibling < level.length) proof.push(level[sibling]);
    index = index >> 1;
  }
  return proof;
}

export function verifyProof(leaf: Hex, proof: readonly Hex[], root: Hex): boolean {
  let computed = leaf.toLowerCase() as Hex;
  for (const p of proof) computed = hashPair(computed, p);
  return computed === root.toLowerCase();
}

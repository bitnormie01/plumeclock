import { describe, expect, it } from 'vitest';
import { keccak256, toHex, type Hex } from 'viem';
import {
  buildTree,
  getProof,
  hashPair,
  hashReobservation,
  hashSourceRecord,
  sourceIdFromName,
  verifyProof,
} from '../src/lib/merkle';
import type { SourceRecord } from '../src/lib/types';

/** Same records as contracts/test/utils/Fixtures.sol; the hashes are pinned on both sides. */
const VECTOR_1: SourceRecord = {
  sourceId: sourceIdFromName('KAZ_S_003'),
  lastPlumeId: 'vector-plume-0001',
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
};
const VECTOR_2: SourceRecord = {
  sourceId: sourceIdFromName('TUR_S_001'),
  lastPlumeId: 'vector-plume-0002',
  lastPlumeAt: 1764547200,
  rateKgPerHour: 1234,
  plumeCount: 2,
  latE5: -3612345,
  lonE5: -6479417,
  country: 'Türkiye',
  sector: 'Oil and Gas',
  sourceType: 'O&G facility (generic)',
  persistency: 'absent',
  notified: 'Yes',
  feedbackOperator: 'Yes',
  feedbackGovernment: 'No',
};
const VECTOR_LEAF_1 = '0x03921c0a78d6b85dd4afdaa1a5b4ff9676991b7e5af8774a5cebca375f6d094a';
const VECTOR_LEAF_2 = '0x50fdc75c9872748f4f6ee30bd066ebd6a409b3429851eac4445aa05f28b6e5fd';
const VECTOR_OBS_LEAF = '0x9e1589fa9a7eace672605a7d660c811852cc42a340a900be64706f57f44b71e3';
const VECTOR_ROOT_2 = '0x581f67a5b8e3a132a67656b87d49e7116dab748d0f308c4a8bf916946162f8a7';

describe('cross-language vectors (must equal contracts/test/utils/Fixtures.sol)', () => {
  it('hashes SourceRecord like Solidity abi.encode(struct) with double keccak', () => {
    expect(hashSourceRecord(VECTOR_1)).toBe(VECTOR_LEAF_1);
    expect(hashSourceRecord(VECTOR_2)).toBe(VECTOR_LEAF_2);
  });

  it('hashes Reobservation like Solidity', () => {
    expect(
      hashReobservation({
        sourceId: sourceIdFromName('KAZ_S_003'),
        observedAt: 1790000000,
        plumeDetected: false,
        basis: 'vector re-observation',
      }),
    ).toBe(VECTOR_OBS_LEAF);
  });

  it('builds the same two-leaf root', () => {
    const tree = buildTree([VECTOR_LEAF_1, VECTOR_LEAF_2]);
    expect(tree.root).toBe(VECTOR_ROOT_2);
    expect(getProof(tree, VECTOR_LEAF_1)).toEqual([VECTOR_LEAF_2]);
  });
});

describe('sourceIdFromName', () => {
  it('right-pads ASCII to bytes32', () => {
    expect(sourceIdFromName('KAZ_S_003')).toBe('0x4b415a5f535f3030330000000000000000000000000000000000000000000000');
  });

  it('rejects names that do not fit', () => {
    expect(() => sourceIdFromName('')).toThrow('Invalid source name');
    expect(() => sourceIdFromName('x'.repeat(33))).toThrow('Invalid source name');
  });
});

describe('buildTree / getProof / verifyProof', () => {
  const leaves = Array.from({ length: 7 }, (_, i) => keccak256(toHex(`leaf-${i}`)));

  it('proves every leaf of an odd-sized tree', () => {
    const tree = buildTree(leaves);
    for (const leaf of leaves) {
      expect(verifyProof(leaf, getProof(tree, leaf), tree.root)).toBe(true);
    }
  });

  it('is independent of input order', () => {
    expect(buildTree([...leaves].reverse()).root).toBe(buildTree(leaves).root);
  });

  it('uses the leaf itself as the root of a one-leaf tree', () => {
    const tree = buildTree([leaves[0]]);
    expect(tree.root).toBe(leaves[0]);
    expect(getProof(tree, leaves[0])).toEqual([]);
  });

  it('rejects a wrong proof and unknown leaves', () => {
    const tree = buildTree(leaves);
    expect(verifyProof(leaves[0], getProof(tree, leaves[1]), tree.root)).toBe(false);
    expect(() => getProof(tree, keccak256(toHex('missing')))).toThrow('Leaf not in tree');
    expect(() => buildTree([])).toThrow('at least one leaf');
  });

  it('hashes pairs commutatively', () => {
    const [a, b] = leaves as [Hex, Hex];
    expect(hashPair(a, b)).toBe(hashPair(b, a));
  });
});

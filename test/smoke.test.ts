import { describe, expect, it } from 'vitest';
import { keccak256, toHex } from 'viem';

describe('toolchain smoke', () => {
  it('resolves viem and agrees on keccak256 for string and bytes input', () => {
    expect(keccak256(toHex('leaf'))).toBe(keccak256(new TextEncoder().encode('leaf')));
  });
});

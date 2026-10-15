import type { Hex } from 'viem';

/** Must match PlumeBase's EIP712("PlumeClock", "1") constructor. */
export function plumeClockDomain(chainId: number, verifyingContract: Hex) {
  return { name: 'PlumeClock', version: '1', chainId, verifyingContract } as const;
}

/** Must match PlumeResponses.ATTESTATION_TYPEHASH field order. */
export const attestationTypes = {
  Attestation: [
    { name: 'ticketId', type: 'bytes32' },
    { name: 'cause', type: 'string' },
    { name: 'action', type: 'string' },
    { name: 'evidenceHash', type: 'bytes32' },
  ],
} as const;

/** Must match PlumeResponses.DISPUTE_TYPEHASH field order. */
export const disputeTypes = {
  DisputeClaim: [
    { name: 'ticketId', type: 'bytes32' },
    { name: 'reason', type: 'string' },
    { name: 'evidenceHash', type: 'bytes32' },
  ],
} as const;

export interface AttestationMessage {
  ticketId: Hex;
  cause: string;
  action: string;
  evidenceHash: Hex;
}

export interface DisputeMessage {
  ticketId: Hex;
  reason: string;
  evidenceHash: Hex;
}

export function attestationTypedData(chainId: number, verifyingContract: Hex, message: AttestationMessage) {
  return {
    domain: plumeClockDomain(chainId, verifyingContract),
    types: attestationTypes,
    primaryType: 'Attestation' as const,
    message,
  };
}

export function disputeTypedData(chainId: number, verifyingContract: Hex, message: DisputeMessage) {
  return {
    domain: plumeClockDomain(chainId, verifyingContract),
    types: disputeTypes,
    primaryType: 'DisputeClaim' as const,
    message,
  };
}

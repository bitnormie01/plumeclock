import { formatEther, hexToString, type Hex } from 'viem';

/** The dashboard renders every response window as IMEO's 30-calendar-day feedback request. */
export const DISPLAY_CLOCK_DAYS = 30;

/** Remaining chain seconds -> remaining seconds on the 30-day display clock. */
export function displayRemainingSeconds(remainingChainSeconds: number, responseWindowSeconds: number): number {
  if (responseWindowSeconds <= 0) return 0;
  return Math.round((Math.max(0, remainingChainSeconds) * DISPLAY_CLOCK_DAYS * 86_400) / responseWindowSeconds);
}

/** "29d 23h 59m" style countdown. */
export function formatClock(displaySeconds: number): string {
  const s = Math.max(0, Math.floor(displaySeconds));
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

export function warpLabel(responseWindowSeconds: number): string {
  return `demo time-warp: ${DISPLAY_CLOCK_DAYS} days = ${responseWindowSeconds} s`;
}

/** 2048443 -> "2.05 Mt", 48210 -> "48.2 kt", 530 -> "530 t" (CO2e). */
export function formatTonnes(tonnes: number): string {
  if (tonnes >= 1e6) return `${(tonnes / 1e6).toFixed(2)} Mt`;
  if (tonnes >= 1e3) return `${(tonnes / 1e3).toFixed(1)} kt`;
  return `${Math.round(tonnes)} t`;
}

export function formatRate(kgPerHour: number): string {
  return `${kgPerHour.toLocaleString('en-US')} kg/h`;
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** bytes32 right-padded ASCII -> "KAZ_S_003". */
export function decodeSourceId(sourceId: Hex): string {
  return hexToString(sourceId, { size: 32 }).replace(/\0+$/, '');
}

export function formatEth(wei: bigint): string {
  return `${formatEther(wei)} ETH`;
}

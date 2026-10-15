/** Solidity `Status` enum order (contracts/src/PlumeTypes.sol). */
export const STATUS_NAMES = ['None', 'Open', 'Responded', 'Resolved', 'Slashed', 'Disputed', 'Dismissed'] as const;

export type DisplayStatus =
  | 'unbonded'
  | 'running'
  | 'overdue'
  | 'responded'
  | 'resolved'
  | 'slashed'
  | 'disputed'
  | 'dismissed';

export const STATUS_LABELS: Readonly<Record<DisplayStatus, string>> = {
  unbonded: 'Open · no operator bond',
  running: 'Open · clock running',
  overdue: 'Overdue · slashable',
  responded: 'Responded · awaiting re-observation',
  resolved: 'Resolved',
  slashed: 'Slashed · bond to mitigation fund',
  disputed: 'Disputed · clock paused',
  dismissed: 'Dismissed · misattribution upheld',
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface StatusInput {
  status: number;
  operator: string;
  deadline: number;
}

/** Chain status + bond + clock -> what the dashboard shows. */
export function displayStatus(t: StatusInput, nowSeconds: number): DisplayStatus {
  switch (t.status) {
    case 1:
      if (t.operator.toLowerCase() === ZERO_ADDRESS) return 'unbonded';
      return nowSeconds > t.deadline ? 'overdue' : 'running';
    case 2:
      return 'responded';
    case 3:
      return 'resolved';
    case 4:
      return 'slashed';
    case 5:
      return 'disputed';
    case 6:
      return 'dismissed';
    default:
      throw new Error(`Unknown ticket status ${t.status}`);
  }
}

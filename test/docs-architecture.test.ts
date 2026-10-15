import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** `#`/`##` headings outside code fences, in order. */
function headings(path: string): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('```')) inFence = !inFence;
    else if (!inFence && /^#{1,2} /.test(line)) out.push(line);
  }
  return out;
}

describe('docs/architecture.md', () => {
  const text = readFileSync('docs/architecture.md', 'utf8');

  it('has the locked sections in order', () => {
    expect(headings('docs/architecture.md')).toEqual([
      '# PlumeClock architecture',
      '## System diagram',
      '## Data pipeline',
      '## Smart contracts',
      '## Ticket state machine',
      '## Dashboard',
      '## AI plume analyst',
      '## Deployment and demo',
      '## Technical specification',
    ]);
  });

  it('carries both Mermaid diagrams and the key parameters', () => {
    expect(text).toContain('flowchart LR');
    expect(text).toContain('stateDiagram-v2');
    expect(text).toContain('Base Sepolia (chain id 84532)');
    expect(text).toContain('keccak256(keccak256(abi.encode(record)))');
    expect(text).toContain('MAX_REOPENS');
  });
});

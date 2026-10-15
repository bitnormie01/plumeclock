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

describe('docs/impact-and-adoption.md', () => {
  const text = readFileSync('docs/impact-and-adoption.md', 'utf8');

  it('has the locked sections in order', () => {
    expect(headings('docs/impact-and-adoption.md')).toEqual([
      '# PlumeClock impact and adoption',
      '## Problem statement',
      '## Solution overview',
      '## Climate impact assessment',
      '## Implementation and adoption strategy',
      '## Scalability and sustainability roadmap',
      '## User testing',
      '## Sources',
    ]);
  });

  it('cites its figures with the CO2e assumption stated', () => {
    expect(text).toContain('GWP100 for fossil methane (29.8)');
    expect(text).toContain('if the emission persisted at the last-detected rate for a year');
    expect(text).toContain('199 of 1,105');
    expect(text).toContain('No external user testing was run during the hackathon.');
  });
});

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

describe('docs/security-and-data-integrity.md', () => {
  const text = readFileSync('docs/security-and-data-integrity.md', 'utf8');

  it('has the locked sections in order', () => {
    expect(headings('docs/security-and-data-integrity.md')).toEqual([
      '# PlumeClock security and data-integrity assessment',
      '## Scope',
      '## Trust assumptions',
      '## Data integrity',
      '## Threat model',
      '## Smart-contract safeguards',
      '## Testing evidence',
      '## Known limitations',
      '## Responsible data use',
    ]);
  });

  it('states the honest limits and the portrayal rule', () => {
    expect(text).toContain('**unaudited**');
    expect(text).toContain('No unbonding delay');
    expect(text).toContain('No real operator is named or contacted');
    expect(text).toContain('may not necessarily signal');
    expect(text).toContain('CC BY-NC-SA 4.0');
  });
});

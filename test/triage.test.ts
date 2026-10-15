import { describe, expect, it } from 'vitest';
import { triage } from '../src/lib/triage';

describe('triage', () => {
  it('scores a persistent, unanswered multi-megatonne source as high', () => {
    expect(triage(2_048_443, 'persistent', 'Notified – no response received')).toEqual({
      score: 83,
      priority: 'high',
      impact: 0.828,
      persistenceWeight: 1,
      responseFactor: 1,
    });
  });

  it('scores an answered source with no recent plume as low', () => {
    expect(triage(32_237_078, 'absent', 'Government and operator responded')).toEqual({
      score: 3,
      priority: 'low',
      impact: 1,
      persistenceWeight: 0.1,
      responseFactor: 0.3,
    });
  });

  it('reads persistency case-insensitively and defaults unknown categories to 0.5', () => {
    expect(triage(100_000, 'Undetermined', 'Operator responded').persistenceWeight).toBe(0.5);
    expect(triage(100_000, 'new-category', 'Operator responded').persistenceWeight).toBe(0.5);
  });

  it('clamps impact to [0, 1] and uses the medium band at 15..39', () => {
    expect(triage(0, 'persistent', 'Notified – no response received').impact).toBe(0);
    expect(triage(1e12, 'persistent', 'Notified – no response received').impact).toBe(1);
    expect(triage(100_000, 'frequent', 'Government responded')).toMatchObject({ score: 21, priority: 'medium' });
  });
});

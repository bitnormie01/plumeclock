import { describe, expect, it } from 'vitest';
import { co2eTonnesPerYear } from '../src/lib/co2e';
import { feedbackLabel, IMEO_RESPONSE_CAVEAT } from '../src/lib/feedback';

describe('co2eTonnesPerYear', () => {
  it('matches the Solidity integer formula (kg/h x 8760 h x 29.8 / 1000, floored)', () => {
    expect(co2eTonnesPerYear(7847)).toBe(2_048_443);
    expect(co2eTonnesPerYear(123_491)).toBe(32_237_078);
    expect(co2eTonnesPerYear(0)).toBe(0);
  });

  it('stays exact at the uint32 maximum', () => {
    expect(co2eTonnesPerYear(0xffffffff)).toBe(Number((4294967295n * 8760n * 298n) / 10000n));
  });

  it('rejects values that are not uint32', () => {
    expect(() => co2eTonnesPerYear(-1)).toThrow('uint32');
    expect(() => co2eTonnesPerYear(1.5)).toThrow('uint32');
  });
});

describe('feedbackLabel', () => {
  it('uses the IMEO FAQ wording', () => {
    expect(feedbackLabel('Yes', 'Yes')).toBe('Government and operator responded');
    expect(feedbackLabel('Yes', 'No')).toBe('Operator responded');
    expect(feedbackLabel('No', 'Yes')).toBe('Government responded');
    expect(feedbackLabel('No', 'No')).toBe('Notified – no response received');
    expect(feedbackLabel('Not Applicable', 'Not Applicable')).toBe('Notified – no response received');
  });

  it('keeps the IMEO caveat verbatim', () => {
    expect(IMEO_RESPONSE_CAVEAT).toBe('Low response rates may not necessarily signal indifference.');
  });
});

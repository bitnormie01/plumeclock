import Anthropic from '@anthropic-ai/sdk';
import { GWP100 } from './co2e';
import type { Notice, NoticesFile, SnapshotRecord } from './types';

export const DEFAULT_LLM_MODEL = 'claude-opus-5-5';
export const TEMPLATE_GENERATOR = 'template';
export const MAX_NOTICE_CHARS = 600;

export type DraftResult =
  | { kind: 'text'; text: string }
  | { kind: 'fallback'; reason: string }
  | { kind: 'abort'; reason: string };

/** Drafts one notice; `abort` stops all further LLM calls for the run (e.g. a bad API key). */
export type Drafter = (rec: SnapshotRecord) => Promise<DraftResult>;

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/** Deterministic fallback notice: facts only, IMEO status verbatim. */
export function templateNotice(rec: SnapshotRecord): string {
  return (
    `${rec.sourceName} (${rec.sourceType}, ${rec.country}): satellites recorded a methane plume of ` +
    `${rec.rateKgPerHour.toLocaleString('en-US')} kg/h on ${formatDate(rec.lastPlumeAt)}. ` +
    `If it persisted all year that is about ${rec.co2eTonnesPerYear.toLocaleString('en-US')} t CO2e ` +
    `(GWP100 ${GWP100}). IMEO status: ${rec.feedbackLabel}. ` +
    `Triage priority: ${rec.triage.priority} (${rec.triage.score}/100).`
  );
}

export function isValidNotice(text: string, rec: SnapshotRecord): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_NOTICE_CHARS && t.includes(rec.sourceName);
}

export const NOTICE_SYSTEM_PROMPT =
  'You write plain-language public notices for an open methane accountability dashboard. ' +
  'Use only the facts given. Do not guess who operates the site, why it emits, or whether anyone is negligent; ' +
  'IMEO notes that low response rates may not necessarily signal indifference. ' +
  'Write 2 or 3 short sentences, under 500 characters, with no headings or lists. ' +
  'Always mention the source ID exactly as given, the CO2e figure with its assumption ' +
  '(GWP100 29.8, if the emission persisted for a year), and the IMEO status exactly as given.';

export function noticePrompt(rec: SnapshotRecord): string {
  return [
    `Source ID: ${rec.sourceName}`,
    `Country: ${rec.country}`,
    `Sector: ${rec.sector}`,
    `Source type: ${rec.sourceType}`,
    `Last satellite detection (UTC date): ${formatDate(rec.lastPlumeAt)}`,
    `Emission rate at that detection: ${rec.rateKgPerHour} kg CH4/h`,
    `Plumes attributed to this source: ${rec.plumeCount}`,
    `IMEO persistency category: ${rec.persistency}`,
    `CO2e if persisted for a year (GWP100 29.8): ${rec.co2eTonnesPerYear} t`,
    `IMEO status: ${rec.feedbackLabel}`,
    `Triage priority: ${rec.triage.priority} (${rec.triage.score}/100)`,
  ].join('\n');
}

/** Build the notices for the ticket set; any LLM problem falls back to the template text. */
export async function buildNotices(
  records: readonly SnapshotRecord[],
  generatedAt: string,
  drafter?: Drafter,
  model = DEFAULT_LLM_MODEL,
): Promise<NoticesFile> {
  const notices: Record<string, Notice> = {};
  let useLlm = drafter !== undefined;
  let llmCount = 0;
  for (const rec of records) {
    let notice: Notice = { text: templateNotice(rec), generator: TEMPLATE_GENERATOR };
    if (useLlm && drafter) {
      const result = await drafter(rec);
      if (result.kind === 'abort') {
        useLlm = false;
      } else if (result.kind === 'text' && isValidNotice(result.text, rec)) {
        notice = { text: result.text.trim(), generator: model };
        llmCount++;
      }
    }
    notices[rec.sourceName] = notice;
  }
  return {
    schema: 'plumeclock.notices.v1',
    generatedAt,
    generator: llmCount > 0 ? model : TEMPLATE_GENERATOR,
    notices,
  };
}

/** Real drafter: Anthropic Messages API (low effort, server-side refusal fallbacks). */
export function makeClaudeDrafter(apiKey: string, model = DEFAULT_LLM_MODEL): Drafter {
  const client = new Anthropic({ apiKey });
  return async (rec) => {
    try {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: NOTICE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: noticePrompt(rec) }],
      });
      if (response.stop_reason === 'refusal') return { kind: 'fallback', reason: 'refusal' };
      const text = response.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('')
        .trim();
      return { kind: 'text', text };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        return { kind: 'abort', reason: `auth: ${error.status}` };
      }
      if (error instanceof Anthropic.APIError) return { kind: 'fallback', reason: `api ${error.status}` };
      return { kind: 'fallback', reason: error instanceof Error ? error.message : 'unknown error' };
    }
  };
}

import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_LLM_MODEL, buildNotices, makeClaudeDrafter } from '../src/lib/notices';
import type { SnapshotFile } from '../src/lib/types';

// Usage: npm run notices            (Claude if LLM_API_KEY is set in the env or .env, else templates)
//        npm run notices -- --template   (always templates, never calls an API)
const templateOnly = process.argv.includes('--template');
if (!templateOnly) {
  try {
    process.loadEnvFile('.env');
  } catch {
    // no .env file: template mode unless LLM_API_KEY is already in the environment
  }
}
const snapshot = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
const byName = new Map(snapshot.records.map((r) => [r.sourceName, r]));
const records = snapshot.ticketSet.map((name) => {
  const rec = byName.get(name);
  if (!rec) throw new Error(`Ticket-set source ${name} is not in snapshot.records`);
  return rec;
});
const apiKey = templateOnly ? undefined : process.env.LLM_API_KEY?.trim();
const model = process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
const drafter = apiKey ? makeClaudeDrafter(apiKey, model) : undefined;
const generatedAt = drafter ? new Date().toISOString() : snapshot.generatedAt;
const notices = await buildNotices(records, generatedAt, drafter, model);
writeFileSync('public/data/notices.json', `${JSON.stringify(notices, null, 2)}\n`);
console.log(`notices.json: ${Object.keys(notices.notices).length} notices, generator=${notices.generator}`);

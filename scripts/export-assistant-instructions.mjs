// Prints the instructions stored on legacy OpenAI Assistants so they can be moved into
// env vars (CHARACTER_PROMPT_DAYEON, CHARACTER_PROMPT_DEFAULT) after the Assistants API migration.
//
// Usage: OPENAI_API_KEY=sk-... node scripts/export-assistant-instructions.mjs asst_ED99NuKgahDCWbPaId4kUwq1 [asst_...]
import OpenAI from 'openai';

const ids = process.argv.slice(2);
if (!process.env.OPENAI_API_KEY || ids.length === 0) {
  console.error('Usage: OPENAI_API_KEY=... node scripts/export-assistant-instructions.mjs <assistant_id> [...]');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

for (const id of ids) {
  try {
    const assistant = await openai.beta.assistants.retrieve(id);
    console.log(`\n===== ${id} (${assistant.name ?? 'unnamed'}, model ${assistant.model}) =====`);
    console.log(assistant.instructions ?? '(no instructions)');
  } catch (error) {
    console.error(`\n===== ${id}: failed — ${error instanceof Error ? error.message : error}`);
  }
}

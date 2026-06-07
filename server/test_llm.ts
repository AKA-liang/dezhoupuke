import { getTableTalk } from './src/ai/llm.js';

async function test() {
  const talk = await getTableTalk('老张', 'raise', '底池3000，对手跟注');
  console.log('OpenAI-compat talk:', talk);

  // Test cached
  const t2 = await getTableTalk('老张', 'raise', '底池3000，对手跟注');
  console.log('Cached:', t2);

  const t3 = await getTableTalk('老张', 'fold', '');
  console.log('Fold talk:', t3);
}

test().catch(e => console.error(e));

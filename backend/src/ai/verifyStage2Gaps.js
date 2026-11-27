const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bizsuite_dev_secret_key_2024_change_in_production';
const tenantId = 'a109ea77-239d-4f80-b174-22037177b4af';
const token = jwt.sign(
  { id: '11111111-1111-1111-1111-111111111111', role: 'admin', tenant_id: tenantId, name: 'Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const testCases = [
  {
    name: '1. Exact aggregate count: "How many items do we have?"',
    message: 'How many items do we have?',
    context: []
  },
  {
    name: '2. Product availability: "we have any laptop>"',
    message: 'we have any laptop>',
    context: []
  },
  {
    name: '3. Inventory overview: "Give me an inventory overview"',
    message: 'Give me an inventory overview',
    context: []
  },
  {
    name: '4. Strategic creation: "next which item we can create?"',
    message: 'next which item we can create?',
    context: []
  },
  {
    name: '5. False historical 9,000-items contamination override',
    message: 'What is our current item count?',
    context: [
      { role: 'user', content: 'How many items we have?' },
      { role: 'assistant', content: 'We have 9,000 items in our organization catalog.' }
    ]
  },
  {
    name: '6. Missing product: "Do we have iPhone 16?"',
    message: 'Do we have iPhone 16?',
    context: []
  }
];

async function runTestCase(tc) {
  console.log(`\n======================================================`);
  console.log(`TEST CASE: ${tc.name}`);
  console.log(`PROMPT: "${tc.message}"`);
  if (tc.context?.length > 0) {
    console.log(`CONTEXT: ${JSON.stringify(tc.context)}`);
  }
  console.log(`======================================================`);

  const res = await fetch('http://localhost:5000/api/v1/ai/stream-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message: tc.message, context: tc.context })
  });

  const text = await res.text();
  const lines = text.split('\n');
  let toolCalled = null;
  let fullAnswer = '';
  let doneNote = null;
  let provider = null;
  let model = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const payloadStr = line.slice(6).trim();
      if (payloadStr === '[DONE]') continue;
      try {
        const payload = JSON.parse(payloadStr);
        if (payload.type === 'tool') toolCalled = payload.summary;
        if (payload.type === 'chunk') fullAnswer += payload.chunk;
        if (payload.type === 'done') {
          doneNote = payload.note;
          provider = payload.provider;
          model = payload.model;
        }
      } catch (e) {}
    }
  }

  console.log(`[TOOL REPORTED]:`, toolCalled);
  console.log(`[PROVIDER & MODEL]:`, `${provider} (${model})`);
  console.log(`[DONE NOTE]:`, doneNote);
  console.log(`[FINAL RESPONSE]:\n${fullAnswer.trim()}`);

  return {
    test: tc.name,
    toolCalled,
    provider,
    model,
    answer: fullAnswer.trim()
  };
}

async function runAll() {
  console.log('🚀 Running MERIBOT STAGE 2 VERIFICATION SUITE...\n');
  const results = [];
  for (const tc of testCases) {
    const res = await runTestCase(tc);
    results.push(res);
  }

  console.log('\n======================================================');
  console.log('🏁 ALL TESTS FINISHED. SUMMARY:');
  console.log('======================================================');
  for (const r of results) {
    console.log(`• ${r.test} => Tool: ${r.toolCalled} | Result length: ${r.answer.length} chars`);
  }
}

runAll().catch(console.error);


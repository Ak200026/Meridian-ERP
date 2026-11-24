const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bizsuite_dev_secret_key_2024_change_in_production';
const tenantId = 'a109ea77-239d-4f80-b174-22037177b4af';
const token = jwt.sign(
  { id: '11111111-1111-1111-1111-111111111111', role: 'admin', tenant_id: tenantId, name: 'Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const fiveQuestions = [
  'How many items do we have?',
  'How many products are available?',
  'What is our total inventory count?',
  'How many units are in stock?',
  'Give me an inventory overview'
];

async function testOne(q) {
  const res = await fetch('http://localhost:5000/api/v1/ai/stream-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message: q })
  });

  const text = await res.text();
  const lines = text.split('\n');
  let toolCalled = null;
  let fullAnswer = '';
  let doneNote = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const payloadStr = line.slice(6).trim();
      if (payloadStr === '[DONE]') continue;
      try {
        const payload = JSON.parse(payloadStr);
        if (payload.type === 'tool') toolCalled = payload.summary;
        if (payload.type === 'chunk') fullAnswer += payload.chunk;
        if (payload.type === 'done') doneNote = payload.note;
      } catch (e) {}
    }
  }

  console.log(`\nQUESTION: "${q}"`);
  console.log(`TOOL: ${toolCalled}`);
  console.log(`NOTE: ${doneNote}`);
  console.log(`ANSWER:\n${fullAnswer.trim()}`);
}

async function run() {
  console.log('--- TESTING 5 AGGREGATE INVENTORY QUESTIONS ---');
  for (const q of fiveQuestions) {
    await testOne(q);
  }
}

run().catch(console.error);

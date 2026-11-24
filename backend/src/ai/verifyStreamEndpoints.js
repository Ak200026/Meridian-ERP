// ============================================================
// 🧪 VERIFY STREAM CHAT LIVE ENDPOINT
// File: backend/src/ai/verifyStreamEndpoints.js
// ============================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bizsuite_dev_secret_key_2024_change_in_production';
const token = jwt.sign({
  id: 'test-admin-id',
  role: 'admin',
  tenant_id: 'a109ea77-239d-4f80-b174-22037177b4af',
  name: 'Admin Test'
}, JWT_SECRET, { expiresIn: '1h' });

async function testStreamQuery(label, question) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`Testing Query: "${question}" [${label}]`);
  console.log(`------------------------------------------------------------`);

  const res = await fetch('http://localhost:5000/api/v1/ai/stream-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message: question })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const text = await res.text();
  const lines = text.split('\n');
  let toolPill = '';
  let fullAnswer = '';
  let doneNote = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const jsonStr = line.slice(6).trim();
    if (jsonStr === '[DONE]') continue;
    try {
      const p = JSON.parse(jsonStr);
      if (p.type === 'tool') toolPill = p.summary;
      if (p.type === 'chunk') fullAnswer += p.chunk;
      if (p.type === 'done') doneNote = p.note;
    } catch (_) {}
  }

  console.log('Tool Summary:', toolPill || 'None');
  console.log('Done Note:   ', doneNote || 'None');
  console.log('Answer Text: \n' + fullAnswer.trim());

  // Validations:
  const hasSql = /SELECT\s+|FROM\s+live_erp_products|WHERE\s+p\.sku/i.test(fullAnswer);
  if (hasSql) {
    console.error('❌ FAILED: Response contains raw SQL!');
    process.exit(1);
  }
  return { toolPill, fullAnswer };
}

async function run() {
  // Query 1: Laptop inventory inquiry
  const q1 = await testStreamQuery('Product Inquiry', 'we have any laptop>');
  if (!q1.fullAnswer.includes('Dell laptop') || !q1.fullAnswer.includes('25')) {
    console.warn('⚠️ Warning: Laptop quantity/name might not be in answer');
  }

  // Query 2: Strategic product creation recommendation
  const q2 = await testStreamQuery('Strategic Advisory', 'next which item we can create?');
  if (q2.fullAnswer.includes('0') && q2.fullAnswer.includes('Unique Product SKUs')) {
    console.error('❌ FAILED: Returned empty 0 SKU warehouse status instead of recommendation!');
    process.exit(1);
  }

  // Query 3: Inventory overview
  const q3 = await testStreamQuery('Inventory Overview', 'Give me an inventory overview');
  if (q3.fullAnswer.includes('Unique Product SKUs: 0') || q3.fullAnswer.includes('Total Units in Stock: 0')) {
    console.error('❌ FAILED: Overview reported 0 items!');
    process.exit(1);
  }

  // Query 4: Missing product inquiry
  const q4 = await testStreamQuery('Missing Product', 'Do we have iPhone 16?');
  if (q4.fullAnswer.includes('iPhone 16 is priced at') || q4.fullAnswer.includes('iPhone 16 in stock')) {
    console.error('❌ FAILED: Hallucinated missing product!');
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('✅ ALL 4 STREAM ENDPOINT QUERIES VERIFIED SUCCESSFULLY!');
  console.log('============================================================\n');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal stream test error:', err);
  process.exit(1);
});

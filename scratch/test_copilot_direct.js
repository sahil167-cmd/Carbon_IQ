const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  console.log('Testing User:', user.email, 'Org:', user.organizationId);

  const testMessage = 'TATA POWER DISTRIBUTION LTD list me numbers provided by this company"';

  console.log('\n--- 1. Testing ML Service (http://localhost:8000/rag/query) ---');
  try {
    const mlRes = await fetch('http://localhost:8000/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: testMessage,
        organization_id: user.organizationId,
        user_id: user.id,
        database_url: process.env.DATABASE_URL || 'postgresql://carbon_os:carbon_os_dev_password@localhost:5432/carbon_os_dev?schema=public',
        mistral_api_key: process.env.LLM_API_KEY || process.env.MISTRAL_API_KEY || '',
      }),
    });
    const mlData = await mlRes.json();
    console.log('ML Service Status:', mlRes.status);
    console.log('ML Service Success:', mlData.success);
    console.log('ML Query Type:', mlData.query_type);
    console.log('ML Answer:\n', mlData.answer);
  } catch (err) {
    console.error('ML Service Error:', err.message);
  }

  await prisma.$disconnect();
}

main();

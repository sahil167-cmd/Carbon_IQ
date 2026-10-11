import 'dotenv/config';

async function testPredict() {
  const res = await fetch('http://localhost:8000/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organization_id: 'cmssknvps000119nwrhreznyy',
      database_url: process.env.DATABASE_URL,
      horizon_months: 6,
    }),
  });

  const json = await res.json();
  console.log('Direct ML Predict result:', JSON.stringify(json, null, 2));
}

testPredict();

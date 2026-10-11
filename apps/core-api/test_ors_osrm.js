const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const apiKey = process.env.OPENROUTESERVICE_API_KEY;
console.log('API Key present?', Boolean(apiKey), 'length:', apiKey?.length);

async function testORS(profile) {
  const url = `https://api.heigit.org/openrouteservice/v2/directions/${profile}/geojson`;
  // Pune: [73.870703, 18.519479], Goa: [74.085513, 15.300454]
  const body = {
    coordinates: [
      [73.870703, 18.519479],
      [74.085513, 15.300454]
    ]
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log(`ORS [${profile}] status:`, res.status, 'Response:', text.slice(0, 300));
  } catch (err) {
    console.error(`ORS [${profile}] error:`, err);
  }
}

async function testOSRM() {
  const url = `https://router.project-osrm.org/route/v1/driving/73.870703,18.519479;74.085513,15.300454?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log('OSRM status:', res.status, 'code:', json.code, 'routes length:', json.routes?.length, 'distance:', json.routes?.[0]?.distance, 'duration:', json.routes?.[0]?.duration);
  } catch (err) {
    console.error('OSRM error:', err);
  }
}

async function run() {
  await testORS('driving-hgv');
  await testORS('driving-car');
  await testOSRM();
}

run();

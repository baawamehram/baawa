require('dotenv').config();
const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT source_name, source_url, content FROM knowledge_chunks WHERE content LIKE '%太平%' LIMIT 5");
  console.log('--- CHINESE CONTENT FINDINGS ---');
  res.rows.forEach(r => {
    console.log(`Source: ${r.source_name}`);
    console.log(`URL: ${r.source_url}`);
    console.log(`Content Preview: ${r.content.substring(0, 50)}...`);
    console.log('---');
  });
  await client.end();
}

check().catch(console.error);

require('dotenv').config();
const { Client } = require('pg');

async function wipe() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('[cleanup] Wiping knowledge_chunks table...');
  const res = await client.query('DELETE FROM knowledge_chunks');
  console.log(`[cleanup] Done. Deleted ${res.rowCount} rows.`);
  await client.end();
}

wipe().catch(err => {
  console.error('[cleanup] Wipe failed:', err);
  process.exit(1);
});

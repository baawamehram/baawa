import { db } from './src/db/client';

async function check() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assessments'
    `);
    console.log('Assessments columns:');
    res.rows.forEach(col => console.log(`- ${col.column_name}: ${col.data_type}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

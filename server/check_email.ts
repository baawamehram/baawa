import { db } from './src/db/client';

async function check() {
  try {
    const res = await db.query('SELECT email FROM assessments WHERE email = $1', ['singhwm@gmail.com']);
    console.log('Results for singhwm@gmail.com:');
    console.log(JSON.stringify(res.rows, null, 2));

    const countRes = await db.query('SELECT COUNT(*) FROM assessments');
    console.log('Total assessments:', countRes.rows[0].count);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

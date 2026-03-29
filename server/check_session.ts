import { db } from './src/db/client';
import dotenv from 'dotenv';
dotenv.config();

async function checkSessions() {
  try {
    const res = await db.query(`
      SELECT id, question_count, status, conversation, created_at 
      FROM sessions 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSessions();

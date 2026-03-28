import { Pool } from 'pg';
import dotenv from 'dotenv';
import { scoreConversation } from '../services/scoring';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function backfill() {
  console.log('Starting identity backfill...');
  const { rows: assessments } = await pool.query('SELECT id, conversation FROM assessments WHERE founder_name IS NULL OR (company_name IS NULL OR company_name = \'\')');
  
  console.log(`Found ${assessments.length} records to process.`);
  
  for (const row of assessments) {
    try {
      console.log(`Processing assessment ${row.id}...`);
      
      // Use existing scoreConversation service which now extracts company_name
      // To get founder_name, we extract it from the transcript manually or update the service
      const transcript = row.conversation.map((m: any) => `${m.role === 'user' ? 'Founder' : 'Interviewer'}: ${m.content}`).join('\n');
      
      // Simple regex for name if it's usually "My name is X" or similar
      let founderName = 'Founder';
      const nameMatch = transcript.match(/(?:my name is|i'm|i am) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i);
      if (nameMatch) founderName = nameMatch[1];
      
      const scoring = await scoreConversation(row.conversation);
      
      await pool.query(
        'UPDATE assessments SET founder_name = $1, company_name = $2 WHERE id = $3',
        [founderName, scoring.company_name || null, row.id]
      );
      
      // Also update client if exists
      await pool.query(
        'UPDATE clients SET founder_name = $1, company_name = $2 WHERE assessment_id = $3',
        [founderName, scoring.company_name || null, row.id]
      );
      
      console.log(`✅ Updated assessment ${row.id}: ${founderName} @ ${scoring.company_name}`);
    } catch (e) {
      console.error(`❌ Failed assessment ${row.id}:`, e);
    }
  }
  
  console.log('Backfill complete.');
  await pool.end();
}

backfill().catch(console.error);

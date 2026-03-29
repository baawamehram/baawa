import { db } from '../db/client';
import { V1_SYSTEM_PROMPT } from '../db/seeds/journeyConfigV1';
import dotenv from 'dotenv';
dotenv.config();

async function updateConfig() {
  try {
    console.log('Updating journey_config to Rory Sutherland version...');
    
    // Update the most recent active version
    const result = await db.query(`
      UPDATE journey_config 
      SET system_prompt = $1, 
          change_summary = $2,
          reasoning = $3
      WHERE status = 'active'
      RETURNING version
    `, [
      V1_SYSTEM_PROMPT,
      'Rory Sutherland Assessment Funnel Upgrade (March 2026)',
      'Implementing high-converting perception-first 6-phase flow with hardened termination logic.'
    ]);

    if (result.rowCount === 0) {
      console.log('No active config found to update. Seeding initial config...');
      // If no active, maybe seed a new one
      await db.query(`
        INSERT INTO journey_config (version, status, system_prompt, intro_messages, scoring_weights, change_summary, risk_level, reasoning)
        VALUES (1, 'active', $1, $2, $3, $4, 'low', $5)
      `, [
        V1_SYSTEM_PROMPT,
        JSON.stringify(['Hello.', 'Let\'s begin.']), // Fallback intro msgs
        JSON.stringify({ pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 }),
        'Initial Rory Seed',
        'Direct seed via script'
      ]);
    }

    console.log('SUCCESS: Journey config updated.');
    process.exit(0);
  } catch (err) {
    console.error('FAILED to update config:', err);
    process.exit(1);
  }
}

updateConfig();

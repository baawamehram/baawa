import 'dotenv/config'
import { db } from '../client'
import { JOURNEY_CONFIG_V1_SEED } from './journeyConfigV1'

async function seed() {
  // Only seed if no journey_config rows exist yet
  const existing = await db.query('SELECT COUNT(*) FROM journey_config')
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('journey_config already seeded — skipping')
    await db.end()
    return
  }

  await db.query(
    `INSERT INTO journey_config
     (version, status, system_prompt, intro_messages, scoring_weights,
      change_summary, risk_level, reasoning, metrics_snapshot, activated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      JOURNEY_CONFIG_V1_SEED.version,
      JOURNEY_CONFIG_V1_SEED.status,
      JOURNEY_CONFIG_V1_SEED.system_prompt,
      JSON.stringify(JOURNEY_CONFIG_V1_SEED.intro_messages),
      JSON.stringify(JOURNEY_CONFIG_V1_SEED.scoring_weights),
      JOURNEY_CONFIG_V1_SEED.change_summary,
      JOURNEY_CONFIG_V1_SEED.risk_level,
      JOURNEY_CONFIG_V1_SEED.reasoning,
      JOURNEY_CONFIG_V1_SEED.metrics_snapshot,
      JOURNEY_CONFIG_V1_SEED.activated_at,
    ]
  )
  console.log('journey_config v1 seed inserted')
  await db.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

// server/src/scripts/runOptimizer.ts
import 'dotenv/config'
import { runOptimizer } from '../services/journeyOptimizer'

async function main() {
  console.log('[runOptimizer] Starting optimizer run...')
  const result = await runOptimizer()
  console.log('[runOptimizer] Result:', JSON.stringify(result))
  process.exit(0)
}

main().catch((err) => {
  console.error('[runOptimizer] Fatal error:', err)
  process.exit(1)
})

// Placeholder Express app stub — full app configured in Task 2
import express from 'express'
import dotenv from 'dotenv'
dotenv.config()
const app = express()
const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
export default app

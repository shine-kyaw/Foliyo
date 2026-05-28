// Vercel serverless entry point — re-exports the Express app.
// Vercel's Node.js runtime picks this up automatically from the /api directory.
import app from '../server/index.js'
export default app

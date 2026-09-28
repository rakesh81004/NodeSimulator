import type { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import { app } from '../../server/app';
import { initDatabase } from '../../server/db/database';

// A warm Netlify Function instance can be reused for later invocations, so
// this only actually reconnects/re-runs the schema setup on a cold start
// (initDatabase() itself also no-ops if the pool already exists).
let dbReady: Promise<void> | null = null;

const serverlessHandler = serverless(app);

export const handler: Handler = async (event, context) => {
  // Let the pool be reused across invocations within the same warm instance
  // instead of forcing Lambda to wait for pending I/O before freezing it.
  context.callbackWaitsForEmptyEventLoop = false;

  if (!dbReady) {
    dbReady = initDatabase().catch((err) => {
      // Don't cache a failure -- let the next invocation retry the connection
      // instead of this warm instance being permanently broken until recycled.
      dbReady = null;
      throw err;
    });
  }

  try {
    await dbReady;
  } catch (err: any) {
    // Left uncaught, this throws out of the exported handler entirely --
    // Netlify then returns its own opaque error page instead of JSON, which
    // makes the frontend's res.json() parse fail and fall back to a generic
    // "An error occurred with the server." with no indication of why. Return
    // a real JSON body instead, so the actual cause (e.g. a missing env var)
    // reaches both the browser and the function logs.
    console.error('[Netlify Function] Database not available:', err);
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Database unavailable. Check the function logs.' }),
    };
  }

  // Depending on the exact redirect rewrite, Netlify may hand this function
  // either "/.netlify/functions/api/auth/login" or just "/auth/login" as
  // event.path. Normalize both shapes down to "/api/..." -- what the Express
  // app (shared with the local dev server) actually has its routes mounted
  // under -- instead of depending on getting the netlify.toml rewrite exactly
  // pixel-perfect.
  let normalizedPath = event.path.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  if (!normalizedPath.startsWith('/api')) {
    normalizedPath = '/api' + normalizedPath;
  }

  return serverlessHandler({ ...event, path: normalizedPath }, context) as any;
};

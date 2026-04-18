/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js at server startup (before any routes).
 * We use it to activate the global console interceptor so ALL server-side
 * console.log/warn/error calls are piped into the admin logs system.
 *
 * This catches errors from:
 *   - API providers (Gemini quota errors, Anthropic/OpenAI failures)
 *   - Database/Prisma errors
 *   - Unhandled promise rejections
 *   - Any route that uses console.* instead of addLog()
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/instrumentation
 */

export async function register() {
  // Only run on the server side
  if (typeof window === 'undefined') {
    const { interceptConsole } = await import('./lib/logger');
    interceptConsole();

    // Also catch unhandled rejections at the process level
    process.on('unhandledRejection', (reason: unknown) => {
      const { addLog } = require('./lib/logger');
      const message = reason instanceof Error ? reason.message : String(reason);
      addLog('error', `Unhandled rejection: ${message}`, 'system');
    });
  }
}

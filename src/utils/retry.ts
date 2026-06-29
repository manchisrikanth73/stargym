import { logError } from '../services/errorLog';

export async function withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  logError(operation, lastErr).catch(() => {});
  throw lastErr;
}

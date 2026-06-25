import { auth } from './firebase';

export async function logError(operation: string, error: unknown): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const token = await auth.currentUser.getIdToken();
    await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        operation,
        error: (error as any)?.message ?? String(error),
      }),
    });
  } catch {}
}

import { auth } from './firebase';

async function getToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

export function apiSSE(path: string, onMessage: (data: unknown) => void): () => void {
  let es: EventSource | null = null;
  let closed = false;

  getToken().then(token => {
    if (closed) return;
    es = new EventSource(`/api${path}?token=${encodeURIComponent(token)}`);
    es.onmessage = e => {
      try { onMessage(JSON.parse(e.data)); } catch {}
    };
    es.onerror = () => {
      es?.close();
    };
  }).catch(err => console.error('[apiSSE]', err));

  return () => {
    closed = true;
    es?.close();
  };
}

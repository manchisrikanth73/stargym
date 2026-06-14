import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export async function logError(operation: string, error: unknown): Promise<void> {
  await addDoc(collection(db, 'errorLogs'), {
    operation,
    error: (error as any)?.message ?? String(error),
    uid: auth.currentUser?.uid ?? null,
    timestamp: serverTimestamp(),
    retries: 3,
  });
}

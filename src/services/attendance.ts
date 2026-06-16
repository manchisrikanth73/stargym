import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { withRetry } from '../utils/retry';
import dayjs from 'dayjs';

const uid = () => auth.currentUser!.uid;
const ref = () => collection(db, 'users', uid(), 'attendance');
const dateKey = (d: Date) => dayjs(d).format('YYYY-MM-DD');

export async function checkIn(): Promise<boolean> {
  return withRetry('checkIn', async () => {
    const key = dateKey(new Date());
    const attendanceRef = doc(ref(), key);
    const snap = await getDoc(attendanceRef);
    if (snap.exists()) return false;
    const user = auth.currentUser!;
    const currentUid = uid();
    const batch = writeBatch(db);
    batch.set(attendanceRef, {
      date: Timestamp.fromDate(new Date()),
      checkedInAt: serverTimestamp(),
      uid: currentUid,
    });
    batch.set(doc(collection(db, 'checkins'), `${currentUid}_${key}`), {
      uid: currentUid,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      checkedInAt: serverTimestamp(),
      date: key,
    });
    await batch.commit();
    return true;
  });
}

export async function isCheckedInToday(): Promise<boolean> {
  const snap = await getDoc(doc(ref(), dateKey(new Date())));
  return snap.exists();
}

export async function getAttendanceDates(): Promise<string[]> {
  return withRetry('getAttendanceDates', async () => {
    const q = query(ref(), orderBy('date'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const ts = d.data().date as Timestamp;
      return dateKey(ts.toDate());
    });
  });
}

export async function getMonthlyCount(year: number, month: number): Promise<number> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const q = query(
    ref(),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<', Timestamp.fromDate(end)),
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function getMemberCheckinHistory(
  memberUid: string,
  days = 60,
): Promise<{ date: string; checkedInAt: Timestamp | null }[]> {
  return withRetry('getMemberCheckinHistory', async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const q = query(
      collection(db, 'users', memberUid, 'attendance'),
      where('date', '>=', Timestamp.fromDate(cutoff)),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      date: d.id,
      checkedInAt: (d.data().checkedInAt as Timestamp) ?? null,
    }));
  });
}

export type CheckinRecord = {
  uid: string;
  displayName: string;
  email: string;
  checkedInAt: Timestamp;
};

export function subscribeRecentCheckins(cb: (records: CheckinRecord[]) => void): () => void {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const q = query(
    collection(db, 'checkins'),
    where('checkedInAt', '>=', cutoff),
    orderBy('checkedInAt', 'desc'),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs
      .map(d => d.data() as CheckinRecord)
      .filter(r => r.uid && r.checkedInAt));
  }, err => console.error('[subscribeRecentCheckins]', err));
}

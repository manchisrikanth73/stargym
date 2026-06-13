import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import dayjs from 'dayjs';

const uid = () => auth.currentUser!.uid;
const ref = () => collection(db, 'users', uid(), 'attendance');
const dateKey = (d: Date) => dayjs(d).format('YYYY-MM-DD');

export async function checkIn(): Promise<boolean> {
  const key = dateKey(new Date());
  const docRef = doc(ref(), key);
  const snap = await getDoc(docRef);
  if (snap.exists()) return false;

  await setDoc(docRef, {
    date: Timestamp.fromDate(new Date()),
    checkedInAt: serverTimestamp(),
    uid: uid(),
  });
  return true;
}

export async function isCheckedInToday(): Promise<boolean> {
  const snap = await getDoc(doc(ref(), dateKey(new Date())));
  return snap.exists();
}

export async function getAttendanceDates(): Promise<string[]> {
  const q = query(ref(), orderBy('date'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const ts = d.data().date as Timestamp;
    return dateKey(ts.toDate());
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

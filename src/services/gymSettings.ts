import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type MembershipPrices = {
  basic: number;
  premium: number;
  vip: number;
};

export type WorkoutAccess = {
  basic: boolean;
  premium: boolean;
  vip: boolean;
};

const settingsRef = () => doc(db, 'gymConfig', 'membership');

export async function getMembershipPrices(): Promise<MembershipPrices> {
  const snap = await getDoc(settingsRef());
  if (!snap.exists()) return { basic: 0, premium: 0, vip: 0 };
  const d = snap.data();
  return { basic: d.basic ?? 0, premium: d.premium ?? 0, vip: d.vip ?? 0 };
}

export async function setMembershipPrices(prices: MembershipPrices): Promise<void> {
  await setDoc(settingsRef(), prices, { merge: true });
}

export async function getWorkoutAccess(): Promise<WorkoutAccess> {
  const snap = await getDoc(settingsRef());
  if (!snap.exists()) return { basic: false, premium: true, vip: true };
  const d = snap.data()?.workoutAccess ?? {};
  return {
    basic:   d.basic   ?? false,
    premium: d.premium ?? true,
    vip:     d.vip     ?? true,
  };
}

export async function setWorkoutAccess(access: WorkoutAccess): Promise<void> {
  await setDoc(settingsRef(), { workoutAccess: access }, { merge: true });
}

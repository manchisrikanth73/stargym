import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type MembershipPrices = {
  basic: number;
  premium: number;
  vip: number;
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

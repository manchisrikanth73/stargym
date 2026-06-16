import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { withRetry } from '../utils/retry';

export type MemberRole = 'admin' | 'member';
export type MembershipType = 'basic' | 'premium' | 'vip';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: MemberRole;
  membershipType: MembershipType;
  isActive: boolean;
  joinedAt: Timestamp | null;
  activationStartDate: string | null;
  activationEndDate: string | null;
  age: number | null;
  gender: string | null;
  scheduledDeleteAt: string | null;
  promoWorkoutExpiry: string | null;
}

const usersRef = () => collection(db, 'users');

export async function createUserProfile(uid: string, email: string, displayName: string, age: number | null = null, gender = '') {
  await setDoc(doc(usersRef(), uid), {
    uid,
    email,
    displayName,
    phone: '',
    role: 'member',
    membershipType: 'basic',
    isActive: false,
    joinedAt: serverTimestamp(),
    activationStartDate: null,
    activationEndDate: null,
    age: age ?? null,
    gender: gender || null,
    scheduledDeleteAt: null,
    promoWorkoutExpiry: null,
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(usersRef(), uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  return withRetry('getAllUsers', async () => {
    const q = query(usersRef(), orderBy('joinedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(usersRef(), uid), data);
}

export async function deleteUserProfile(uid: string) {
  await deleteDoc(doc(usersRef(), uid));
}

export async function disableMember(uid: string): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);
  const scheduledDeleteAt = cutoff.toISOString().slice(0, 10);
  await updateDoc(doc(usersRef(), uid), { isActive: false, scheduledDeleteAt, promoWorkoutExpiry: null });
}

export async function enableMember(uid: string): Promise<void> {
  await updateDoc(doc(usersRef(), uid), { isActive: true, scheduledDeleteAt: null });
}

export async function isCurrentUserAdmin(uid: string): Promise<boolean> {
  const profile = await getUserProfile(uid);
  return profile?.role === 'admin';
}

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, getUserProfile } from './users';
import { sendNewMemberNotification } from './email';

export const signUp = async (email: string, password: string, displayName: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUserProfile(cred.user.uid, email, displayName);
  // Non-blocking — don't fail signup if email fails
  sendNewMemberNotification(displayName, email).catch(() => {});
  return cred;
};

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logOut = () => signOut(auth);

export const onAuthChange = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

export const currentUser = () => auth.currentUser;

export const ensureUserProfile = async (user: User) => {
  const existing = await getUserProfile(user.uid);
  if (!existing) {
    await createUserProfile(user.uid, user.email ?? '', user.displayName ?? user.email?.split('@')[0] ?? 'Member');
  }
};

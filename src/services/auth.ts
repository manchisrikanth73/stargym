import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile } from './users';

export const signUp = async (email: string, password: string, displayName: string, age: number | null = null, gender = '', weightKg: number | null = null) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await createUserProfile(cred.user.uid, email, displayName, age, gender, weightKg);
    return cred;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      try {
        const signInCred = await signInWithEmailAndPassword(auth, email, password);
        const token = await signInCred.user.getIdToken();
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.status === 404) {
          await updateProfile(signInCred.user, { displayName });
          await createUserProfile(signInCred.user.uid, email, displayName, age, gender, weightKg);
          return signInCred;
        }
      } catch {
        // Sign-in failed — email is genuinely taken
      }
    }
    throw err;
  }
};

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logOut = () => signOut(auth);

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

export const onAuthChange = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

export const currentUser = () => auth.currentUser;

export const ensureUserProfile = async (user: User) => {
  const token = await user.getIdToken();
  const res = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (res.status === 404) {
    await createUserProfile(
      user.uid,
      user.email ?? '',
      user.displayName ?? user.email?.split('@')[0] ?? 'Member',
    );
  }
};

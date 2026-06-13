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
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await createUserProfile(cred.user.uid, email, displayName);
    sendNewMemberNotification(displayName, email).catch(err => console.error('[EmailJS]', err));
    return cred;
  } catch (err: any) {
    // Auth account exists but Firestore profile was deleted by admin — re-create the profile
    if (err.code === 'auth/email-already-in-use') {
      try {
        const signInCred = await signInWithEmailAndPassword(auth, email, password);
        const profile = await getUserProfile(signInCred.user.uid);
        if (!profile) {
          await updateProfile(signInCred.user, { displayName });
          await createUserProfile(signInCred.user.uid, email, displayName);
          sendNewMemberNotification(displayName, email).catch(err2 => console.error('[EmailJS]', err2));
          return signInCred;
        }
      } catch {
        // Sign-in failed with these credentials — email is genuinely taken
      }
    }
    throw err;
  }
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

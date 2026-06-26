import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const photoRef = ref(storage, `profile-photos/${uid}`);
  await uploadBytes(photoRef, file);
  return getDownloadURL(photoRef);
}

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC6VlDf-tSe728J8BnaCmKcc1WssCl6hXo',
  authDomain: 'stargym-bec65.firebaseapp.com',
  projectId: 'stargym-bec65',
  storageBucket: 'stargym-bec65.firebasestorage.app',
  messagingSenderId: '153344338653',
  appId: '1:153344338653:web:ec2b17d9af561487364934',
  measurementId: 'G-CE1QTZSFH2',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

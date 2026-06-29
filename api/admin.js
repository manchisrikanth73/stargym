const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

function ensureInitialized() {
  if (getApps().length) return;
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    initializeApp({ credential: cert(JSON.parse(key)) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault() });
  } else {
    throw new Error(
      'Firebase Admin SDK not configured.\n' +
      'Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS in .env'
    );
  }
}

module.exports = {
  auth() { ensureInitialized(); return getAuth(); },
  firestore() { ensureInitialized(); return getFirestore(); },
  FieldValue,
  Timestamp,
};

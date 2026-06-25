// Promote a user to admin (or inspect their role) directly in Firestore.
// Run locally where the service account key is present:
//   node scripts/set-admin.js you@example.com           # show current role
//   node scripts/set-admin.js you@example.com --promote  # set role = admin
require('dotenv').config();
const admin = require('../api/admin');

async function main() {
  const email = process.argv[2];
  const promote = process.argv.includes('--promote');
  if (!email) {
    console.error('Usage: node scripts/set-admin.js <email> [--promote]');
    process.exit(1);
  }

  const user = await admin.auth().getUserByEmail(email);
  const ref = admin.firestore().doc(`users/${user.uid}`);
  const snap = await ref.get();

  if (!snap.exists) {
    console.error(`No Firestore profile at users/${user.uid} for ${email}`);
    process.exit(1);
  }

  console.log(`uid:   ${user.uid}`);
  console.log(`email: ${email}`);
  console.log(`role:  ${snap.data().role ?? '(unset)'}`);

  if (promote) {
    await ref.update({ role: 'admin' });
    console.log('\nUpdated role -> admin. Reload the app.');
  } else {
    console.log('\nRun again with --promote to set role = admin.');
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });

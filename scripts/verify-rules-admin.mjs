// Verify the LIVE rules from an ADMIN's perspective: temporarily grant a test
// uid admin, confirm admin-only reads (all submissions/users/questions) work,
// then revoke. Uses client SDK (subject to rules) + Admin SDK (to grant/revoke).
//   node scripts/verify-rules-admin.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp as initAdmin, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminDb, Timestamp } from 'firebase-admin/firestore';
import { initializeApp as initClient } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const TEST_UID = 'e2e-verify-admin';

if (getAdminApps().length === 0) {
  initAdmin({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const adminDb = getAdminDb();

// Grant admin.
await adminDb.collection('admins').doc(TEST_UID).set({
  uid: TEST_UID, email: 'e2e@test', name: 'E2E Admin', addedAt: Timestamp.now(), addedBy: 'verify-script',
});

try {
  const clientApp = initClient({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  const db = getFirestore(clientApp);
  const customToken = await getAdminAuth().createCustomToken(TEST_UID);
  await signInWithCustomToken(getClientAuth(clientApp), customToken);
  console.log(`Signed in as admin uid=${TEST_UID}\n`);

  async function expectAllow(label, fn) {
    try { const s = await fn(); console.log(`PASS  ${label} -> ALLOWED (${s.size} docs)`); return true; }
    catch (e) { console.log(`FAIL  ${label} -> ${e?.code || e?.message} (SHOULD BE ALLOWED!)`); return false; }
  }

  const r = [];
  r.push(await expectAllow('admin: read ALL submissions', () => getDocs(collection(db, 'submissions'))));
  r.push(await expectAllow('admin: read ALL users', () => getDocs(collection(db, 'users'))));
  r.push(await expectAllow('admin: read ALL questions', () => getDocs(collection(db, 'questions'))));
  console.log(`\n${r.filter(Boolean).length}/${r.length} admin checks passed`);
} finally {
  // Revoke admin no matter what.
  await adminDb.collection('admins').doc(TEST_UID).delete();
  console.log(`[cleanup] revoked test admin ${TEST_UID}`);
}
process.exit(0);

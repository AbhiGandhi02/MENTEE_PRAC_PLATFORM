// Verify the LIVE Firestore rules using the client SDK (which IS subject to
// rules) signed in as a non-admin "mentee". Confirms legit reads work and that
// secrets / submission writes are denied.
//   node scripts/verify-rules.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp as initAdmin, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initClient } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp,
} from 'firebase/firestore';

const TEST_UID = 'e2e-verify-user'; // not in the admins collection => mentee

if (getAdminApps().length === 0) {
  initAdmin({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const clientApp = initClient({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(clientApp);

const customToken = await getAdminAuth().createCustomToken(TEST_UID);
await signInWithCustomToken(getClientAuth(clientApp), customToken);
console.log(`Signed in as mentee uid=${TEST_UID}\n`);

async function expect(label, shouldAllow, fn) {
  try {
    await fn();
    const ok = shouldAllow;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} -> ALLOWED ${shouldAllow ? '(expected)' : '(SHOULD BE DENIED!)'}`);
    return ok;
  } catch (e) {
    const denied = e?.code === 'permission-denied';
    const ok = !shouldAllow && denied;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} -> ${denied ? 'DENIED' : 'ERROR ' + (e?.code || e?.message)} ${shouldAllow ? '(SHOULD BE ALLOWED!)' : '(expected)'}`);
    return ok;
  }
}

const results = [];
results.push(await expect('read questions (browse)', true, () =>
  getDocs(query(collection(db, 'questions'), where('isActive', '==', true)))));
results.push(await expect('read questionTestCases (secret)', false, () =>
  getDoc(doc(db, 'questionTestCases', 'MRo5qlQZHFngDhsbZ66M'))));
results.push(await expect('read OWN submissions (filtered)', true, () =>
  getDocs(query(collection(db, 'submissions'), where('userId', '==', TEST_UID)))));
results.push(await expect('read ALL submissions (unfiltered)', false, () =>
  getDocs(collection(db, 'submissions'))));
results.push(await expect('forge a submission (create)', false, () =>
  addDoc(collection(db, 'submissions'), {
    userId: TEST_UID, questionId: 'x', isPassed: true, submittedAt: serverTimestamp(),
  })));

console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);

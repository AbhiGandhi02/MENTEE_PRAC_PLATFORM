// End-to-end check of the secured coding-submission path (no browser):
//  1. POST without a token  -> 401 (auth gate)
//  2. Mint a Firebase ID token (custom token -> REST exchange), submit a correct
//     solution to a real question -> server looks up test cases, runs the judge,
//     computes the verdict, and writes the submission. Then clean up.
// Requires: dev server on :3000 and the judge container on :8080.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();
const TEST_UID = 'e2e-verify-user';
const QUESTION_ID = 'MRo5qlQZHFngDhsbZ66M'; // order 1: rotate array
const APP = 'http://localhost:3000';

// 1) Auth gate
const noAuth = await fetch(`${APP}/api/evaluate-code`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ questionId: QUESTION_ID, code: 'x', language: 'python' }),
});
console.log(`[auth gate] no token -> HTTP ${noAuth.status} (expect 401)`);

// 2) Mint an ID token
const customToken = await getAuth().createCustomToken(TEST_UID);
const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const exch = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }
).then((r) => r.json());
const idToken = exch.idToken;
if (!idToken) throw new Error('Failed to mint ID token: ' + JSON.stringify(exch));

// Correct rotate-array solution (reads stdin per the question's input format).
const solution = `import sys
d = sys.stdin.read().split('\\n')
k = int(d[0]); nums = list(map(int, d[1].split()))
n = len(nums); k %= n
print(*(nums[n-k:] + nums[:n-k]))
`;

const res = await fetch(`${APP}/api/evaluate-code`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ questionId: QUESTION_ID, code: solution, language: 'python', timeSpent: 3 }),
}).then((r) => r.json());
console.log('[submit] result:', JSON.stringify(res));

// Confirm the submission was written SERVER-SIDE with the server verdict.
const subs = await db.collection('submissions').where('userId', '==', TEST_UID).get();
console.log(`[persist] submissions written for test user: ${subs.size}`);
subs.forEach((d) => console.log('  ->', JSON.stringify({ isPassed: d.data().isPassed, attempt: d.data().attemptNumber, status: d.data().result?.status })));

// Cleanup test submissions so production data isn't polluted.
const batch = db.batch();
subs.forEach((d) => batch.delete(d.ref));
await batch.commit();
console.log(`[cleanup] deleted ${subs.size} test submission(s)`);
process.exit(0);

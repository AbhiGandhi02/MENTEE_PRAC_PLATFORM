// End-to-end check of /api/submit-answer (maths): auth gate, server-side grading
// (correct AND wrong), and server-written submission. Then clean up.
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
const APP = 'http://localhost:3000';
const TEST_UID = 'e2e-verify-user';

// Find an active MCQ question and read its correct answer (admin side).
const snap = await db.collection('questions')
  .where('subjectId', '==', 'maths').where('type', '==', 'mcq').limit(1).get();
if (snap.empty) { console.log('No MCQ question found; skipping.'); process.exit(0); }
const qDoc = snap.docs[0];
const correctAnswer = qDoc.data().content.correctAnswer;
const wrongAnswer = correctAnswer === 0 ? 1 : 0;
console.log(`Using MCQ ${qDoc.id}, correctAnswer=${correctAnswer}`);

// Mint an ID token.
const customToken = await getAuth().createCustomToken(TEST_UID);
const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const { idToken } = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) }
).then((r) => r.json());

// Auth gate
const noAuth = await fetch(`${APP}/api/submit-answer`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ questionId: qDoc.id, submittedAnswer: correctAnswer }),
});
console.log(`[auth gate] no token -> HTTP ${noAuth.status} (expect 401)`);

const submit = (answer) => fetch(`${APP}/api/submit-answer`, {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ questionId: qDoc.id, submittedAnswer: answer, timeSpent: 2 }),
}).then((r) => r.json());

console.log('[grade correct]', JSON.stringify(await submit(correctAnswer)), '(expect correct:true)');
console.log('[grade wrong]  ', JSON.stringify(await submit(wrongAnswer)), '(expect correct:false)');

// Cleanup
const subs = await db.collection('submissions').where('userId', '==', TEST_UID).get();
const batch = db.batch();
subs.forEach((d) => batch.delete(d.ref));
await batch.commit();
console.log(`[cleanup] deleted ${subs.size} test submission(s)`);
process.exit(0);

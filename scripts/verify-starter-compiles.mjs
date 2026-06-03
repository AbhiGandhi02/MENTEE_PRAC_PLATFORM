// Verify every active ICP question's (unedited) starter code at least compiles
// and runs in the judge — i.e. status is not compilation_error / runtime_error.
// Requires the judge running locally (docker, port 8080).
//   node scripts/verify-starter-compiles.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const JUDGE_URL = process.env.JUDGE_URL || 'http://localhost:8080';
const JUDGE_SECRET = process.env.JUDGE_SECRET || '';

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
const LANGS = ['python', 'javascript', 'cpp', 'java'];

const snap = await db.collection('questions').where('subjectId', '==', 'icp').get();
let bad = 0, checked = 0;

for (const doc of snap.docs) {
  const d = doc.data();
  if (d.type !== 'coding' || d.isActive !== true) continue;
  const c = d.content || {};
  const tc = c.hiddenTestCases?.[0];
  if (!tc) continue;

  for (const lang of LANGS) {
    const code = c.starterCode?.[lang];
    if (!code) { console.log(`MISSING starter ${lang} for order=${d.order}`); bad++; continue; }
    const res = await fetch(`${JUDGE_URL}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(JUDGE_SECRET ? { authorization: `Bearer ${JUDGE_SECRET}` } : {}) },
      body: JSON.stringify({ code, language: lang, testCases: [tc] }),
    });
    const r = await res.json();
    checked++;
    // A clean scaffold should run and just produce a wrong answer ("failed").
    const ok = r.status === 'failed' || r.status === 'passed';
    if (!ok) {
      bad++;
      console.log(`✘ order=${d.order} ${lang}: status=${r.status}  err=${(r.error || '').split('\n')[0]}`);
    }
  }
  console.log(`order=${d.order} checked`);
}

console.log('\n' + '-'.repeat(60));
console.log(`Checked ${checked} scaffolds; problems: ${bad}`);
process.exit(bad ? 1 : 0);

// Read-only: list ICP coding questions and their current starter code.
// Run from MENTEE_PRAC_PLATFORM:  node scripts/inspect-questions.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
const snap = await db.collection('questions').where('subjectId', '==', 'icp').get();
console.log(`ICP questions: ${snap.size}\n`);

for (const doc of snap.docs) {
  const d = doc.data();
  const c = d.content || {};
  console.log('='.repeat(70));
  console.log(`id=${doc.id}  type=${d.type}  order=${d.order}  active=${d.isActive}`);
  console.log(`inputFormat: ${JSON.stringify(c.inputFormat)}`);
  console.log(`outputFormat: ${JSON.stringify(c.outputFormat)}`);
  console.log(`exampleInputs[0]: ${JSON.stringify(c.exampleInputs?.[0])}`);
  console.log(`exampleOutputs[0]: ${JSON.stringify(c.exampleOutputs?.[0])}`);
  console.log(`#hiddenTestCases: ${c.hiddenTestCases?.length ?? 0}`);
  console.log(`hiddenTestCase[0]: ${JSON.stringify(c.hiddenTestCases?.[0])}`);
  const sc = c.starterCode || {};
  for (const lang of ['python', 'javascript', 'cpp', 'java']) {
    console.log(`--- starterCode.${lang} ---\n${sc[lang] ?? '(none)'}`);
  }
}
process.exit(0);

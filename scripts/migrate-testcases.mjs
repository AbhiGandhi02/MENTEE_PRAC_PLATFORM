// Move hidden test cases out of the client-readable `questions/{id}` doc into an
// admin-only `questionTestCases/{questionId}` doc, so mentees can never read them.
// Idempotent: skips questions that have already been migrated.
//
// Usage (from MENTEE_PRAC_PLATFORM):
//   node scripts/migrate-testcases.mjs            # dry run — shows what it would do
//   node scripts/migrate-testcases.mjs --write    # apply
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const WRITE = process.argv.includes('--write');

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
let migrated = 0, skipped = 0;

for (const doc of snap.docs) {
  const d = doc.data();
  if (d.type !== 'coding') { skipped++; continue; }

  const content = d.content || {};
  const testCases = content.hiddenTestCases;

  // Already migrated (field stripped) — leave it.
  if (!testCases) {
    console.log(`SKIP (already migrated) id=${doc.id} order=${d.order}`);
    skipped++;
    continue;
  }
  if (!Array.isArray(testCases) || testCases.length === 0) {
    console.log(`SKIP (no test cases) id=${doc.id} order=${d.order}`);
    skipped++;
    continue;
  }

  console.log(`MIGRATE id=${doc.id} order=${d.order} active=${d.isActive} (${testCases.length} test cases)`);

  if (WRITE) {
    // 1) Write the secret doc.
    await db.collection('questionTestCases').doc(doc.id).set({
      questionId: doc.id,
      testCases,
      updatedAt: Timestamp.now(),
    });
    // 2) Remove the field from the public question doc.
    await doc.ref.update({ 'content.hiddenTestCases': FieldValue.delete() });
    console.log(`  ✔ wrote questionTestCases/${doc.id} and stripped content.hiddenTestCases`);
  }
  migrated++;
}

console.log('\n' + '-'.repeat(60));
console.log(`Done. migrated=${migrated} skipped=${skipped} (write mode: ${WRITE})`);
if (!WRITE) console.log('This was a DRY RUN. Re-run with --write to apply.');
process.exit(0);

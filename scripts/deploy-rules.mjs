// Deploy firestore.rules to the live project using the Admin SDK (no firebase CLI
// / no interactive login needed). Uses the service-account creds in .env.local.
//   node scripts/deploy-rules.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const source = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
console.log('Releasing firestore.rules to project:', process.env.FIREBASE_ADMIN_PROJECT_ID);

const ruleset = await getSecurityRules().releaseFirestoreRulesetFromSource(source);
console.log('✔ Released ruleset:', ruleset.name);
console.log('  created at:', ruleset.createTime);
process.exit(0);

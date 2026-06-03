// Regenerate starter code for existing ICP coding questions so it is a COMPLETE
// runnable program (reads stdin, prints stdout) instead of a LeetCode-style stub.
// Existing hidden test cases are preserved untouched.
//
// Usage (from MENTEE_PRAC_PLATFORM):
//   node scripts/fix-starter-code.mjs            # dry run — prints what it would write
//   node scripts/fix-starter-code.mjs --write    # actually update Firestore
//   node scripts/fix-starter-code.mjs --write --all   # include inactive questions too
//   node scripts/fix-starter-code.mjs --id <docId>    # limit to one question
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const WRITE = process.argv.includes('--write');
const ALL = process.argv.includes('--all');
const ONLY_ID = (() => {
  const i = process.argv.indexOf('--id');
  return i !== -1 ? process.argv[i + 1] : null;
})();

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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

const LANGS = ['python', 'javascript', 'cpp', 'java'];

function buildPrompt(c) {
  const examples = (c.exampleInputs || [])
    .map((inp, i) => `Example ${i + 1}:\nInput:\n${inp}\nOutput:\n${c.exampleOutputs?.[i] ?? ''}`)
    .join('\n---\n');
  return `You are generating COMPLETE, RUNNABLE starter programs for a competitive-programming problem.

The grader runs each program, feeds the test "input" on STANDARD INPUT (stdin), and compares everything printed to STANDARD OUTPUT (stdout) against the expected output. So the starter code must be full programs doing real stdin/stdout I/O — NOT LeetCode-style function signatures.

Problem Description:
${c.problemDescription}

Constraints:
${c.constraints}

Input Format:
${c.inputFormat}

Output Format:
${c.outputFormat}

Examples:
${examples}

INSTRUCTIONS:
Generate COMPLETE, COMPILABLE starter programs for Python, JavaScript (Node.js), C++, and Java. Every program MUST:
- Read the whole input from stdin exactly as described in the Input Format, doing all parsing for the student.
- Print the answer to stdout exactly as described in the Output Format (only the required output — no prompts/labels/debug text).
- Compile and run as-is, but DO NOT solve the problem. The single function the student must complete MUST contain ONLY a comment "TODO: write your solution here" and a minimal placeholder that lets it compile (Python: pass; C++/Java: return a default/empty value or just return; JavaScript: return). Do NOT implement, outline, pseudo-code, or hint at the algorithm anywhere — leave it empty for the student to write.
- Java: the public class MUST be named exactly "Main" and contain "public static void main(String[] args)".
- JavaScript: read all of stdin with require('fs').readFileSync(0, 'utf8').
- C++: a standard int main() reading from std::cin and writing to std::cout.
- Python: read from sys.stdin and call the solution from a top-level entry point.

Return ONLY a single JSON object (no markdown, no extra text):
{ "starterCode": { "python": "...", "javascript": "...", "cpp": "...", "java": "..." } }`;
}

function parseJson(text) {
  let s = text.trim();
  if (s.startsWith('```json')) s = s.replace(/^```json\n/, '').replace(/\n```$/, '');
  else if (s.startsWith('```')) s = s.replace(/^```\n/, '').replace(/\n```$/, '');
  return JSON.parse(s);
}

const snap = await db.collection('questions').where('subjectId', '==', 'icp').get();
let processed = 0, skipped = 0, written = 0;

for (const doc of snap.docs) {
  const d = doc.data();
  const c = d.content || {};
  if (ONLY_ID && doc.id !== ONLY_ID) continue;
  if (d.type !== 'coding') { skipped++; continue; }
  if (!ALL && !ONLY_ID && d.isActive !== true) {
    console.log(`SKIP (inactive) id=${doc.id} order=${d.order}`);
    skipped++;
    continue;
  }
  // Skip obvious placeholder questions (no real input format / examples).
  if (!c.inputFormat || c.inputFormat.length < 8 || !c.exampleInputs?.[0]) {
    console.log(`SKIP (placeholder) id=${doc.id} order=${d.order} inputFormat=${JSON.stringify(c.inputFormat)}`);
    skipped++;
    continue;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Processing id=${doc.id} order=${d.order} active=${d.isActive}`);
  try {
    const res = await model.generateContent(buildPrompt(c));
    const parsed = parseJson(res.response.text());
    const sc = parsed.starterCode || {};
    const missing = LANGS.filter((l) => !sc[l] || typeof sc[l] !== 'string' || !sc[l].trim());
    if (missing.length) throw new Error(`AI response missing languages: ${missing.join(', ')}`);

    for (const l of LANGS) {
      console.log(`--- ${l} ---\n${sc[l]}`);
    }

    if (WRITE) {
      await doc.ref.update({
        'content.starterCode': {
          python: sc.python,
          javascript: sc.javascript,
          cpp: sc.cpp,
          java: sc.java,
        },
        updatedAt: Timestamp.now(),
      });
      console.log(`✔ WROTE starterCode for ${doc.id}`);
      written++;
    }
    processed++;
  } catch (err) {
    console.error(`✘ FAILED id=${doc.id}: ${err instanceof Error ? err.message : err}`);
  }
}

console.log('\n' + '-'.repeat(70));
console.log(`Done. processed=${processed} written=${written} skipped=${skipped} (write mode: ${WRITE})`);
if (!WRITE) console.log('This was a DRY RUN. Re-run with --write to apply.');
process.exit(0);

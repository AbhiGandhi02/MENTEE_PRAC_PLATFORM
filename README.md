# 🎓 Mentee Learning Platform

A comprehensive platform for mentors to manage and evaluate mentee submissions for Data Structures & Algorithms (DSA), maths, and web development problems. Features a full mentee dashboard and a separate admin panel. Submitted code is **actually compiled and run** against hidden test cases inside a sandboxed judge service ([`mentee-judge`](../mentee-judge)) — not "mentally executed" by an LLM.

---

## ✨ Features

### For Mentees
- **Interactive Dashboard** – View subjects, track progress, and monitor upcoming deadlines
- **Code Editor** – Two-column layout with Monaco Editor for solving problems (Python, JavaScript, C++, Java)
- **Sandboxed Execution** – Submissions are compiled and run for real against hidden test cases in the `mentee-judge` service; grading happens server-side
- **Maths & MCQ** – Multiple-choice, multiple-correct, integer (with tolerance), and string questions, graded server-side
- **Submission History** – Review past submissions, view the failing test case, and reload previous code
- **Secure Authentication** – Google sign-in via Firebase with role-based access control

### For Admins
- **Global Analytics** – High-level view of user progress, submission counts, and success rates
- **Mentee Insights** – Deep-dive into individual mentee progress and submission history
- **Content Management** – Create, edit, and (soft-)delete problem sets across subjects
- **AI-Assisted Authoring** – Generate runnable starter code + hidden test cases for coding questions via Google Gemini

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Next.js](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Database** | [Firebase Firestore](https://firebase.google.com/products/firestore) (with security rules — see [`firestore.rules`](firestore.rules)) |
| **Authentication** | [Firebase Auth](https://firebase.google.com/products/auth) |
| **Code Execution** | [`mentee-judge`](../mentee-judge) — sandboxed Fastify service (Python, JS, C++, Java) |
| **AI Engine** | [Google Gemini API](https://ai.google.dev/) — admin question authoring only (not grading) |
| **Code Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |

---

## 🧭 Architecture

```
Browser ──► Next.js API routes ──► mentee-judge (sandbox)   ──► compile + run vs hidden test cases
            /api/evaluate-code        (Docker, port 8080)
            /api/submit-answer  ──► grades maths/MCQ server-side
                  │
                  └─ verifies the user's Firebase token, writes the submission
                     server-side (Admin SDK), and computes isPassed — the client
                     never sees hidden test cases / answer keys or sets isPassed.
```

Hidden test cases live in the admin-only `questionTestCases` Firestore collection (never in the
client-readable question doc). Firestore [`firestore.rules`](firestore.rules) enforce: mentees read
question metadata + their own submissions only; submissions are written server-side only.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Firebase account
- A Google Gemini API key (for admin question authoring)
- [Docker](https://www.docker.com/) — to run the `mentee-judge` code-execution service locally

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/AbhiGandhi02/mentee-prac-platform.git
cd mentee-prac-platform
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure Firebase**

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable **Authentication** → Add Google sign-in provider
3. Enable **Firestore Database** (you may start in test mode, then **deploy the included rules** before going live — see [Security](#-security) below)
4. Navigate to **Project Settings** → **General** → Create a Web App (`</>`)
5. Copy the `firebaseConfig` object (you'll need these values)
6. Navigate to **Project Settings** → **Service Accounts** → Generate new private key
7. Download the JSON file (you'll need values from this)

**4. Get Gemini API Key**

Visit [Google AI Studio](https://ai.google.dev/) and generate an API key

**5. Set up environment variables**

Create a `.env.local` file in the root directory:
```bash
# Firebase Client Keys (from Web App settings)
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# Google Gemini API (admin question authoring)
GEMINI_API_KEY="your_gemini_key"

# Firebase Admin (from service account JSON)
FIREBASE_ADMIN_PROJECT_ID="your_project_id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk@your_project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# mentee-judge code-execution service
JUDGE_URL="http://localhost:8080"
JUDGE_SECRET="dev-secret"   # must match the secret the judge runs with
```

> **⚠️ Important:** For `FIREBASE_ADMIN_PRIVATE_KEY`, copy the entire key from your JSON file including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` headers. Wrap it in double quotes and preserve the `\n` characters.

**6. Start the judge service** (separate terminal — requires Docker)
```bash
cd ../mentee-judge
docker compose up --build        # serves the sandbox on http://localhost:8080
```
See [`mentee-judge/README.md`](../mentee-judge/README.md) for details.

**7. Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 📁 Project Structure
```
Mentee_Practice_Platform/
├── MENTEE_PRAC_PLATFORM/      # This Next.js app
│   ├── app/                   #   routes + API (evaluate-code, submit-answer, questions)
│   ├── components/            #   reusable React components
│   ├── lib/                   #   firebase admin/client, middleware (auth, cors), types
│   ├── scripts/               #   admin/maintenance scripts (migration, rules deploy, e2e checks)
│   ├── firestore.rules        #   Firestore security rules
│   ├── firebase.json          #   wires rules + indexes for `firebase deploy`
│   └── .env.local             #   environment variables (create this; git-ignored)
└── mentee-judge/              # Sandboxed code-execution service (Docker / Fly.io)
```

### Maintenance scripts (`scripts/`, run with `node scripts/<name>.mjs`)
| Script | Purpose |
|---|---|
| `deploy-rules.mjs` | Deploy `firestore.rules` via the Admin SDK (no Firebase CLI needed) |
| `migrate-testcases.mjs` | Move coding test cases into the admin-only `questionTestCases` collection (`--write` to apply) |
| `inspect-questions.mjs` | List ICP questions + their starter code |
| `fix-starter-code.mjs` | Regenerate runnable starter code for existing questions |
| `verify-rules*.mjs` / `e2e-*.mjs` | Live checks of rules + the server submission paths |

---

## 🔒 Security

- **Hidden test cases & answer integrity:** coding test cases live only in the admin-only `questionTestCases` collection; submissions are graded and written **server-side** (`/api/evaluate-code`, `/api/submit-answer`) after verifying the user's Firebase ID token. Clients can't read test cases or set `isPassed`.
- **Firestore rules** ([`firestore.rules`](firestore.rules)) enforce least privilege. Deploy them before going to production:
  ```bash
  firebase deploy --only firestore:rules      # needs the Firebase CLI + login
  # or, headless (uses .env.local service-account creds):
  node scripts/deploy-rules.mjs
  ```

---

## ☁️ Deployment

- **App → Vercel.** Set the same env vars (Firebase client/admin, `GEMINI_API_KEY`, and `JUDGE_URL`/`JUDGE_SECRET`) in the Vercel project settings. `JUDGE_URL` must point at the deployed judge.
- **Judge → Fly.io.** `cd ../mentee-judge && fly deploy`, then `fly secrets set JUDGE_SECRET=<long-random>` (same value as Vercel's `JUDGE_SECRET`). See [`mentee-judge/README.md`](../mentee-judge/README.md).

---
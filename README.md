# 🎓 Mentee Learning Platform

A comprehensive platform for mentors to manage and evaluate mentee submissions for Data Structures & Algorithms (DSA) and web development problems. Features a full mentee dashboard and separate admin panel with AI-powered code evaluation.

---

## ✨ Features

### For Mentees
- **Interactive Dashboard** – View subjects, track progress, and monitor upcoming deadlines
- **Code Editor** – Two-column layout with Monaco Editor for solving problems
- **AI Evaluation** – Real-time code evaluation against hidden test cases using Google Gemini
- **Submission History** – Review past submissions, view failed test cases, and reload previous code
- **Secure Authentication** – Google sign-in via Firebase with role-based access control

### For Admins
- **Global Analytics** – High-level view of user progress, submission counts, and success rates
- **Mentee Insights** – Deep-dive into individual mentee progress and submission history
- **Content Management** – *(Coming soon)* Create, edit, and manage problem sets

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Next.js](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Database** | [Firebase Firestore](https://firebase.google.com/products/firestore) |
| **Authentication** | [Firebase Auth](https://firebase.google.com/products/auth) |
| **AI Engine** | [Google Gemini API](https://ai.google.dev/) |
| **Code Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Firebase account
- A Google Gemini API key

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
3. Enable **Firestore Database** (start in test mode)
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

# Google Gemini API
GEMINI_API_KEY="your_gemini_key"

# Firebase Admin (from service account JSON)
FIREBASE_ADMIN_PROJECT_ID="your_project_id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk@your_project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **⚠️ Important:** For `FIREBASE_ADMIN_PRIVATE_KEY`, copy the entire key from your JSON file including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` headers. Wrap it in double quotes and preserve the `\n` characters.

**6. Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 📁 Project Structure
```
mentee-prac-platform/
├── app/                # Next.js app directory
├── components/         # Reusable React components
├── lib/               # Utilities and configurations
├── public/            # Static assets
└── .env.local         # Environment variables (create this)
```

---
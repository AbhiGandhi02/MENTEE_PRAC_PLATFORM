'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Plus, Code, Calculator, FileText, AlertCircle, Globe } from 'lucide-react';

export default function AdminCreateQuestionPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/questions')}
            className="text-purple-600 hover:text-purple-700 font-medium mb-4"
          >
            ← Back to Questions
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Question</h1>
          <p className="text-gray-600">Add a new coding or math question for students</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Question Creation Instructions</h3>
              <p className="text-sm text-blue-800 mb-3">
                This page requires a comprehensive form for creating questions. You can add questions directly to Firestore using the Firebase Console for now.
              </p>
              <p className="text-sm text-blue-800 font-medium">
                Collection: <code className="bg-blue-100 px-2 py-1 rounded">questions</code>
              </p>
            </div>
          </div>
        </div>

        {/* Question Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* ICP Coding */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">ICP Coding Question</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create coding problems with test cases for Python, JavaScript, C++, or Java
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Problem description</p>
              <p>• Input/Output format</p>
              <p>• Constraints</p>
              <p>• Example cases with explanations</p>
              <p>• 20 hidden test cases (required)</p>
              <p>• Optional starter code templates</p>
            </div>
          </div>

          {/* Maths MCQ */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Maths Questions</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create mathematical questions with LaTeX support
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Single Choice (MCQ)</p>
              <p>• Multiple Correct Answers</p>
              <p>• Integer Input</p>
              <p>• String Matching</p>
              <p>• KaTeX math rendering</p>
            </div>
          </div>

          {/* Web Dev Debug */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Web Dev Debugging</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create HTML/CSS debugging challenges with live preview
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Broken HTML/CSS code</p>
              <p>• Live preview tabs</p>
              <p>• Requirements list</p>
              <p>• Hints & solutions</p>
              <p>• Automatic grading</p>
            </div>
          </div>
        </div>

        {/* Sample Data Structure */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sample Question Structure (Firestore)</h3>
          
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">ICP Coding Question:</h4>
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "subjectId": "icp",
  "type": "coding",
  "order": 1,
  "isActive": true,
  "deadline": Timestamp,
  "createdAt": serverTimestamp(),
  "updatedAt": serverTimestamp(),
  "createdBy": "admin-uid",
  "content": {
    "problemDescription": "Given an array of integers, find the sum...",
    "constraints": "• 1 <= n <= 10^5\\n• -10^9 <= arr[i] <= 10^9",
    "inputFormat": "First line: integer n\\nSecond line: n space-separated integers",
    "outputFormat": "Print a single integer - the sum of all elements",
    "exampleInputs": ["5\\n1 2 3 4 5", "3\\n-1 0 1"],
    "exampleOutputs": ["15", "0"],
    "explanations": [
      "Sum = 1+2+3+4+5 = 15",
      "Sum = -1+0+1 = 0"
    ],
    "hiddenTestCases": [
      {"input": "5\\n1 2 3 4 5", "expectedOutput": "15"},
      {"input": "3\\n-1 0 1", "expectedOutput": "0"},
      {"input": "1\\n100", "expectedOutput": "100"},
      // ... 17 more test cases (20 total recommended)
    ],
    "starterCode": {
      "python": "def sum_array(arr):\\n    # Write your code\\n    pass\\n\\nif __name__ == '__main__':\\n    n = int(input())\\n    arr = list(map(int, input().split()))\\n    print(sum_array(arr))",
      "javascript": "function sumArray(arr) {\\n    // Write your code\\n    return 0;\\n}\\n// Input handling code...",
      "cpp": "#include <iostream>\\n#include <vector>\\nusing namespace std;\\n\\nlong long sumArray(vector<int>& arr) {\\n    // Write your code\\n    return 0;\\n}\\n\\nint main() {\\n    int n;\\n    cin >> n;\\n    vector<int> arr(n);\\n    for(int i=0; i<n; i++) cin >> arr[i];\\n    cout << sumArray(arr) << endl;\\n    return 0;\\n}",
      "java": "import java.util.*;\\n\\npublic class Solution {\\n    public static long sumArray(int[] arr) {\\n        // Write your code\\n        return 0;\\n    }\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        int[] arr = new int[n];\\n        for(int i=0; i<n; i++) arr[i] = sc.nextInt();\\n        System.out.println(sumArray(arr));\\n    }\\n}"
    }
  }
}

See ICP_QUESTION_TEMPLATE.md for complete guide with 20 test cases example`}
            </pre>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Maths MCQ Question:</h4>
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "subjectId": "maths",
  "type": "mcq",
  "order": 1,
  "isActive": true,
  "deadline": Timestamp,
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
  "createdBy": "admin-uid",
  "content": {
    "questionText": "What is $E = mc^2$?",
    "options": [
      "Einstein's equation",
      "Newton's law",
      "Planck's constant",
      "None of the above"
    ],
    "correctAnswer": 0,
    "explanation": "This is Einstein's mass-energy..."
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Web Dev Debug Question:</h4>
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "subjectId": "webdev",
  "type": "webdev-debug",
  "order": 1,
  "isActive": true,
  "deadline": Timestamp,
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
  "createdBy": "admin-uid",
  "content": {
    "title": "Product Card Layout Challenge",
    "description": "Fix the broken HTML and CSS...",
    "brokenHTML": "<div>...broken code...</div>",
    "brokenCSS": ".card { /* missing properties */ }",
    "solutionHTML": "<div>...fixed code...</div>",
    "solutionCSS": ".card { /* complete properties */ }",
    "requirements": [
      "Fix missing closing tags",
      "Add CSS Grid layout",
      "Add box shadows",
      "Add media queries"
    ],
    "hints": [
      "Check for missing closing tags",
      "Use display: grid for layout"
    ],
    "explanation": "This challenge teaches..."
  }
}

See: webdev-challenges/card-layout-challenge/ for complete example`}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => window.open('https://console.firebase.google.com', '_blank')}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 btn-active"
          >
            <Plus className="w-5 h-5" />
            Open Firebase Console
          </button>
          <button
            onClick={() => router.push('/admin/questions')}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:border-gray-400 transition-all duration-300"
          >
            Cancel
          </button>
        </div>
      </main>
    </div>
  );
}

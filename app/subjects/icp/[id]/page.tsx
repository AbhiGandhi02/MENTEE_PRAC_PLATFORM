'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import CodeEditor from '@/components/CodeEditor';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question, CodingQuestionContent, CodeLanguage, Submission, CodeEvaluationResult } from '@/lib/types';
import { Code, Clock, AlertCircle, CheckCircle2, XCircle, Timer, Loader2, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

const defaultCodeTemplates: Record<CodeLanguage, string> = {
  python: '# Write your Python code here\n\ndef solution():\n    pass\n',
  javascript: '// Write your JavaScript code here\n\nfunction solution() {\n    \n}\n',
  cpp: '// Write your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  java: '// Write your Java code here\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
};

export default function ICPQuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [language, setLanguage] = useState<CodeLanguage>('python');
  const [code, setCode] = useState(defaultCodeTemplates.python); // Initialize with default template
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CodeEvaluationResult | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && db && params.id) {
      loadData();
    }
  }, [user, params.id]);

  const loadData = async (preserveCode: boolean = false) => {
    if (!user || !db || !params.id) return;

    try {
      setLoadingData(true);

      // Fetch question
      const questionDoc = await getDoc(doc(db, 'questions', params.id as string));
      if (questionDoc.exists()) {
        const questionData = {
          id: questionDoc.id,
          ...questionDoc.data(),
        } as Question;
        setQuestion(questionData);
        
        // Load starter code from question if available, but only if not preserving current code
        if (!preserveCode) {
          const content = questionData.content as CodingQuestionContent;
          if (content.starterCode && content.starterCode[language]) {
            setCode(content.starterCode[language] || defaultCodeTemplates[language]);
          } else {
            setCode(defaultCodeTemplates[language]);
          }
        }
      }

      // Fetch user's submissions for this question
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', user.uid),
        where('questionId', '==', params.id)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissionsData: Submission[] = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];
      setSubmissions(submissionsData.sort((a, b) => 
        b.submittedAt.toMillis() - a.submittedAt.toMillis()
      ));

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLanguageChange = (newLanguage: CodeLanguage) => {
    const content = question?.content as CodingQuestionContent;
    
    setLanguage(newLanguage);
    
    // Always load the new language's template
    const newCode = content?.starterCode?.[newLanguage] || defaultCodeTemplates[newLanguage];
    setCode(newCode);
  };

  const handleSubmit = async (code: string) => {
    if (!user || !question || !db) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const startTime = Date.now();

      // Call the API to evaluate code
      const response = await fetch('/api/evaluate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          testCases: (question.content as CodingQuestionContent).hiddenTestCases,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate code');
      }

      const evaluationResult: CodeEvaluationResult = await response.json();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      setResult(evaluationResult);

      // Save submission to Firestore
      await addDoc(collection(db, 'submissions'), {
        questionId: question.id,
        userId: user.uid,
        subjectId: 'icp',
        type: 'coding',
        submittedCode: code,
        language,
        result: evaluationResult,
        submittedAt: serverTimestamp(),
        isPassed: evaluationResult.status === 'passed',
        attemptNumber: submissions.length + 1,
        timeSpent,
      });

      // Show confetti if all tests passed
      if (evaluationResult.status === 'passed') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        setShowExplanation(true);
      }

      // Reload submissions (preserve current code in editor)
      await loadData(true);

    } catch (error) {
      console.error('Error submitting code:', error);
      alert('Failed to evaluate code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Question not found</h2>
            <button
              onClick={() => router.push('/subjects/icp')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              ← Back to ICP
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = question.content as CodingQuestionContent;
  const deadline = question.deadline.toDate();
  const isPassed = submissions.some(s => s.isPassed);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/subjects/icp')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-6 inline-flex items-center gap-2"
        >
          ← Back to ICP Questions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Problem Description */}
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Code className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Problem #{question.order}</h1>
                    <p className="text-sm text-gray-600">Coding Problem</p>
                  </div>
                </div>
                {isPassed && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Solved</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Deadline: {format(deadline, 'PPP')}</span>
              </div>
            </div>

            {/* Problem Description */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Problem Description</h2>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-700">{content.problemDescription}</pre>
              </div>
            </div>

            {/* Input/Output Format */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Input Format</h2>
              <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">{content.inputFormat}</pre>
              
              <h2 className="text-lg font-bold text-gray-900 mb-4 mt-6">Output Format</h2>
              <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">{content.outputFormat}</pre>
            </div>

            {/* Constraints */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Constraints</h2>
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">{content.constraints}</pre>
            </div>

            {/* Examples */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Examples</h2>
              {content.exampleInputs.map((input, index) => (
                <div key={index} className="mb-6 last:mb-0">
                  <h3 className="font-semibold text-gray-900 mb-2">Example {index + 1}</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Input:</p>
                      <pre className="font-mono text-sm bg-gray-50 p-3 rounded-lg">{input}</pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Output:</p>
                      <pre className="font-mono text-sm bg-gray-50 p-3 rounded-lg">{content.exampleOutputs[index]}</pre>
                    </div>
                    {content.explanations[index] && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Explanation:</p>
                        <p className="text-sm text-gray-600">{content.explanations[index]}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Code Editor and Results */}
          <div className="space-y-6">
            {/* Code Editor */}
            <CodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              value={code}
              onChange={setCode}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />

            {/* Submission Result */}
            {result && (
              <div className={`rounded-xl border-2 p-6 ${
                result.status === 'passed' 
                  ? 'bg-green-50 border-green-200' 
                  : result.status === 'failed'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {result.status === 'passed' ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="text-lg font-bold text-green-900">All Tests Passed! 🎉</h3>
                        <p className="text-sm text-green-700">
                          {result.passedTests}/{result.totalTests} test cases passed
                        </p>
                      </div>
                    </>
                  ) : result.status === 'failed' ? (
                    <>
                      <XCircle className="w-8 h-8 text-red-600" />
                      <div>
                        <h3 className="text-lg font-bold text-red-900">Test Failed</h3>
                        <p className="text-sm text-red-700">
                          {result.passedTests}/{result.totalTests} test cases passed
                        </p>
                      </div>
                    </>
                  ) : result.status === 'compilation_error' ? (
                    <>
                      <AlertCircle className="w-8 h-8 text-yellow-600" />
                      <div>
                        <h3 className="text-lg font-bold text-yellow-900">Compilation Error</h3>
                      </div>
                    </>
                  ) : result.status === 'runtime_error' ? (
                    <>
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                      <div>
                        <h3 className="text-lg font-bold text-orange-900">Runtime Error</h3>
                      </div>
                    </>
                  ) : (
                    <>
                      <Timer className="w-8 h-8 text-yellow-600" />
                      <div>
                        <h3 className="text-lg font-bold text-yellow-900">Time Limit Exceeded</h3>
                      </div>
                    </>
                  )}
                </div>

                {/* Failed Test Case Details */}
                {result.status === 'failed' && result.failedTestCase && (
                  <div className="bg-white rounded-lg p-4 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Failed at Test Case #{result.failedTestCase.testNumber}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Input:</p>
                        <pre className="font-mono text-sm bg-gray-50 p-3 rounded">{result.failedTestCase.input}</pre>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Expected Output:</p>
                        <pre className="font-mono text-sm bg-gray-50 p-3 rounded">{result.failedTestCase.expectedOutput}</pre>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Your Output:</p>
                        <pre className="font-mono text-sm bg-gray-50 p-3 rounded">{result.failedTestCase.actualOutput}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {result.error && (
                  <div className="bg-white rounded-lg p-4 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Error Details:</h4>
                    <pre className="font-mono text-sm text-red-600 whitespace-pre-wrap">{result.error}</pre>
                  </div>
                )}

                {/* Execution Time */}
                <div className="mt-4 text-sm text-gray-700">
                  <span className="font-medium">Execution Time:</span> {result.executionTime}ms
                </div>
              </div>
            )}

            {/* Submission History */}
            {submissions.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Submission History ({submissions.length})
                </h3>
                <div className="space-y-3">
                  {submissions.slice(0, 5).map((submission, index) => (
                    <button
                      key={submission.id}
                      onClick={() => setViewingSubmission(submission)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          submission.isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {submission.isPassed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">
                            Attempt #{submission.attemptNumber}
                          </p>
                          <p className="text-xs text-gray-600">
                            {format(submission.submittedAt.toDate(), 'PPp')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 uppercase">{submission.language}</span>
                        <Eye className="w-4 h-4 text-gray-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submission Code Viewer Modal */}
        {viewingSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Attempt #{viewingSubmission.attemptNumber}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(viewingSubmission.submittedAt.toDate(), 'PPp')} • {viewingSubmission.language}
                  </p>
                </div>
                <button
                  onClick={() => setViewingSubmission(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${
                  viewingSubmission.isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {viewingSubmission.isPassed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="font-semibold">
                    {viewingSubmission.isPassed ? 'Passed' : 'Failed'}
                  </span>
                </div>

                {/* Result Summary */}
                {viewingSubmission.result && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Result Summary</h3>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium">Status:</span> {viewingSubmission.result.status}</p>
                      <p><span className="font-medium">Tests Passed:</span> {viewingSubmission.result.passedTests}/{viewingSubmission.result.totalTests}</p>
                      <p><span className="font-medium">Execution Time:</span> {viewingSubmission.result.executionTime}ms</p>
                    </div>
                  </div>
                )}

                {/* Code */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Submitted Code</h3>
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm text-gray-100 font-mono">
                        {viewingSubmission.submittedCode}
                      </code>
                    </pre>
                  </div>
                </div>

                {/* Load Code Button */}
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setCode(viewingSubmission.submittedCode || '');
                      setLanguage(viewingSubmission.language || 'python');
                      setViewingSubmission(null);
                    }}
                    className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Code className="w-5 h-5" />
                    <span>Load This Code into Editor</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

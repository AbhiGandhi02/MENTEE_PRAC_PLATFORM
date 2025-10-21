'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question, Submission, User } from '@/lib/types';
import { 
  User as UserIcon, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Code,
  Clock,
  Award,
  BarChart3,
  AlertCircle,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface QuestionAnalytics {
  question: Question;
  submissions: Submission[];
  totalAttempts: number;
  passed: boolean;
  bestScore?: number;
  latestSubmission?: Submission;
}

export default function MenteeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAdmin, loading } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [mentee, setMentee] = useState<User | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    completedQuestions: 0,
    totalSubmissions: 0,
    passedSubmissions: 0,
    failedSubmissions: 0,
    averageAttempts: 0,
    subjectProgress: {
      icp: { completed: 0, total: 0 },
      maths: { completed: 0, total: 0 },
      webdev: { completed: 0, total: 0 },
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (user && isAdmin && db && params.userId) {
      loadMenteeData();
    }
  }, [user, isAdmin, params.userId]);

  const loadMenteeData = async () => {
    if (!db || !params.userId) return;

    try {
      setLoadingData(true);

      // Fetch mentee user data
      const userDoc = await getDoc(doc(db, 'users', params.userId as string));
      if (!userDoc.exists()) {
        console.error('User not found');
        return;
      }
      const menteeData = { uid: userDoc.id, ...userDoc.data() } as User;
      setMentee(menteeData);

      // Fetch all questions
      const questionsSnapshot = await getDocs(collection(db, 'questions'));
      const questions = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];

      // Fetch mentee's submissions
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', params.userId)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissions = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];

      // Group submissions by question
      const questionMap = new Map<string, QuestionAnalytics>();
      
      questions.forEach(q => {
        const questionSubmissions = submissions.filter(s => s.questionId === q.id);
        const passed = questionSubmissions.some(s => s.isPassed);
        const passedSubmissions = questionSubmissions.filter(s => s.isPassed);
        
        let bestScore = undefined;
        if (q.type === 'coding' && passedSubmissions.length > 0) {
          const scores = passedSubmissions
            .map(s => s.result?.passedTests || 0)
            .filter(score => score > 0);
          bestScore = scores.length > 0 ? Math.max(...scores) : undefined;
        }

        const latestSubmission = questionSubmissions.length > 0
          ? questionSubmissions.sort((a, b) => b.submittedAt.toMillis() - a.submittedAt.toMillis())[0]
          : undefined;

        questionMap.set(q.id, {
          question: q,
          submissions: questionSubmissions,
          totalAttempts: questionSubmissions.length,
          passed,
          bestScore,
          latestSubmission,
        });
      });

      const analytics = Array.from(questionMap.values()).sort((a, b) => a.question.order - b.question.order);
      setQuestionAnalytics(analytics);

      // Calculate stats
      const totalQuestions = questions.length;
      const completedQuestions = analytics.filter(a => a.passed).length;
      const totalSubmissions = submissions.length;
      const passedSubmissions = submissions.filter(s => s.isPassed).length;
      const failedSubmissions = totalSubmissions - passedSubmissions;
      const averageAttempts = completedQuestions > 0
        ? analytics.filter(a => a.passed).reduce((sum, a) => sum + a.totalAttempts, 0) / completedQuestions
        : 0;

      const subjectProgress = {
        icp: {
          total: questions.filter(q => q.subjectId === 'icp').length,
          completed: analytics.filter(a => a.question.subjectId === 'icp' && a.passed).length,
        },
        maths: {
          total: questions.filter(q => q.subjectId === 'maths').length,
          completed: analytics.filter(a => a.question.subjectId === 'maths' && a.passed).length,
        },
        webdev: {
          total: questions.filter(q => q.subjectId === 'webdev').length,
          completed: analytics.filter(a => a.question.subjectId === 'webdev' && a.passed).length,
        },
      };

      setStats({
        totalQuestions,
        completedQuestions,
        totalSubmissions,
        passedSubmissions,
        failedSubmissions,
        averageAttempts,
        subjectProgress,
      });

    } catch (error) {
      console.error('Error loading mentee data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getSubjectColor = (subjectId: string) => {
    switch (subjectId) {
      case 'icp': return 'blue';
      case 'maths': return 'purple';
      case 'webdev': return 'green';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'green';
      case 'failed': return 'red';
      case 'compilation_error': return 'yellow';
      case 'runtime_error': return 'orange';
      case 'tle': return 'yellow';
      default: return 'gray';
    }
  };

  const toDate = (timestamp: any): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp?.toDate) return timestamp.toDate();
    return new Date();
  };

  if (loading || loadingData) {
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

  if (!isAdmin || !mentee) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/analytics')}
            className="text-purple-600 hover:text-purple-700 font-medium mb-4"
          >
            ← Back to Analytics
          </button>
          
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{mentee.name}</h1>
                  <p className="text-gray-600">{mentee.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {format(toDate(mentee.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round((stats.completedQuestions / stats.totalQuestions) * 100)}%
                </div>
                <p className="text-sm text-gray-600">Overall Progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.completedQuestions}/{stats.totalQuestions}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600">Total Submissions</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalSubmissions > 0 
                ? Math.round((stats.passedSubmissions / stats.totalSubmissions) * 100)
                : 0}%
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-600">Avg Attempts</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.averageAttempts.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Subject Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(stats.subjectProgress).map(([subject, progress]) => {
            const color = getSubjectColor(subject);
            const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
            
            return (
              <div key={subject} className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <h3 className={`text-lg font-bold text-${color}-600 mb-4 uppercase`}>{subject}</h3>
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-bold text-gray-900">
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-600 transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{Math.round(percentage)}%</p>
              </div>
            );
          })}
        </div>

        {/* Question-by-Question Analysis */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Question-by-Question Analysis</h2>
          
          {questionAnalytics.length > 0 ? (
            <div className="space-y-4">
              {questionAnalytics.map((qa) => {
                const color = getSubjectColor(qa.question.subjectId);
                
                return (
                  <div key={qa.question.id} className="border-2 border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 bg-${color}-50 text-${color}-700 text-xs font-semibold rounded-full uppercase`}>
                            {qa.question.subjectId}
                          </span>
                          <span className="text-sm font-medium text-gray-600">
                            Question #{qa.question.order}
                          </span>
                          {qa.passed && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Code className="w-4 h-4" />
                            <span>{qa.question.type}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>{qa.totalAttempts} attempt{qa.totalAttempts !== 1 ? 's' : ''}</span>
                          </div>
                          {qa.latestSubmission && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Last: {format(toDate(qa.latestSubmission.submittedAt), 'MMM dd, HH:mm')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {qa.passed && qa.bestScore !== undefined && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Best Score</p>
                          <p className="text-lg font-bold text-green-600">{qa.bestScore}/20</p>
                        </div>
                      )}
                    </div>

                    {/* Submissions */}
                    {qa.submissions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Submissions ({qa.submissions.length})
                        </h4>
                        <div className="space-y-2">
                          {qa.submissions
                            .sort((a, b) => b.submittedAt.toMillis() - a.submittedAt.toMillis())
                            .map((submission, idx) => {
                              const statusColor = getStatusColor(submission.result?.status || '');
                              
                              return (
                                <div
                                  key={submission.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-600">
                                      #{qa.submissions.length - idx}
                                    </span>
                                    {submission.isPassed ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-sm text-gray-900">
                                        {format(toDate(submission.submittedAt), 'MMM dd, yyyy HH:mm:ss')}
                                      </span>
                                      {submission.language && (
                                        <span className="text-xs text-gray-600">{submission.language}</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    {submission.result && (
                                      <div className="text-right">
                                        <p className={`text-xs font-semibold text-${statusColor}-700 uppercase`}>
                                          {submission.result.status}
                                        </p>
                                        {submission.result.passedTests !== undefined && (
                                          <p className="text-xs text-gray-600">
                                            {submission.result.passedTests}/{submission.result.totalTests} tests
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    <button
                                      onClick={() => setSelectedSubmission(submission)}
                                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                      <Eye className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {qa.submissions.length === 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 text-center py-4">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No submissions yet</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No questions available</p>
            </div>
          )}
        </div>
      </main>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submission Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {format(toDate(selectedSubmission.submittedAt), 'PPpp')}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${
                selectedSubmission.isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {selectedSubmission.isPassed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-semibold">
                  {selectedSubmission.isPassed ? 'Passed' : 'Failed'}
                </span>
              </div>

              {/* Result Summary */}  
              {selectedSubmission.result && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Result Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className="font-medium text-gray-900">{selectedSubmission.result.status}</p>
                    </div>
                    {selectedSubmission.result.passedTests !== undefined && (
                      <div>
                        <p className="text-gray-600">Tests Passed</p>
                        <p className="font-medium text-gray-900">
                          {selectedSubmission.result.passedTests}/{selectedSubmission.result.totalTests}
                        </p>
                      </div>
                    )}
                    {selectedSubmission.result.executionTime !== undefined && (
                      <div>
                        <p className="text-gray-600">Execution Time</p>
                        <p className="font-medium text-gray-900">{selectedSubmission.result.executionTime}ms</p>
                      </div>
                    )}
                    {selectedSubmission.timeSpent !== undefined && (
                      <div>
                        <p className="text-gray-600">Time Spent</p>
                        <p className="font-medium text-gray-900">{selectedSubmission.timeSpent}s</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Code */}
              {selectedSubmission.submittedCode && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Submitted Code</h3>
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm text-gray-100 font-mono">
                        {selectedSubmission.submittedCode}
                      </code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedSubmission.result?.error && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Error Details</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono">
                      {selectedSubmission.result.error}
                    </pre>
                  </div>
                </div>
              )}

              {/* Failed Test Case */}
              {selectedSubmission.result?.failedTestCase && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Failed Test Case #{selectedSubmission.result.failedTestCase.testNumber}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Input:</p>
                      <pre className="text-sm bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                        {selectedSubmission.result.failedTestCase.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Expected Output:</p>
                      <pre className="text-sm bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                        {selectedSubmission.result.failedTestCase.expectedOutput}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Actual Output:</p>
                      <pre className="text-sm bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                        {selectedSubmission.result.failedTestCase.actualOutput}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

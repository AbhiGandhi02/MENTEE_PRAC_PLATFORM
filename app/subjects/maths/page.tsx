'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import QuestionCard from '@/components/QuestionCard';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question, Submission } from '@/lib/types';
import { Calculator, Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

type FilterType = 'all' | 'pending' | 'completed' | 'overdue';

export default function MathsSubjectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && db) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user || !db) return;

    try {
      setLoadingData(true);

      // Fetch Maths questions
      const questionsQuery = query(
        collection(db, 'questions'),
        where('subjectId', '==', 'maths'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      const questionsData: Question[] = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];
      setQuestions(questionsData);

      // Fetch user's submissions for Maths
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', user.uid),
        where('subjectId', '==', 'maths')
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissionsData: Submission[] = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];
      setSubmissions(submissionsData);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
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

  // Get completed question IDs
  const completedQuestionIds = new Set(
    submissions.filter(s => s.isPassed).map(s => s.questionId)
  );

  // Filter questions
  const now = new Date();
  const filteredQuestions = questions.filter(question => {
    const isCompleted = completedQuestionIds.has(question.id);
    const deadline = question.deadline.toDate();
    const isOverdue = !isCompleted && deadline < now;

    switch (filter) {
      case 'completed':
        return isCompleted;
      case 'pending':
        return !isCompleted && !isOverdue;
      case 'overdue':
        return isOverdue;
      default:
        return true;
    }
  });

  // Stats
  const totalQuestions = questions.length;
  const completedCount = completedQuestionIds.size;
  const overdueCount = questions.filter(q => {
    const isCompleted = completedQuestionIds.has(q.id);
    return !isCompleted && q.deadline.toDate() < now;
  }).length;
  const pendingCount = totalQuestions - completedCount - overdueCount;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-purple-600 hover:text-purple-700 font-medium mb-4 inline-flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Maths for ML</h1>
              <p className="text-gray-600 mt-1">Master mathematics for machine learning</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-600" />
          <div className="flex gap-2">
            {(['all', 'pending', 'completed', 'overdue'] as FilterType[]).map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  filter === filterType
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
        </div>

        {/* Questions List */}
        {filteredQuestions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredQuestions.map(question => (
              <QuestionCard
                key={question.id}
                question={question}
                isCompleted={completedQuestionIds.has(question.id)}
                subjectId="maths"
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
            <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No math problems available yet. Check back soon!'
                : `No ${filter} questions at the moment.`}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

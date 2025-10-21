'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import SubjectCard from '@/components/SubjectCard';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question, Submission, DashboardStats } from '@/lib/types';
import { TrendingUp, Award, Target } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && db) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user || !db) return;

    try {
      setLoadingStats(true);

      // Fetch all active questions
      const questionsQuery = query(
        collection(db, 'questions'),
        where('isActive', '==', true)
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      const questions: Question[] = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];

      // Fetch user's submissions
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', user.uid)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissions: Submission[] = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];

      // Calculate stats for each subject
      const subjects = [
        {
          id: 'icp' as const,
          name: 'ICP (Coding Problems)',
          description: 'Practice coding problems with multiple languages',
          isActive: true,
        },
        {
          id: 'maths' as const,
          name: 'Maths for ML',
          description: 'Master mathematics for machine learning',
          isActive: false,
        },
        {
          id: 'webdev' as const,
          name: 'Web Development',
          description: 'Debug and fix HTML/CSS code challenges',
          isActive: false,
        },
      ];

      const stats: DashboardStats[] = subjects.map(subject => {
        const subjectQuestions = questions.filter(q => q.subjectId === subject.id);
        const completedQuestionIds = new Set(
          submissions
            .filter(s => s.subjectId === subject.id && s.isPassed)
            .map(s => s.questionId)
        );

        const totalCount = subjectQuestions.length;
        const completedCount = completedQuestionIds.size;
        const pendingCount = totalCount - completedCount;

        // Find nearest deadline
        const now = new Date();
        const upcomingQuestions = subjectQuestions
          .filter(q => {
            const deadline = q.deadline instanceof Timestamp ? q.deadline.toDate() : q.deadline;
            return !completedQuestionIds.has(q.id) && deadline > now;
          })
          .sort((a, b) => {
            const dateA = a.deadline instanceof Timestamp ? a.deadline.toDate() : a.deadline;
            const dateB = b.deadline instanceof Timestamp ? b.deadline.toDate() : b.deadline;
            return dateA.getTime() - dateB.getTime();
          });

        const nearestDeadline = upcomingQuestions.length > 0
          ? (upcomingQuestions[0].deadline instanceof Timestamp
            ? upcomingQuestions[0].deadline.toDate()
            : upcomingQuestions[0].deadline)
          : undefined;

        return {
          subjectId: subject.id,
          pendingCount,
          completedCount,
          totalCount,
          nearestDeadline,
        };
      });

      setDashboardStats(stats);

      // Calculate overall stats
      const totalQuestions = stats.reduce((sum, s) => sum + s.totalCount, 0);
      const totalCompletedQuestions = stats.reduce((sum, s) => sum + s.completedCount, 0);
      setTotalCompleted(totalCompletedQuestions);
      setOverallProgress(totalQuestions > 0 ? (totalCompletedQuestions / totalQuestions) * 100 : 0);

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || loadingStats) {
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

  const subjects = [
    {
      id: 'icp' as const,
      name: 'ICP (Coding Problems)',
      description: 'Practice coding problems with multiple languages',
      isActive: true,
    },
    {
      id: 'maths' as const,
      name: 'Maths for ML',
      description: 'Master mathematics for machine learning',
      isActive: false,
    },
    {
      id: 'webdev' as const,
      name: 'Web Development',
      description: 'Debug and fix HTML/CSS code challenges',
      isActive: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            Continue your learning journey and track your progress
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{totalCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(overallProgress)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Subjects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {subjects.filter(s => s.isActive).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Cards */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map(subject => {
              const stats = dashboardStats.find(s => s.subjectId === subject.id);
              return (
                <SubjectCard
                  key={subject.id}
                  subjectId={subject.id}
                  name={subject.name}
                  description={subject.description}
                  pendingCount={stats?.pendingCount || 0}
                  completedCount={stats?.completedCount || 0}
                  totalCount={stats?.totalCount || 0}
                  nearestDeadline={stats?.nearestDeadline}
                  isActive={subject.isActive}
                />
              );
            })}
          </div>
        </div>

        {/* Motivational Message */}
        {totalCompleted > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
            <p className="text-center text-gray-700">
              <span className="font-semibold">Great job!</span> You've completed {totalCompleted}{' '}
              {totalCompleted === 1 ? 'question' : 'questions'}. Keep up the excellent work! 🎉
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

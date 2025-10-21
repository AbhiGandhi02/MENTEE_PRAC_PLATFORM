'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question, Submission, User } from '@/lib/types';
import { BarChart3, Users, TrendingUp, CheckCircle2, XCircle, Target } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    passedSubmissions: 0,
    failedSubmissions: 0,
    subjectStats: {
      icp: { total: 0, passed: 0, failed: 0 },
      maths: { total: 0, passed: 0, failed: 0 },
      webdev: { total: 0, passed: 0, failed: 0 },
    },
    userProgress: [] as { userId: string, userName: string, completed: number, total: number }[],
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (user && isAdmin && db) {
      loadAnalytics();
    }
  }, [user, isAdmin]);

  const loadAnalytics = async () => {
    if (!db) return;

    try {
      setLoadingData(true);

      // Fetch all submissions
      const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
      const submissions = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];

      const totalSubmissions = submissions.length;
      const passedSubmissions = submissions.filter(s => s.isPassed).length;
      const failedSubmissions = totalSubmissions - passedSubmissions;

      // Calculate subject stats
      const subjectStats = {
        icp: {
          total: submissions.filter(s => s.subjectId === 'icp').length,
          passed: submissions.filter(s => s.subjectId === 'icp' && s.isPassed).length,
          failed: submissions.filter(s => s.subjectId === 'icp' && !s.isPassed).length,
        },
        maths: {
          total: submissions.filter(s => s.subjectId === 'maths').length,
          passed: submissions.filter(s => s.subjectId === 'maths' && s.isPassed).length,
          failed: submissions.filter(s => s.subjectId === 'maths' && !s.isPassed).length,
        },
        webdev: {
          total: submissions.filter(s => s.subjectId === 'webdev').length,
          passed: submissions.filter(s => s.subjectId === 'webdev' && s.isPassed).length,
          failed: submissions.filter(s => s.subjectId === 'webdev' && !s.isPassed).length,
        },
      };

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      } as User));

      // Fetch all questions
      const questionsSnapshot = await getDocs(collection(db, 'questions'));
      const totalQuestions = questionsSnapshot.size;

      // Calculate user progress
      const userProgress = users.map(u => {
        const userSubmissions = submissions.filter(s => s.userId === u.uid && s.isPassed);
        const uniqueQuestions = new Set(userSubmissions.map(s => s.questionId));
        return {
          userId: u.uid,
          userName: u.name,
          completed: uniqueQuestions.size,
          total: totalQuestions,
        };
      }).sort((a, b) => b.completed - a.completed);

      setAnalytics({
        totalUsers: users.length,
        totalSubmissions,
        passedSubmissions,
        failedSubmissions,
        subjectStats,
        userProgress: userProgress, // All users
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-purple-600 hover:text-purple-700 font-medium mb-4"
          >
            ← Back to Admin Dashboard
          </button>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          </div>
          <p className="text-gray-600">Track submission stats and user progress</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalSubmissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.passedSubmissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.failedSubmissions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(analytics.subjectStats).map(([subject, stats]) => (
            <div key={subject} className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">{subject}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Submissions</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Passed</span>
                  <span className="text-lg font-semibold text-green-600">{stats.passed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Failed</span>
                  <span className="text-lg font-semibold text-red-600">{stats.failed}</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Success Rate</span>
                    <span className="text-sm font-bold text-gray-900">
                      {stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.passed / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* All Users */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">All Users</h2>
          {analytics.userProgress.length > 0 ? (
            <div className="space-y-3">
              {analytics.userProgress.map((userStat, index) => {
                const progressPercentage = userStat.total > 0 ? (userStat.completed / userStat.total) * 100 : 0;
                
                return (
                  <button
                    key={userStat.userId}
                    onClick={() => router.push(`/admin/analytics/mentee/${userStat.userId}`)}
                    className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 hover:text-purple-600 transition-colors">
                            {userStat.userName}
                          </p>
                          <p className="text-xs text-gray-600">
                            {userStat.completed} / {userStat.total} questions completed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {Math.round(progressPercentage)}%
                        </p>
                        <p className="text-xs text-purple-600">View Details →</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No user progress data yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

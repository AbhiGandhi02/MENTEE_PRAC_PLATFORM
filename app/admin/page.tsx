'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question, Submission } from '@/lib/types';
import { Shield, FileText, Users, BarChart3, CheckCircle2, XCircle, Clock, Plus, Settings } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalSubmissions: 0,
    totalUsers: 0,
    recentSubmissions: [] as Submission[],
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
      loadData();
    }
  }, [user, isAdmin]);

  const loadData = async () => {
    if (!db) return;

    try {
      setLoadingData(true);

      // Fetch all questions
      const questionsSnapshot = await getDocs(collection(db, 'questions'));
      const totalQuestions = questionsSnapshot.size;

      // Fetch all submissions
      const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
      const totalSubmissions = submissionsSnapshot.size;

      // Fetch recent submissions
      const recentSubmissionsQuery = query(
        collection(db, 'submissions'),
        orderBy('submittedAt', 'desc'),
        limit(10)
      );
      const recentSubmissionsSnapshot = await getDocs(recentSubmissionsQuery);
      const recentSubmissions = recentSubmissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      setStats({
        totalQuestions,
        totalSubmissions,
        totalUsers,
        recentSubmissions,
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
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
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">Manage questions, view analytics, and monitor submissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/questions/create')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-4 btn-active"
            >
              <Plus className="w-8 h-8" />
              <div className="text-left">
                <p className="font-semibold text-lg">Create Question</p>
                <p className="text-sm text-blue-100">Add new coding or maths problem</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/questions')}
              className="bg-white border-2 border-gray-200 text-gray-900 p-6 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-300 flex items-center gap-4 card-hover"
            >
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="text-left">
                <p className="font-semibold text-lg">Manage Questions</p>
                <p className="text-sm text-gray-600">Edit or delete questions</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/analytics')}
              className="bg-white border-2 border-gray-200 text-gray-900 p-6 rounded-xl hover:border-purple-300 hover:shadow-md transition-all duration-300 flex items-center gap-4 card-hover"
            >
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="text-left">
                <p className="font-semibold text-lg">View Analytics</p>
                <p className="text-sm text-gray-600">Track user progress</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Submissions</h2>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View All →
            </button>
          </div>

          {stats.recentSubmissions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      submission.isPassed 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {submission.isPassed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {submission.userId.substring(0, 8)}... • {submission.subjectId.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {submission.type === 'coding' 
                          ? `${submission.language} submission` 
                          : `${submission.type} question`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      submission.isPassed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {submission.isPassed ? 'Passed' : 'Failed'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(submission.submittedAt.toDate(), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No submissions yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

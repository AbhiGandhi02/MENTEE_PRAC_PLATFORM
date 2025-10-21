'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { collection, getDocs, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question } from '@/lib/types';
import { FileText, Plus, Edit2, Trash2, Filter, Code, Calculator, Globe } from 'lucide-react';
import { format } from 'date-fns';

type SubjectFilter = 'all' | 'icp' | 'maths' | 'webdev';

export default function AdminQuestionsPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (user && isAdmin && db) {
      loadQuestions();
    }
  }, [user, isAdmin]);

  const loadQuestions = async () => {
    if (!db) return;

    try {
      setLoadingData(true);
      const questionsSnapshot = await getDocs(query(collection(db, 'questions'), orderBy('createdAt', 'desc')));
      const questionsData = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await deleteDoc(doc(db, 'questions', questionId));
      alert('Question deleted successfully!');
      loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question.');
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

  const filteredQuestions = subjectFilter === 'all'
    ? questions
    : questions.filter(q => q.subjectId === subjectFilter);

  const subjectIcons = {
    icp: Code,
    maths: Calculator,
    webdev: Globe,
  };

  const subjectColors = {
    icp: 'text-blue-600 bg-blue-50',
    maths: 'text-purple-600 bg-purple-50',
    webdev: 'text-green-600 bg-green-50',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-purple-600 hover:text-purple-700 font-medium mb-4"
            >
              ← Back to Admin Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Manage Questions</h1>
            <p className="text-gray-600 mt-1">View, edit, and delete questions</p>
          </div>
          <button
            onClick={() => router.push('/admin/questions/create')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-2 btn-active"
          >
            <Plus className="w-5 h-5" />
            Create Question
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <div className="flex gap-2">
              {(['all', 'icp', 'maths', 'webdev'] as SubjectFilter[]).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSubjectFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                    subjectFilter === filter
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? 'All Subjects' : filter.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="ml-auto text-sm text-gray-600">
              {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Questions List */}
        {filteredQuestions.length > 0 ? (
          <div className="space-y-4">
            {filteredQuestions.map((question) => {
              const Icon = subjectIcons[question.subjectId];
              const colorClass = subjectColors[question.subjectId];

              return (
                <div
                  key={question.id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-purple-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Question #{question.order}
                          </h3>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md uppercase font-medium">
                            {question.type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-md uppercase font-medium ${colorClass}`}>
                            {question.subjectId}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {question.type === 'coding'
                            ? (question.content as any).problemDescription.split('\n')[0]
                            : (question.content as any).questionText?.substring(0, 150) + '...'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Deadline: {format(question.deadline.toDate(), 'MMM d, yyyy')}</span>
                          <span>•</span>
                          <span>Created: {format(question.createdAt.toDate(), 'MMM d, yyyy')}</span>
                          <span>•</span>
                          <span className={question.isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {question.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/admin/questions/${question.id}/edit`)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="Edit question"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-600 mb-6">
              {subjectFilter === 'all'
                ? 'Start by creating your first question'
                : `No questions found for ${subjectFilter.toUpperCase()}`}
            </p>
            <button
              onClick={() => router.push('/admin/questions/create')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Question
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

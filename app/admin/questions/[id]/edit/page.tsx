'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question } from '@/lib/types';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';

export default function AdminEditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAdmin, loading } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (user && isAdmin && db && params.id) {
      loadQuestion();
    }
  }, [user, isAdmin, params.id]);

  const loadQuestion = async () => {
    if (!db || !params.id) return;

    try {
      setLoadingData(true);
      const questionDoc = await getDoc(doc(db, 'questions', params.id as string));
      
      if (questionDoc.exists()) {
        const questionData = {
          id: questionDoc.id,
          ...questionDoc.data(),
        } as Question;
        
        setQuestion(questionData);
        setIsActive(questionData.isActive);
        
        // Format deadline for input
        const deadlineDate = questionData.deadline.toDate();
        const formattedDeadline = deadlineDate.toISOString().slice(0, 16);
        setDeadline(formattedDeadline);
      } else {
        alert('Question not found');
        router.push('/admin/questions');
      }
    } catch (error) {
      console.error('Error loading question:', error);
      alert('Failed to load question');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!question || !db) return;

    try {
      setSaving(true);

      const deadlineDate = new Date(deadline);
      
      await updateDoc(doc(db, 'questions', question.id), {
        isActive,
        deadline: deadlineDate,
        updatedAt: serverTimestamp(),
      });

      alert('Question updated successfully!');
      router.push('/admin/questions');
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question');
    } finally {
      setSaving(false);
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

  if (!isAdmin || !question) {
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
            className="text-purple-600 hover:text-purple-700 font-medium mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Questions
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Question</h1>
          <p className="text-gray-600">Update question settings and status</p>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 text-sm mb-1">Limited Edit Functionality</h3>
              <p className="text-sm text-blue-800">
                Currently, you can only edit the deadline and active status. To edit question content, 
                use the Firebase Console or create a new question.
              </p>
            </div>
          </div>
        </div>

        {/* Question Preview */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Question Preview</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Question ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{question.id}</code>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Order:</span>
              <span className="font-semibold text-gray-900">#{question.order}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Subject:</span>
              <span className="px-2 py-1 bg-gray-100 rounded uppercase font-medium text-gray-900">
                {question.subjectId}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Type:</span>
              <span className="px-2 py-1 bg-gray-100 rounded uppercase font-medium text-gray-900">
                {question.type}
              </span>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <span className="text-gray-600 block mb-2">Content Preview:</span>
              <div className="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-gray-800 text-sm line-clamp-3">
                  {question.type === 'coding'
                    ? (question.content as any).problemDescription
                    : (question.content as any).questionText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Edit Settings</h3>

          <div className="space-y-6">
            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">
                Students will be able to submit until this deadline
              </p>
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Status
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsActive(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setIsActive(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    !isActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Inactive
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {isActive 
                  ? 'Question is visible to students' 
                  : 'Question is hidden from students'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 btn-active ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => router.push('/admin/questions')}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:border-gray-400 transition-all duration-300"
          >
            Cancel
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-600 text-center">
            <strong>Note:</strong> To edit question content (description, options, test cases, etc.), 
            please use the Firebase Console or delete and recreate the question.
          </p>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Globe, ArrowLeft, Construction } from 'lucide-react'; // Added Construction icon

export default function AdminCreateWebDevPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  // --- Auth Guard ---
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  // --- Loading State ---
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

  // --- Final Admin Check ---
  if (!isAdmin) {
    return null;
  }

  // --- JSX ---
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/questions/create')} // Back to the type selection
            className="text-purple-600 hover:text-purple-700 font-medium mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Question Types
          </button>
          <div className="flex items-center gap-3 mb-2">
             <Globe className="w-8 h-8 text-green-600" />
             <h1 className="text-3xl font-bold text-gray-900">Create Web Dev Question</h1>
          </div>
          <p className="text-gray-600">Define a new HTML/CSS debugging challenge.</p>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center shadow-sm">
            <Construction className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Coming Soon!</h2>
            <p className="text-gray-600">
                The form for creating Web Development debugging challenges is under construction.
            </p>
        </div>

      </main>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import MathRenderer from '@/components/MathRenderer';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Question, MCQQuestionContent, MultipleQuestionContent, IntegerQuestionContent, StringQuestionContent, Submission } from '@/lib/types';
import { Calculator, Clock, CheckCircle2, XCircle, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

export default function MathsQuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
  const [integerAnswer, setIntegerAnswer] = useState('');
  const [stringAnswer, setStringAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

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

  const loadData = async () => {
    if (!user || !db || !params.id) return;

    try {
      setLoadingData(true);

      // Fetch question
      const questionDoc = await getDoc(doc(db, 'questions', params.id as string));
      if (questionDoc.exists()) {
        setQuestion({
          id: questionDoc.id,
          ...questionDoc.data(),
        } as Question);
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

      // If already passed, show explanation
      if (submissionsData.some(s => s.isPassed)) {
        setShowExplanation(true);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleMCQSubmit = async () => {
    if (!user || !question || !db || selectedOption === null) return;
    
    const content = question.content as MCQQuestionContent;
    const correct = selectedOption === content.correctAnswer;

    await submitAnswer(selectedOption, correct);
  };

  const handleMultipleSubmit = async () => {
    if (!user || !question || !db || selectedOptions.size === 0) return;
    
    const content = question.content as MultipleQuestionContent;
    const selectedArray = Array.from(selectedOptions).sort();
    const correctArray = content.correctAnswers.sort();
    const correct = JSON.stringify(selectedArray) === JSON.stringify(correctArray);

    await submitAnswer(selectedArray, correct);
  };

  const handleIntegerSubmit = async () => {
    if (!user || !question || !db || !integerAnswer) return;
    
    const content = question.content as IntegerQuestionContent;
    const userAnswer = parseFloat(integerAnswer);
    const correct = Math.abs(userAnswer - content.correctAnswer) <= (content.tolerance || 0.01);

    await submitAnswer(userAnswer, correct);
  };

  const handleStringSubmit = async () => {
    if (!user || !question || !db || !stringAnswer) return;
    
    const content = question.content as StringQuestionContent;
    let userAnswerProcessed = stringAnswer.trim();
    let correctAnswerProcessed = content.correctAnswer.trim();

    if (!content.caseSensitive) {
      userAnswerProcessed = userAnswerProcessed.toLowerCase();
      correctAnswerProcessed = correctAnswerProcessed.toLowerCase();
    }

    const correct = userAnswerProcessed === correctAnswerProcessed || 
      content.acceptableAnswers.some(acceptable => {
        let processedAcceptable = acceptable.trim();
        if (!content.caseSensitive) {
          processedAcceptable = processedAcceptable.toLowerCase();
        }
        return userAnswerProcessed === processedAcceptable;
      });

    await submitAnswer(stringAnswer, correct);
  };

  const submitAnswer = async (answer: any, correct: boolean) => {
    if (!user || !question || !db) return;

    setIsSubmitting(true);

    try {
      const startTime = Date.now();

      setIsCorrect(correct);
      setShowResult(true);
      setShowExplanation(true);

      // Show confetti if correct
      if (correct) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      // Save submission to Firestore
      await addDoc(collection(db, 'submissions'), {
        questionId: question.id,
        userId: user.uid,
        subjectId: 'maths',
        type: question.type,
        submittedAnswer: answer,
        result: { correct },
        submittedAt: serverTimestamp(),
        isPassed: correct,
        attemptNumber: submissions.length + 1,
        timeSpent,
      });

      // Reload submissions
      await loadData();

    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    switch (question?.type) {
      case 'mcq':
        handleMCQSubmit();
        break;
      case 'multiple':
        handleMultipleSubmit();
        break;
      case 'integer':
        handleIntegerSubmit();
        break;
      case 'string':
        handleStringSubmit();
        break;
    }
  };

  const toggleMultipleOption = (index: number) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedOptions(newSelected);
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

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Question not found</h2>
            <button
              onClick={() => router.push('/subjects/maths')}
              className="mt-4 text-purple-600 hover:text-purple-700"
            >
              ← Back to Maths
            </button>
          </div>
        </div>
      </div>
    );
  }

  const deadline = question.deadline.toDate();
  const isPassed = submissions.some(s => s.isPassed);

  const canSubmit = () => {
    switch (question.type) {
      case 'mcq':
        return selectedOption !== null;
      case 'multiple':
        return selectedOptions.size > 0;
      case 'integer':
        return integerAnswer.trim() !== '';
      case 'string':
        return stringAnswer.trim() !== '';
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/subjects/maths')}
          className="text-purple-600 hover:text-purple-700 font-medium mb-6 inline-flex items-center gap-2"
        >
          ← Back to Maths Questions
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Question #{question.order}</h1>
                <p className="text-sm text-gray-600 capitalize">
                  {question.type === 'mcq' ? 'Single Choice' : 
                   question.type === 'multiple' ? 'Multiple Choice' :
                   question.type === 'integer' ? 'Integer Answer' : 'Text Answer'}
                </p>
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

        {/* Question Content */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Question</h2>
          <div className="text-lg text-gray-800 leading-relaxed mb-8">
            <MathRenderer 
              content={
                (question.content as MCQQuestionContent).questionText ||
                (question.content as MultipleQuestionContent).questionText ||
                (question.content as IntegerQuestionContent).questionText ||
                (question.content as StringQuestionContent).questionText
              } 
            />
          </div>

          {/* MCQ Options */}
          {question.type === 'mcq' && (
            <div className="space-y-3">
              {(question.content as MCQQuestionContent).options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !showResult && setSelectedOption(index)}
                  disabled={showResult}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedOption === index
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  } ${showResult ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      selectedOption === index
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedOption === index && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div className="flex-1 text-gray-800">
                      <MathRenderer content={option} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Multiple Choice Options */}
          {question.type === 'multiple' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Select all correct answers</p>
              {(question.content as MultipleQuestionContent).options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !showResult && toggleMultipleOption(index)}
                  disabled={showResult}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedOptions.has(index)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  } ${showResult ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      selectedOptions.has(index)
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedOptions.has(index) && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-gray-800">
                      <MathRenderer content={option} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Integer Input */}
          {question.type === 'integer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your answer (numeric value):
              </label>
              <input
                type="number"
                step="any"
                value={integerAnswer}
                onChange={(e) => setIntegerAnswer(e.target.value)}
                disabled={showResult}
                placeholder="e.g., 42 or 3.14159"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* String Input */}
          {question.type === 'string' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your answer:
              </label>
              <input
                type="text"
                value={stringAnswer}
                onChange={(e) => setStringAnswer(e.target.value)}
                disabled={showResult}
                placeholder="Type your answer here"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              {(question.content as StringQuestionContent).caseSensitive && (
                <p className="text-xs text-gray-500 mt-2">Note: Answer is case-sensitive</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          {!showResult && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || isSubmitting}
              className={`w-full mt-6 py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 btn-active ${
                (!canSubmit() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Result */}
        {showResult && (
          <div className={`rounded-xl border-2 p-6 mb-6 ${
            isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold text-green-900">Correct! 🎉</h3>
                    <p className="text-sm text-green-700">Well done!</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <h3 className="text-lg font-bold text-red-900">Incorrect</h3>
                    <p className="text-sm text-red-700">Try again or review the explanation</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Explanation */}
        {showExplanation && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Explanation</h3>
            </div>
            <div className="text-gray-800 leading-relaxed">
              <MathRenderer 
                content={
                  (question.content as MCQQuestionContent).explanation ||
                  (question.content as MultipleQuestionContent).explanation ||
                  (question.content as IntegerQuestionContent).explanation ||
                  (question.content as StringQuestionContent).explanation
                } 
              />
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
              {submissions.slice(0, 5).map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      submission.isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {submission.isPassed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Attempt #{submission.attemptNumber}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(submission.submittedAt.toDate(), 'PPp')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    submission.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {submission.isPassed ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

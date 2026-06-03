import { NextRequest, NextResponse } from 'next/server';
import { addCorsHeaders, handleCorsPreFlight } from '@/lib/middleware/cors';
import { requireUser } from '@/lib/middleware/adminAuth';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MCQQuestionContent,
  MultipleQuestionContent,
  IntegerQuestionContent,
  StringQuestionContent,
} from '@/lib/types';

interface SubmitAnswerRequest {
  questionId: string;
  submittedAnswer: unknown;
  timeSpent?: number;
}

// Validate a non-coding answer SERVER-SIDE against the stored answer key, so a
// client can never forge `isPassed`. Mirrors the logic that used to live in the
// maths question page.
function gradeAnswer(type: string, content: any, answer: unknown): boolean {
  switch (type) {
    case 'mcq': {
      const c = content as MCQQuestionContent;
      return Number(answer) === c.correctAnswer;
    }
    case 'multiple': {
      const c = content as MultipleQuestionContent;
      const sel = Array.isArray(answer) ? answer.map(Number).sort((a, b) => a - b) : [];
      const cor = [...(c.correctAnswers ?? [])].sort((a, b) => a - b);
      return JSON.stringify(sel) === JSON.stringify(cor);
    }
    case 'integer': {
      const c = content as IntegerQuestionContent;
      const ua = parseFloat(String(answer));
      if (Number.isNaN(ua)) return false;
      return Math.abs(ua - c.correctAnswer) <= (c.tolerance || 0.01);
    }
    case 'string': {
      const c = content as StringQuestionContent;
      const norm = (s: unknown) =>
        c.caseSensitive ? String(s).trim() : String(s).trim().toLowerCase();
      const ua = norm(answer);
      if (ua === norm(c.correctAnswer)) return true;
      return (c.acceptableAnswers ?? []).some((a) => ua === norm(a));
    }
    default:
      return false;
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return handleCorsPreFlight(origin);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const auth = await requireUser(request);
    if (!auth) {
      const response = NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const body: SubmitAnswerRequest = await request.json();
    const { questionId, submittedAnswer, timeSpent } = body;

    if (!questionId || submittedAnswer === undefined || submittedAnswer === null) {
      const response = NextResponse.json(
        { error: 'Missing required fields (questionId, submittedAnswer)' },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    const questionSnap = await adminDb.collection('questions').doc(questionId).get();
    if (!questionSnap.exists) {
      const response = NextResponse.json({ error: 'Question not found' }, { status: 404 });
      return addCorsHeaders(response, origin);
    }

    const question = questionSnap.data() as {
      subjectId: string;
      type: string;
      isActive?: boolean;
      content: any;
    };

    if (question.isActive === false) {
      const response = NextResponse.json(
        { error: 'This question is no longer active.' },
        { status: 403 }
      );
      return addCorsHeaders(response, origin);
    }

    if (!['mcq', 'multiple', 'integer', 'string'].includes(question.type)) {
      const response = NextResponse.json(
        { error: `Unsupported question type for this endpoint: ${question.type}` },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    const correct = gradeAnswer(question.type, question.content, submittedAnswer);

    const priorAttempts = await adminDb
      .collection('submissions')
      .where('userId', '==', auth.uid)
      .where('questionId', '==', questionId)
      .count()
      .get();
    const attemptNumber = priorAttempts.data().count + 1;

    await adminDb.collection('submissions').add({
      questionId,
      userId: auth.uid,
      subjectId: question.subjectId ?? 'maths',
      type: question.type,
      submittedAnswer,
      result: { correct },
      submittedAt: FieldValue.serverTimestamp(),
      isPassed: correct,
      attemptNumber,
      timeSpent: typeof timeSpent === 'number' && timeSpent >= 0 ? timeSpent : 0,
    });

    const response = NextResponse.json({ correct, attemptNumber });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error submitting answer:', error);
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

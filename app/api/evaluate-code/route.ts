import { NextRequest, NextResponse } from 'next/server';
import { CodeLanguage, CodeEvaluationResult, CodingQuestionContent } from '@/lib/types';
import { addCorsHeaders, handleCorsPreFlight } from '@/lib/middleware/cors';
import { requireUser } from '@/lib/middleware/adminAuth';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface EvaluateCodeRequest {
  code: string;
  language: CodeLanguage;
  questionId: string;
  timeSpent?: number;
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return handleCorsPreFlight(origin);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    // --- Auth: any signed-in user may submit ---
    const auth = await requireUser(request);
    if (!auth) {
      const response = NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const body: EvaluateCodeRequest = await request.json();
    const { code, language, questionId, timeSpent } = body;

    if (!code || !language || !questionId) {
      const response = NextResponse.json(
        { error: 'Missing required fields (code, language, questionId)' },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    const judgeUrl = process.env.JUDGE_URL;
    if (!judgeUrl) {
      const response = NextResponse.json(
        { error: 'Judge service URL (JUDGE_URL) is not configured' },
        { status: 500 }
      );
      return addCorsHeaders(response, origin);
    }

    // --- Load the question + its hidden test cases SERVER-SIDE ---
    // Test cases are never trusted from the client; they live in the admin-only
    // `questionTestCases` collection (see firestore.rules).
    const [questionSnap, testCaseSnap] = await Promise.all([
      adminDb.collection('questions').doc(questionId).get(),
      adminDb.collection('questionTestCases').doc(questionId).get(),
    ]);

    if (!questionSnap.exists) {
      const response = NextResponse.json({ error: 'Question not found' }, { status: 404 });
      return addCorsHeaders(response, origin);
    }

    const question = questionSnap.data() as {
      subjectId: string;
      type: string;
      isActive?: boolean;
      content?: CodingQuestionContent;
    };

    if (question.isActive === false) {
      const response = NextResponse.json(
        { error: 'This question is no longer active.' },
        { status: 403 }
      );
      return addCorsHeaders(response, origin);
    }

    // Prefer the dedicated secret doc; fall back to legacy in-content test cases
    // (pre-migration) so nothing breaks before the migration runs.
    const testCases: TestCase[] = testCaseSnap.exists
      ? ((testCaseSnap.data() as any)?.testCases ?? [])
      : (question.content?.hiddenTestCases ?? []);

    if (!Array.isArray(testCases) || testCases.length === 0) {
      const response = NextResponse.json(
        { error: 'No test cases configured for this question.' },
        { status: 500 }
      );
      return addCorsHeaders(response, origin);
    }

    // --- Forward to the sandboxed judge ---
    const judgeResponse = await fetch(`${judgeUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.JUDGE_SECRET
          ? { Authorization: `Bearer ${process.env.JUDGE_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ code, language, testCases }),
      // Generous ceiling: the judge enforces its own per-test limits.
      signal: AbortSignal.timeout(60_000),
    });

    if (!judgeResponse.ok) {
      const detail = await judgeResponse.text().catch(() => '');
      console.error('Judge service error:', judgeResponse.status, detail);
      const response = NextResponse.json(
        {
          status: 'runtime_error',
          passedTests: 0,
          totalTests: testCases.length,
          error: `Judge service returned ${judgeResponse.status}. Please try again.`,
          executionTime: 0,
        } as CodeEvaluationResult,
        { status: 502 }
      );
      return addCorsHeaders(response, origin);
    }

    const evaluationResult = (await judgeResponse.json()) as CodeEvaluationResult;

    // --- Persist the submission SERVER-SIDE with a server-computed verdict ---
    // Clients can no longer forge `isPassed`.
    const isPassed = evaluationResult.status === 'passed';
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
      subjectId: question.subjectId ?? 'icp',
      type: question.type ?? 'coding',
      submittedCode: code,
      language,
      result: evaluationResult,
      submittedAt: FieldValue.serverTimestamp(),
      isPassed,
      attemptNumber,
      timeSpent: typeof timeSpent === 'number' && timeSpent >= 0 ? timeSpent : 0,
    });

    const response = NextResponse.json({ ...evaluationResult, attemptNumber });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error evaluating code:', error);

    const response = NextResponse.json(
      {
        status: 'runtime_error',
        passedTests: 0,
        totalTests: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: 0,
      } as CodeEvaluationResult,
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

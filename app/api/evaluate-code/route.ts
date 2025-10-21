import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CodeLanguage, CodeEvaluationResult } from '@/lib/types';
import { addCorsHeaders, handleCorsPreFlight } from '@/lib/middleware/cors';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface EvaluateCodeRequest {
  code: string;
  language: CodeLanguage;
  questionId: string;
  testCases: TestCase[];
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return handleCorsPreFlight(origin);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    const body: EvaluateCodeRequest = await request.json();
    const { code, language, testCases } = body;

    if (!code || !language || !testCases) {
      const response = NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    if (!process.env.GEMINI_API_KEY) {
      const response = NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
      return addCorsHeaders(response, origin);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

    // Create prompt for code evaluation
    const prompt = `You are a code evaluation system. Evaluate the following ${language} code against the provided test cases.

CODE:
\`\`\`${language}
${code}
\`\`\`

TEST CASES:
${testCases.map((tc, idx) => `
Test Case ${idx + 1}:
Input: ${tc.input}
Expected Output: ${tc.expectedOutput}
`).join('\n')}

INSTRUCTIONS:
1. Execute the code mentally for each test case
2. Compare the output with the expected output
3. Check for compilation errors, runtime errors, or logical errors
4. Estimate execution time (in milliseconds)
5. Return the result in the following EXACT JSON format (no markdown, no additional text):

{
  "status": "passed" | "failed" | "compilation_error" | "runtime_error" | "tle",
  "passedTests": <number>,
  "totalTests": ${testCases.length},
  "failedTestCase": {
    "input": "<input>",
    "expectedOutput": "<expected>",
    "actualOutput": "<actual>",
    "testNumber": <number>
  } | null,
  "error": "<error message>" | null,
  "executionTime": <number in milliseconds>
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting
- If all tests pass, set status to "passed" and failedTestCase to null
- If any test fails, set status to "failed" and include the first failed test case
- If there's a compilation error, set status to "compilation_error"
- If there's a runtime error, set status to "runtime_error"
- If execution takes too long (>5000ms), set status to "tle"
- The actualOutput should be what the code would actually produce
`;

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const executionTime = Date.now() - startTime;

    const responseText = result.response.text();
    
    // Clean up the response (remove markdown code blocks if present)
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    let evaluationResult: CodeEvaluationResult;
    
    try {
      evaluationResult = JSON.parse(cleanedResponse);
      
      // Validate the response structure
      if (!evaluationResult.status || typeof evaluationResult.passedTests !== 'number') {
        throw new Error('Invalid response structure from AI');
      }

      // Use actual execution time if available, otherwise use AI estimate
      if (evaluationResult.executionTime === undefined) {
        evaluationResult.executionTime = executionTime;
      }

    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      console.error('Parse error:', parseError);
      
      // Fallback: Return a compilation error
      evaluationResult = {
        status: 'compilation_error',
        passedTests: 0,
        totalTests: testCases.length,
        error: 'Failed to evaluate code. The AI response was invalid. Please try again.',
        executionTime,
      };
    }

    const response = NextResponse.json(evaluationResult);
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

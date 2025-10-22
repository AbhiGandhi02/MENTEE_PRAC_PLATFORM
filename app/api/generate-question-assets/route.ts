import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addCorsHeaders, handleCorsPreFlight } from '@/lib/middleware/cors';
// Import admin SDK parts if needed for stricter auth check later
// import { adminAuth } from '@/lib/firebase/admin'; // Assuming admin.ts is in lib/firebase/

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GenerationRequestData {
  problemDescription: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  exampleInputs: string[];
  exampleOutputs: string[];
  explanations: string[];
}

// Expected JSON structure from Gemini
interface GeminiAssetsResponse {
  starterCode: {
    python: string;
    javascript: string;
    cpp: string;
    java: string;
  };
  hiddenTestCases: {
    input: string;
    expectedOutput: string;
  }[];
}

// Handle CORS preflight for browser requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return handleCorsPreFlight(origin);
}

// Handle the POST request from the admin form
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  let response: NextResponse; // Define response variable for CORS

  try {
    // --- Security Check (Basic - NEEDS IMPROVEMENT FOR PRODUCTION) ---
    // A robust check would verify a Firebase ID token sent in the Authorization header
    // For now, we assume if the API key is present, it's a valid internal call
    // or rely on Vercel Function protection if configured.
    // Replace this with proper admin verification later.
    const isAuthorized = true; 
    if (!isAuthorized) {
       response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       return addCorsHeaders(response, origin);
    }

    const body: GenerationRequestData = await request.json();
    const {
      problemDescription,
      constraints,
      inputFormat,
      outputFormat,
      exampleInputs,
      exampleOutputs,
      explanations, 
    } = body;

    // --- Input Validation ---
    const requiredFields = {
        problemDescription,
        constraints,
        inputFormat,
        outputFormat,
        exampleInputs,
        exampleOutputs,
        explanations
    };
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value || String(value).trim() === '')
        .map(([key]) => key);

    if (missingFields.length > 0) {
        response = NextResponse.json(
            { error: `Missing required fields: ${missingFields.join(', ')}` },
            { status: 400 }
        );
        return addCorsHeaders(response, origin);
    }

    if (!exampleInputs || exampleInputs.length === 0 || exampleInputs.some(ex => String(ex).trim() === '')) {
         response = NextResponse.json(
            { error: 'At least one valid example input is required.' },
            { status: 400 }
        );
        return addCorsHeaders(response, origin);
    }

     if (!exampleOutputs || exampleOutputs.length !== exampleInputs.length || exampleOutputs.some(ex => String(ex).trim() === '')) {
         response = NextResponse.json(
            { error: 'Example outputs are required, must match the number of inputs, and cannot be empty.' },
            { status: 400 }
        );
        return addCorsHeaders(response, origin);
    }
    // --- End Input Validation ---


    if (!process.env.GEMINI_API_KEY) {
      console.error("Gemini API Key is not configured.");
      response = NextResponse.json(
        { error: 'AI service is not configured on the server.' },
        { status: 500 }
      );
      return addCorsHeaders(response, origin);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' }); 

    // --- Construct Gemini Prompt ---
    const examplesString = exampleInputs.map((input, index) => `
Example ${index + 1}:
Input:
${input}
Output:
${exampleOutputs[index]}
${explanations && explanations[index] ? `Explanation:\n${explanations[index]}` : ''}
`).join('\n---\n');

    const prompt = `You are a helpful assistant for creating competitive programming problems. Based on the following problem details, generate LeetCode-style starter code snippets and hidden test cases.

Problem Description:
${problemDescription}

Constraints:
${constraints}

Input Format:
${inputFormat}

Output Format:
${outputFormat}

Examples:
${examplesString}

INSTRUCTIONS:
1.  Generate LeetCode-style starter code snippets (just the class or function definition, no input/output handling) for Python, JavaScript, C++, and Java.
2.  Generate exactly 20 diverse hidden test cases. Include edge cases (empty, single element, max constraints), small cases, typical cases, and potentially tricky cases based on the constraints and examples.
3.  Return the results ONLY as a single JSON object in the following exact format (no markdown code blocks, no extra text before or after):

{
  "starterCode": {
    "python": "...",
    "javascript": "...",
    "cpp": "...",
    "java": "..."
  },
  "hiddenTestCases": [
    {"input": "...", "expectedOutput": "..."},
    {"input": "...", "expectedOutput": "..."},
    // ... exactly 20 items total ...
  ]
}
`;

    // --- Call Gemini API ---
    const generationResult = await model.generateContent(prompt);
    const responseText = generationResult.response.text();

    // --- Clean and Parse Response ---
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    let generatedAssets: GeminiAssetsResponse;
    try {
      generatedAssets = JSON.parse(cleanedResponse);

      // Basic validation of the parsed structure
      if (!generatedAssets.starterCode ||
          !generatedAssets.starterCode.python ||
          !generatedAssets.starterCode.javascript ||
          !generatedAssets.starterCode.cpp ||
          !generatedAssets.starterCode.java ||
          !generatedAssets.hiddenTestCases ||
          !Array.isArray(generatedAssets.hiddenTestCases) ||
          generatedAssets.hiddenTestCases.length === 0 ||
          !generatedAssets.hiddenTestCases[0].input ||
          !generatedAssets.hiddenTestCases[0].expectedOutput
         ) {
        throw new Error('Invalid or incomplete structure in AI response.');
      }
      // Ensure we have roughly the right number of test cases (Gemini might sometimes return 19 or 21)
      if (generatedAssets.hiddenTestCases.length < 18 || generatedAssets.hiddenTestCases.length > 22) {
         console.warn(`Gemini returned ${generatedAssets.hiddenTestCases.length} test cases instead of 20.`);
      }

    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      console.error('Parse error:', parseError);
      response = NextResponse.json(
        { error: 'Failed to process AI response. Please check the format or try again.' },
        { status: 500 }
      );
      return addCorsHeaders(response, origin);
    }

    // --- Send Success Response ---
    response = NextResponse.json(generatedAssets);
    return addCorsHeaders(response, origin);

  } catch (error) {
    console.error('Error in /api/generate-question-assets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error occurred.';
    response = NextResponse.json(
        { error: `Generation failed: ${errorMessage}` },
        { status: 500 }
      );
     return addCorsHeaders(response, origin);
  }
}
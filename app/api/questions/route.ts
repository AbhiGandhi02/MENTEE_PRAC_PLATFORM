import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { checkAdminAuth } from '@/lib/middleware/adminAuth';
import { QuestionType, SubjectId, QuestionContent } from '@/lib/types';
import { addCorsHeaders, handleCorsPreFlight } from '@/lib/middleware/cors';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return handleCorsPreFlight(origin);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const subjectId = searchParams.get('subjectId');
    const isActive = searchParams.get('isActive');
    
    let questionsQuery = adminDb.collection('questions');
    
    // Apply filters
    if (subjectId) {
      questionsQuery = questionsQuery.where('subjectId', '==', subjectId) as any;
    }
    if (isActive !== null && isActive !== undefined) {
      questionsQuery = questionsQuery.where('isActive', '==', isActive === 'true') as any;
    }
    
    // Order by creation date (newest first)
    questionsQuery = questionsQuery.orderBy('createdAt', 'desc') as any;
    
    const snapshot = await questionsQuery.get();
    const questions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
      deadline: doc.data().deadline?.toDate().toISOString(),
    }));
    
    const response = NextResponse.json({ questions });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error fetching questions:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    // Check admin authentication
    const { isAdmin, uid } = await checkAdminAuth(request);
    
    if (!isAdmin) {
      const response = NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
      return addCorsHeaders(response, origin);
    }
    
    const body = await request.json();
    const { subjectId, type, content, deadline, isActive, order } = body;
    
    // Validate required fields
    if (!subjectId || !type || !content || !deadline) {
      const response = NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }
    
    // Validate subject ID
    if (!['icp', 'webdev', 'maths'].includes(subjectId)) {
      const response = NextResponse.json(
        { error: 'Invalid subject ID' },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }
    
    // Validate question type
    if (!['coding', 'mcq', 'multiple', 'integer', 'string'].includes(type)) {
      const response = NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }
    
    // Create question document
    const questionData = {
      subjectId: subjectId as SubjectId,
      type: type as QuestionType,
      content: content as QuestionContent,
      deadline: new Date(deadline),
      createdBy: uid,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    };
    
    const docRef = await adminDb.collection('questions').add(questionData);
    
    const response = NextResponse.json(
      { 
        success: true,
        questionId: docRef.id,
        message: 'Question created successfully'
      },
      { status: 201 }
    );
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error creating question:', error);
    const response = NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

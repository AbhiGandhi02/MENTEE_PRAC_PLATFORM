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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');
  try {
    const resolvedParams = await params;
    const questionDoc = await adminDb.collection('questions').doc(resolvedParams.id).get();
    
    if (!questionDoc.exists) {
      const response = NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, origin);
    }
    
    const data = questionDoc.data();
    const question = {
      id: questionDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate().toISOString(),
      updatedAt: data?.updatedAt?.toDate().toISOString(),
      deadline: data?.deadline?.toDate().toISOString(),
    };
    
    const response = NextResponse.json({ question });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error fetching question:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');
  try {
    // Check admin authentication
    const { isAdmin } = await checkAdminAuth(request);
    
    if (!isAdmin) {
      const response = NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
      return addCorsHeaders(response, origin);
    }
    
    const body = await request.json();
    const { subjectId, type, content, deadline, isActive, order } = body;
    
    // Resolve params
    const resolvedParams = await params;
    
    // Check if question exists
    const questionDoc = await adminDb.collection('questions').doc(resolvedParams.id).get();
    if (!questionDoc.exists) {
      const response = NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, origin);
    }
    
    // Build update object (only include provided fields)
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (subjectId) {
      if (!['icp', 'webdev', 'maths'].includes(subjectId)) {
        const response = NextResponse.json(
          { error: 'Invalid subject ID' },
          { status: 400 }
        );
        return addCorsHeaders(response, origin);
      }
      updateData.subjectId = subjectId;
    }
    
    if (type) {
      if (!['coding', 'mcq', 'multiple', 'integer', 'string'].includes(type)) {
        const response = NextResponse.json(
          { error: 'Invalid question type' },
          { status: 400 }
        );
        return addCorsHeaders(response, origin);
      }
      updateData.type = type;
    }
    
    if (content) updateData.content = content;
    if (deadline) updateData.deadline = new Date(deadline);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;
    
    await adminDb.collection('questions').doc(resolvedParams.id).update(updateData);
    
    const response = NextResponse.json({
      success: true,
      message: 'Question updated successfully'
    });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error updating question:', error);
    const response = NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');
  try {
    // Check admin authentication
    const { isAdmin } = await checkAdminAuth(request);
    
    if (!isAdmin) {
      const response = NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
      return addCorsHeaders(response, origin);
    }
    
    // Resolve params
    const resolvedParams = await params;
    
    // Check if question exists
    const questionDoc = await adminDb.collection('questions').doc(resolvedParams.id).get();
    if (!questionDoc.exists) {
      const response = NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
      return addCorsHeaders(response, origin);
    }
    
    // Soft delete: set isActive to false instead of actually deleting
    // This preserves submission history and analytics
    await adminDb.collection('questions').doc(resolvedParams.id).update({
      isActive: false,
      updatedAt: new Date(),
    });
    
    const response = NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    });
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error deleting question:', error);
    const response = NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

// Permanently delete a question (use with caution)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');
  try {
    // Check admin authentication
    const { isAdmin } = await checkAdminAuth(request);
    
    if (!isAdmin) {
      const response = NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
      return addCorsHeaders(response, origin);
    }
    
    // Resolve params
    const resolvedParams = await params;
    
    const body = await request.json();
    if (body.action === 'hard-delete') {
      // Check if question exists
      const questionDoc = await adminDb.collection('questions').doc(resolvedParams.id).get();
      if (!questionDoc.exists) {
        const response = NextResponse.json(
          { error: 'Question not found' },
          { status: 404 }
        );
        return addCorsHeaders(response, origin);
      }
      
      // Permanently delete the question
      await adminDb.collection('questions').doc(resolvedParams.id).delete();
      
      const response = NextResponse.json({
        success: true,
        message: 'Question permanently deleted'
      });
      return addCorsHeaders(response, origin);
    }
    
    const response = NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    return addCorsHeaders(response, origin);
  } catch (error) {
    console.error('Error in PATCH operation:', error);
    const response = NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
    return addCorsHeaders(response, origin);
  }
}

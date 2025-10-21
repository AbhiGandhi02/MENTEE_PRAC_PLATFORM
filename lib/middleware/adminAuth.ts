import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function checkAdminAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false, uid: null };
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is in admins collection
    const adminDoc = await adminDb.collection('admins').doc(uid).get();
    
    return {
      isAdmin: adminDoc.exists,
      uid,
    };
  } catch (error) {
    console.error('Error verifying admin:', error);
    return { isAdmin: false, uid: null };
  }
}

export function requireAdmin(handler: (request: NextRequest, context: { params: any }) => Promise<NextResponse>) {
  return async (request: NextRequest, context: { params: any }) => {
    const { isAdmin, uid } = await checkAdminAuth(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Attach uid to request for use in handler
    (request as any).uid = uid;
    return handler(request, context);
  };
}

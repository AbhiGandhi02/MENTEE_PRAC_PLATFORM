import { NextResponse } from 'next/server';

/**
 * CORS Configuration
 * For production, you should restrict this to your actual domain(s)
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
].filter(Boolean); // Remove empty strings

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
];

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Allow requests with no origin (like mobile apps or curl)
  
  // In development, allow all localhost origins
  if (process.env.NODE_ENV === 'development') {
    return origin.includes('localhost') || origin.includes('127.0.0.1');
  }
  
  // In production, check against allowed origins or allow same-origin
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) || 
         origin.includes('.vercel.app'); // Allow all Vercel preview deployments
}

/**
 * Add CORS headers to a NextResponse
 */
export function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreFlight(origin: string | null): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}

/**
 * Create a CORS-enabled JSON response
 */
export function corsJsonResponse(
  data: any,
  origin: string | null,
  options?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  const response = NextResponse.json(data, { 
    status: options?.status || 200,
    headers: options?.headers,
  });
  
  return addCorsHeaders(response, origin);
}

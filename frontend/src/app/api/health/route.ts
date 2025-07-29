import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Asegura que no sea cacheado

export async function GET() {
  console.log('[Health Check] Received request. Responding with OK.');
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Si la respuesta falla, lo veremos en los logs
    console.error('[Health Check] CRITICAL: Failed to create JSON response.', error);
    // Intentar responder con texto plano si JSON falla
    return new Response('Health check failed to construct response', { status: 500 });
  }
} 
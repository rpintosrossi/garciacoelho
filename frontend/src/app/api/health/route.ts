import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  return NextResponse.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 'No definido',
    environment: process.env.NODE_ENV || 'No definido',
    message: 'Garcia Coelho Frontend funcionando correctamente',
    config: {
      apiUrl: config.apiUrl,
      appUrl: config.appUrl,
      port: config.port,
      environment: config.environment,
      isRailway: config.isRailway
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    }
  });
} 
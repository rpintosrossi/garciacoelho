import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      RAILWAY_PROJECT_NAME: process.env.RAILWAY_PROJECT_NAME,
      RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    },
    config: {
      apiUrl: config.apiUrl,
      appUrl: config.appUrl,
      port: config.port,
      environment: config.environment,
      isRailway: config.isRailway
    },
    process: {
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    },
    headers: {
      host: process.env.HOST,
      port: process.env.PORT
    }
  };

  console.log('[DEBUG] Debug info:', debugInfo);

  return NextResponse.json(debugInfo);
} 
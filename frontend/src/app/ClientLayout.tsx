"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('[LAYOUT] Estado actual:', { user, loading, pathname });
    if (!loading) {
      if (!user) {
        console.log('[LAYOUT] No hay usuario, redirigiendo a login');
        if (pathname !== '/login') {
          router.push('/login');
        }
      } else {
        console.log('[LAYOUT] Usuario autenticado:', user);
        if (pathname === '/') {
          if (user.role === 'TECNICO') {
            console.log('[LAYOUT] Usuario es técnico, redirigiendo a /technician');
            router.push('/technician');
          } else {
            console.log('[LAYOUT] Usuario no es técnico, redirigiendo a /dashboard');
            router.push('/dashboard');
          }
        } else if (user.role === 'TECNICO' && pathname === '/dashboard') {
          console.log('[LAYOUT] Técnico intentando acceder a dashboard, redirigiendo a /technician');
          router.push('/technician');
        } else if (user.role !== 'TECNICO' && pathname === '/technician') {
          console.log('[LAYOUT] No-técnico intentando acceder a technician, redirigiendo a /dashboard');
          router.push('/dashboard');
        }
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return <>{children}</>;
} 
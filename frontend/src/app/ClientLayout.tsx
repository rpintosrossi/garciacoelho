"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (pathname !== '/login') {
          router.push('/login');
        }
      } else {
        if (pathname === '/') {
          if (user.role === 'TECNICO') {
            router.push('/technician');
          } else {
            router.push('/dashboard');
          }
        } else if (user.role === 'TECNICO' && pathname === '/dashboard') {
          router.push('/technician');
        } else if (user.role !== 'TECNICO' && pathname === '/technician') {
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
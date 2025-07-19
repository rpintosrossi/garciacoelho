import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";
import { Box } from "@mui/material";
import { AuthProvider } from '@/contexts/AuthContext';
import { ServiceCountsProvider } from '../hooks/useServiceCounts';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Garcia Coelho",
  description: "Sistema de gestión de servicios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url("/logo.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.05,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        />
        <AuthProvider>
          <ServiceCountsProvider>
            <ThemeRegistry>
              {children}
            </ThemeRegistry>
          </ServiceCountsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

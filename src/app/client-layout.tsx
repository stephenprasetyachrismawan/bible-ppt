'use client';

import React from 'react';
import { AuthContextProvider } from '@/context/AuthContext';
import MainContent from '@/components/MainContent';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthContextProvider>
      <MainContent>
        {children}
      </MainContent>
    </AuthContextProvider>
  );
} 
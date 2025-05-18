'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

interface MainContentProps {
  children: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  
  return (
    <>
      <Navbar />
      {isAdminRoute && <Sidebar />}
      <main className={`pt-20 min-h-screen p-4 transition-all duration-300`}>
        <div className="container mx-auto">
          {children}
        </div>
      </main>
    </>
  );
};

export default MainContent; 
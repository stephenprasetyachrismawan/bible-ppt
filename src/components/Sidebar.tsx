'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookPlus, ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * Komponen Sidebar dengan desain sederhana
 * Menyesuaikan dengan tampilan admin pada gambar
 */
const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * Menentukan apakah sebuah path active atau tidak
   */
  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') return true;
    if (path !== '/admin' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-screen transition-all duration-300 z-50 flex flex-col 
                 ${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-md border-r border-gray-100`}
    >
      {/* Toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white rounded-full p-1 shadow-md z-50 hover:scale-110 transition-transform"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo */}
      <div className="flex items-center justify-start h-16 border-b border-gray-100 px-5">
        {isCollapsed ? (
          <div className="font-bold text-xl text-gray-800">B</div>
        ) : (
          <div className="font-bold text-xl text-gray-800">Bible PPT Admin</div>
        )}
      </div>

      {/* Nav items */}
      <div className="flex flex-col flex-1 py-6 space-y-1 px-3">
        <NavItem 
          path="/admin" 
          label="Dashboard" 
          icon={<LayoutDashboard />} 
          isActive={isActive('/admin')} 
          isCollapsed={isCollapsed} 
        />

        <NavItem 
          path="/admin/add-bible-version" 
          label="Tambah Versi Bible" 
          icon={<BookPlus />} 
          isActive={isActive('/admin/add-bible-version')} 
          isCollapsed={isCollapsed} 
        />
      </div>
    </div>
  );
};

// Komponen item navigasi
interface NavItemProps {
  path: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ path, label, icon, isActive, isCollapsed }) => {
  return (
    <Link
      href={path}
      className={`
        group flex items-center rounded p-2 transition-all duration-200
        ${isCollapsed ? 'justify-center' : 'px-4'} 
        ${isActive 
          ? 'bg-gray-100 text-gray-800 font-medium' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
        }
        relative
      `}
    >
      <div className={`flex-shrink-0 transition-colors duration-200 
        ${isActive 
          ? 'text-gray-900' 
          : 'text-gray-500 group-hover:text-gray-800'
        }`}
      >
        {icon}
      </div>
      
      {!isCollapsed && <span className="ml-3">{label}</span>}
      
      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 p-2 min-w-max bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          {label}
        </div>
      )}
    </Link>
  );
};

export default Sidebar; 
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, User, Menu, X, Search } from 'lucide-react';

/**
 * Komponen Navbar utama aplikasi dengan desain glossy modern
 * Diposisikan di tengah atas
 */
const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  /**
   * Menentukan apakah sebuah path active atau tidak
   */
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-40 mx-auto px-4 py-2"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          {/* Mobile menu button - only shown in mobile view */}
          <div className="md:hidden flex items-center">
            <button 
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
          </div>
          
          {/* Logo - hidden on mobile when sidebar is visible */}
          <div className="md:hidden">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
              Bible PPT
            </Link>
          </div>
          
          {/* Center nav - main navigation in center */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1 bg-white bg-opacity-50 backdrop-blur-sm rounded-full p-1 shadow-sm">
              <NavButton 
                href="/" 
                label="Beranda" 
                isActive={isActive('/')} 
              />
              <NavButton 
                href="/bible-reader" 
                label="Lihat Alkitab" 
                isActive={isActive('/bible-reader')} 
              />
              <NavButton 
                href="/admin" 
                label="Admin" 
                isActive={isActive('/admin')} 
              />
            </div>
          </div>
          
          {/* Right section - notifications, search, profile */}
          <div className="flex items-center space-x-2 ml-auto">
            {/* Search toggle */}
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors relative"
              aria-label="Search"
            >
              {isSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
            
            {/* Notification bell */}
            <button 
              className="p-2 rounded-full hover:bg-gray-200 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                3
              </span>
            </button>
            
            {/* Profile dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white"
                aria-label="User profile"
              >
                <User size={16} />
              </button>
              
              {isProfileMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-lg shadow-xl z-50"
                  style={{
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <Link 
                    href="/profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-500"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    Profil Saya
                  </Link>
                  <Link 
                    href="/settings" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-500"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    Pengaturan
                  </Link>
                  <hr className="my-2 border-gray-200" />
                  <Link 
                    href="/signout" 
                    className="block px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    Keluar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Expanded search bar */}
        {isSearchOpen && (
          <div className="mt-2 p-2 bg-white rounded-lg shadow-md animate-fadeIn">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Search size={20} className="ml-2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ayat, kitab, atau topik..."
                className="w-full p-2 focus:outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Navigation button component
interface NavButtonProps {
  href: string;
  label: string;
  isActive: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ href, label, isActive }) => {
  return (
    <Link
      href={href}
      className={`
        px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium
        ${isActive
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
          : 'text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      {label}
    </Link>
  );
};

export default Navbar; 
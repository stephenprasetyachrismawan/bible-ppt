'use client';

import React from 'react';
import { Plus, Settings, HelpCircle } from 'lucide-react';

interface FloatingButtonProps {
  onClick: () => void;
  icon?: 'plus' | 'settings' | 'help' | React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  tooltip?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Komponen tombol mengambang dengan desain glossy modern
 */
const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  icon = 'plus',
  position = 'bottom-right',
  tooltip,
  color = 'primary',
  size = 'md',
}) => {
  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  // Color classes
  const colorStyles = {
    primary: {
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      shadow: '0 10px 15px -3px rgba(99, 102, 241, 0.5)',
    },
    secondary: {
      background: 'linear-gradient(135deg, #475569, #64748b)',
      shadow: '0 10px 15px -3px rgba(71, 85, 105, 0.5)',
    },
    success: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      shadow: '0 10px 15px -3px rgba(16, 185, 129, 0.5)',
    },
    warning: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      shadow: '0 10px 15px -3px rgba(245, 158, 11, 0.5)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      shadow: '0 10px 15px -3px rgba(239, 68, 68, 0.5)',
    },
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
  };

  // Icon sizes based on button size
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 28,
  };

  // Get icon component
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }

    const iconSize = iconSizes[size];
    
    switch (icon) {
      case 'plus':
        return <Plus size={iconSize} />;
      case 'settings':
        return <Settings size={iconSize} />;
      case 'help':
        return <HelpCircle size={iconSize} />;
      default:
        return <Plus size={iconSize} />;
    }
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 group`}>
      {tooltip && (
        <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-gray-800 text-white text-sm py-1 px-3 rounded-md shadow-lg whitespace-nowrap">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
      
      <button
        onClick={onClick}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
        style={{
          background: colorStyles[color].background,
          boxShadow: colorStyles[color].shadow,
        }}
        aria-label={tooltip || 'Floating action button'}
      >
        {renderIcon()}
      </button>
    </div>
  );
};

export default FloatingButton; 
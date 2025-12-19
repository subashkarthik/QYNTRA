import React from 'react';

export const Logo: React.FC<{ className?: string; animated?: boolean }> = ({ className = "w-6 h-6", animated = false }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Q Tail - Diagonal Line */}
    <line 
      x1="16" 
      y1="16" 
      x2="19" 
      y2="19" 
      stroke="#00d9ff" 
      strokeWidth="2" 
      strokeLinecap="round"
      className={animated ? "animate-pulse" : ""}
    />
    
    {/* Core Node */}
    <circle 
      cx="12" 
      cy="12" 
      r="1.5" 
      fill="#00d9ff"
      className={animated ? "animate-pulse delay-300" : ""}
    />
    
    {/* Neural Connection Points */}
    <circle cx="12" cy="4" r="1" fill="#00d9ff" fillOpacity="0.6" />
    <circle cx="20" cy="12" r="1" fill="#00d9ff" fillOpacity="0.6" />
    <circle cx="12" cy="20" r="1" fill="#00d9ff" fillOpacity="0.6" />
    <circle cx="4" cy="12" r="1" fill="#00d9ff" fillOpacity="0.6" />
  </svg>
);
import React from 'react';

export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,209,255,0.4)]">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D1FF" />
            <stop offset="100%" stopColor="#0066FF" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGradient)" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.3" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="url(#logoGradient)" strokeWidth="6" strokeLinecap="round" />
        
        {/* Stylized P - Continuous Loop */}
        <path 
          d="M40 30 V 70 M 40 30 H 55 C 65 30, 65 45, 55 45 H 40 M 40 45 H 55 C 65 45, 65 60, 55 60 H 40" 
          fill="none" 
          stroke="url(#logoGradient)" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          filter="url(#glow)"
        />
        
        {/* Accent Dot */}
        <circle cx="55" cy="45" r="4" fill="white" />
      </svg>
    </div>
  );
};

export const PrivyLogo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo className="w-10 h-10" />
      <span className="text-2xl font-display font-bold tracking-tighter">
        Privy<span className="text-brand-blue">Connect</span>
      </span>
    </div>
  );
};

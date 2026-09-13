import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function Navbar({ onReset }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--rule)] bg-[rgba(10,9,8,0.85)] backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div 
          onClick={onReset}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <span className="text-[17px] text-[var(--fg)] opacity-90 group-hover:rotate-45 transition-transform duration-300" aria-hidden="true">&#10037;</span>
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-base tracking-tight text-[var(--fg)]">
              IDEON
            </span>
            <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider text-[var(--fg-faint)]">
              AI Debate Platform
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="pill-secondary !h-8 !px-3.5 text-xs gap-1.5"
            title="Start a new debate session"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Start Over</span>
          </button>
        </div>

      </div>
    </header>
  );
}

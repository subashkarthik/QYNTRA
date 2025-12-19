import React, { useState, useRef, useEffect } from 'react';
import { ChatSession } from '../types';
import { exportAsMarkdown, exportAsJSON } from '../utils/exportUtils';

interface ExportMenuProps {
  session: ChatSession;
  onClose?: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ session, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = (format: 'markdown' | 'json') => {
    if (format === 'markdown') {
      exportAsMarkdown(session);
    } else {
      exportAsJSON(session);
    }
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-300 transition-colors"
        title="Export conversation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-midnight-900 border border-white/10 shadow-2xl overflow-hidden z-50 backdrop-blur-xl">
          <div className="py-1">
            <button
              onClick={() => handleExport('markdown')}
              className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <div>
                <div className="font-medium">Export as Markdown</div>
                <div className="text-xs text-slate-500">Readable format (.md)</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('json')}
              className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M10 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2"/>
                <path d="M14 12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2"/>
              </svg>
              <div>
                <div className="font-medium">Export as JSON</div>
                <div className="text-xs text-slate-500">Complete data (.json)</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

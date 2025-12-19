import React from 'react';

interface PreviewPanelProps {
  code: string;
  language: string;
  onClose: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ code, language, onClose }) => {
  // Construct a safe HTML document
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          /* Custom scrollbar to match app */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
        </style>
      </head>
      <body>
        ${code}
      </body>
    </html>
  `;

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-l-2xl shadow-2xl overflow-hidden border-l border-white/10 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-slate-100 px-4 py-3 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-white rounded-md shadow-sm text-slate-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><polyline points="11 3 11 11 14 8 17 11 17 3"/></svg>
           </div>
           <span className="text-xs font-bold text-slate-700 uppercase tracking-wide font-mono">Live Preview</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white relative">
        <iframe 
          title="Preview"
          srcDoc={srcDoc}
          className="w-full h-full border-none"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
};
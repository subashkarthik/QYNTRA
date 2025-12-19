import React, { useState } from 'react';
import { CodeBlockProps } from '../types';

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, onPreview }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if this code is previewable
  const isPreviewable = ['html', 'svg'].includes(language?.toLowerCase());

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-white/5 bg-[#050810] shadow-2xl ring-1 ring-black/50 group">
      <div className="flex items-center justify-between px-4 py-2.5 bg-midnight-900 border-b border-white/5">
        <div className="flex items-center gap-3">
             <div className="flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
             </div>
             <span className="text-[11px] font-mono text-slate-500 font-medium lowercase tracking-wide ml-2 group-hover:text-brand-glow transition-colors">{language || 'text'}</span>
        </div>
        <div className="flex items-center gap-2">
            {isPreviewable && onPreview && (
                <button
                    onClick={() => onPreview(code, language)}
                    className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-brand-accent transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded font-mono"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>Preview</span>
                </button>
            )}
            <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded font-mono"
            >
            {copied ? (
                <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent"><path d="M20 6 9 17l-5-5"/></svg>
                <span className="text-brand-accent">Copied</span>
                </>
            ) : (
                <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <span>Copy</span>
                </>
            )}
            </button>
        </div>
      </div>
      <div className="p-5 overflow-x-auto custom-scrollbar">
        <pre className="text-[13px] font-mono leading-relaxed text-slate-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
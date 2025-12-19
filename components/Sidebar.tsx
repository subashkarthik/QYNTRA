import React from 'react';
import { ChatSession } from '../types';
import { ExportMenu } from './ExportMenu';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  onExportAll?: () => void;
  onImport?: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, 
    sessions, 
    activeSessionId, 
    onSelectSession, 
    onNewSession,
    onDeleteSession,
    onClearAll,
    onOpenSettings,
    onExportAll,
    onImport
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div 
      className={`
        fixed md:relative top-0 left-0 h-full backdrop-blur-3xl bg-midnight-950/90 border-r border-white/5 transition-all duration-300 ease-in-out z-20 flex flex-col
        ${isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden opacity-0 md:opacity-100'}
      `}
    >
        {/* Header */}
        <div className="p-5 flex-shrink-0">
            <button 
                onClick={onNewSession}
                className="group w-full flex items-center justify-center gap-3 bg-white/[0.03] hover:bg-brand-primary/10 hover:border-brand-primary/30 hover:shadow-lg hover:shadow-brand-primary/10 text-slate-200 py-3.5 px-4 rounded-xl transition-all border border-white/5 text-xs font-semibold tracking-wide uppercase font-display"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent group-hover:scale-110 transition-transform"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Init Sequence
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
            <div className="px-4 pb-3 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80 font-mono">
                <span>Session Logs</span>
                <div className="flex items-center gap-1">
                    {sessions.length > 0 && onExportAll && (
                        <button 
                            onClick={onExportAll} 
                            className="p-1 hover:text-brand-accent transition-colors" 
                            title="Export All"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                    )}
                    {onImport && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button 
                                onClick={handleImportClick} 
                                className="p-1 hover:text-brand-accent transition-colors" 
                                title="Import"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                            </button>
                        </>
                    )}
                    {sessions.length > 0 && (
                        <button onClick={onClearAll} className="p-1 hover:text-red-400 transition-colors" title="Clear All">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    )}
                </div>
            </div>
            
            {sessions.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-600 font-light italic">
                    No active sequences found.
                </div>
            ) : (
                <ul className="space-y-1">
                    {sessions.map(item => (
                        <li key={item.id} className="relative group">
                            <button
                                onClick={() => onSelectSession(item.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm truncate transition-all border pr-16 ${
                                    activeSessionId === item.id 
                                    ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-glow shadow-md shadow-black/20' 
                                    : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                            <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={activeSessionId === item.id ? 'text-brand-accent' : 'text-slate-600 group-hover:text-slate-400'}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    <span className={`truncate font-light flex-1 ${activeSessionId === item.id ? 'font-medium' : ''}`}>{item.title}</span>
                            </div>
                            </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ExportMenu session={item} />
                                </div>
                                <button 
                                    onClick={(e) => onDeleteSession(item.id, e)}
                                    className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-white/10 transition-all"
                                    title="Delete Log"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex-shrink-0">
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold text-[10px] ring-1 ring-white/10 group-hover:ring-brand-accent/50 transition-all font-mono">
                        OP
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-medium text-slate-200 truncate font-display">Operator</div>
                        <div className="text-[9px] text-brand-accent font-bold tracking-wider truncate font-mono">ARCHITECT TIER</div>
                    </div>
                </div>
                <button 
                    onClick={onOpenSettings}
                    className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="Settings"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </div>
            
            {/* Creator Attribution & Copyright */}
            <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-center space-y-1">
                    <div className="text-[10px] text-slate-500 font-medium">
                        Created by <span className="text-brand-accent font-bold">SUBASHKARTHIK</span>
                    </div>
                    <div className="text-[9px] text-slate-600 font-mono">
                        © {new Date().getFullYear()} All Rights Reserved
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
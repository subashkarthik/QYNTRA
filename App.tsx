import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { LiveSessionOverlay } from './components/LiveSessionOverlay';
import { SplashScreen } from './components/SplashScreen';
import { DocumentModal } from './components/DocumentModal';
import { Logo } from './components/Logo';
import { ModelConfig, ChatSession, Message, ThemeId } from './types';
import { DEFAULT_MODEL_CONFIG, THEMES } from './constants';
import { historyService } from './services/historyService';
import { exportAllAsJSON } from './utils/exportUtils';
import { importConversations, readFileAsText, mergeConversations } from './utils/importUtils';

export default function App() {
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL_CONFIG);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [showSettings, setShowSettings] = useState(false);
  const [showLiveMode, setShowLiveMode] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('leximera');
  const [showSplash, setShowSplash] = useState(true);

  // Load Sessions
  useEffect(() => {
    historyService.getSessions().then(loadedSessions => {
        setSessions(loadedSessions);
    });

    const savedTheme = localStorage.getItem('leximera_theme') as ThemeId;
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Note: We removed the useEffect that auto-saves to localStorage on every change.
  // Instead, we now call historyService methods directly in the handlers below.

  // Apply Theme
  useEffect(() => {
    const theme = THEMES[currentTheme];
    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    localStorage.setItem('leximera_theme', currentTheme);
  }, [currentTheme]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleCreateSession = (firstMessage: Message, config: ModelConfig): string => {
    const newId = Date.now().toString();
    const title = firstMessage.content.slice(0, 40) + (firstMessage.content.length > 40 ? '...' : '');
    
    const newSession: ChatSession = {
      id: newId,
      title,
      messages: [firstMessage],
      updatedAt: Date.now(),
      modelConfig: config
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    
    // Persist
    historyService.createSession(newSession);
    
    return newId;
  };

  const handleUpdateSession = (sessionId: string, newMessages: Message[]) => {
    setSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === sessionId) {
            const updatedSession = { ...s, messages: newMessages, updatedAt: Date.now() };
            // Persist async
            historyService.updateSession(updatedSession);
            return updatedSession;
          }
          return s;
        });
        return updated;
    });
  };

  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
    historyService.deleteSession(sessionId);
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all session logs? This cannot be undone.")) {
      setSessions([]);
      setActiveSessionId(null);
      historyService.clearAll();
    }
  };

  const handleExportAll = () => {
    exportAllAsJSON(sessions);
  };

  const handleImport = async (file: File) => {
    try {
      const content = await readFileAsText(file);
      const imported = importConversations(content);
      
      if (!imported || imported.length === 0) {
        alert('Failed to import conversations. Invalid file format.');
        return;
      }

      const merged = mergeConversations(sessions, imported);
      setSessions(merged);
      
      // Persist imported sessions
      imported.forEach(session => {
        historyService.createSession(session);
      });

      alert(`Successfully imported ${imported.length} conversation(s)!`);
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import conversations. Please check the file and try again.');
    }
  };

  const handleDownloadChat = () => {
      if (!activeSessionId) return;
      const session = sessions.find(s => s.id === activeSessionId);
      if (!session) return;

      const content = session.messages.map(m => {
          return `## ${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleString()}\n\n${m.content}\n\n`;
      }).join('---\n\n');

      const blob = new Blob([`# ${session.title}\n\n${content}`], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const currentSession = sessions.find(s => s.id === activeSessionId) || null;

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      <div className="flex h-screen overflow-hidden text-slate-100 selection:bg-brand-accent/30 selection:text-brand-glow">
        {/* Mobile Overlay Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <Sidebar 
          isOpen={sidebarOpen} 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            // Auto-close sidebar on mobile after selecting a session
            if (window.innerWidth < 768) {
              setSidebarOpen(false);
            }
          }}
          onNewSession={() => {
            setActiveSessionId(null);
            // Auto-close sidebar on mobile after creating new session
            if (window.innerWidth < 768) {
              setSidebarOpen(false);
            }
          }}
          onDeleteSession={handleDeleteSession}
          onClearAll={handleClearAll}
          onOpenSettings={() => setShowSettings(true)}
          onExportAll={handleExportAll}
          onImport={handleImport}
        />
        
        <main className="flex-1 relative h-full transition-all duration-300 ease-in-out bg-subtle-glow flex flex-col">
          {/* Glass Header */}
          <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-20 glass-panel border-b-0 border-white/5">
            <div className="flex items-center gap-5">
              <button onClick={toggleSidebar} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
              </button>
              <div className="flex items-center gap-3 select-none">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-midnight-800 to-midnight-950 flex items-center justify-center shadow-lg shadow-brand-primary/10 ring-1 ring-white/5">
                    <Logo className="w-5 h-5" />
                  </div>
                  <h1 className="font-display font-semibold text-lg tracking-wide text-slate-100 hidden sm:block">
                    QYNTRA
                  </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Live Mode Trigger */}
              <button 
                  onClick={() => setShowLiveMode(true)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
              >
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase">Live</span>
              </button>

              <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

              {/* Document Library Button */}
              <button 
                onClick={() => setShowDocuments(true)}
                className="p-2 text-slate-400 hover:text-brand-accent hover:bg-white/5 rounded-lg transition-all"
                title="Document Library"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </button>

              {/* Download Button */}
              {activeSessionId && (
                  <button 
                    onClick={handleDownloadChat}
                    className="p-2 text-slate-400 hover:text-brand-accent hover:bg-white/5 rounded-lg transition-all"
                    title="Download Chat Log"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  </button>
              )}

              <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

              <div className="flex items-center text-[10px] font-bold tracking-wider text-slate-400 gap-2 bg-midnight-900/50 px-3 py-1.5 rounded-full border border-white/10 uppercase font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full ${modelConfig.model.includes('pro') ? 'bg-brand-accent shadow-[0_0_10px_rgba(var(--color-brand-accent)/0.6)]' : 'bg-brand-secondary shadow-[0_0_10px_rgba(var(--color-brand-secondary)/0.6)]'}`}></span>
                  {modelConfig.model.includes('pro') ? 'Architect v3' : 'Velocity v2'}
              </div>
            </div>
          </header>

          <ChatArea 
            activeSessionId={activeSessionId}
            currentSession={currentSession}
            modelConfig={modelConfig}
            onModelConfigChange={setModelConfig}
            onCreateSession={handleCreateSession}
            onUpdateSession={handleUpdateSession}
          />
        </main>

        <SettingsModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          currentThemeId={currentTheme}
          onThemeSelect={setCurrentTheme}
          modelConfig={modelConfig}
          onModelConfigUpdate={setModelConfig}
        />

        <DocumentModal
          isOpen={showDocuments}
          onClose={() => setShowDocuments(false)}
        />

        {showLiveMode && (
            <LiveSessionOverlay onClose={() => setShowLiveMode(false)} />
        )}
      </div>
    </>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { ChatSession, SearchResult } from '../types';
import { searchService } from '../services/searchService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (sessionId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, sessions, onSelectSession }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'fuzzy' | 'semantic' | 'hybrid'>('hybrid');

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        let searchResults: SearchResult[] = [];
        
        switch (searchMode) {
          case 'fuzzy':
            searchResults = searchService.fuzzySearch(query, sessions);
            break;
          case 'semantic':
            searchResults = await searchService.semanticSearch(query, sessions);
            break;
          case 'hybrid':
            searchResults = await searchService.hybridSearch(query, sessions);
            break;
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, sessions, searchMode]);

  const handleSelectResult = (result: SearchResult) => {
    if (result.sessionId) {
      onSelectSession(result.sessionId);
      onClose();
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-brand-accent/30 text-brand-glow">{part}</mark> : 
        part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 bg-midnight-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-midnight-950/50">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-lg"
              autoFocus
            />
            {isSearching && (
              <div className="w-5 h-5 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Search Mode Selector */}
          <div className="flex gap-2 mt-3">
            {(['fuzzy', 'semantic', 'hybrid'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSearchMode(mode)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  searchMode === mode
                    ? 'bg-brand-accent text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() && (
            <div className="px-6 py-12 text-center text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <p className="text-sm">Start typing to search across all conversations</p>
              <p className="text-xs mt-2 text-slate-600">Try different search modes for better results</p>
            </div>
          )}

          {query.trim() && results.length === 0 && !isSearching && (
            <div className="px-6 py-12 text-center text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-2 text-slate-600">Try a different search term or mode</p>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={result.id + index}
              onClick={() => handleSelectResult(result)}
              className="w-full px-6 py-4 text-left hover:bg-white/5 border-b border-white/5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {highlightText(result.title, query)}
                    </h3>
                    <span className="text-xs text-brand-accent font-mono">
                      {Math.round(result.similarity * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {highlightText(result.snippet, query)}
                  </p>
                  {result.timestamp && (
                    <p className="text-xs text-slate-600 mt-2">
                      {new Date(result.timestamp).toLocaleDateString()} at{' '}
                      {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 group-hover:text-brand-accent transition-colors flex-shrink-0 mt-1">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-6 py-3 border-t border-white/10 bg-midnight-950/30">
            <p className="text-xs text-slate-500 text-center">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

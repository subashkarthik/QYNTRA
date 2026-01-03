import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { codeExecutionService, CodeLanguage, ExecutionResult } from '../services/codeExecutionService';

interface CodeExecutorProps {
  initialCode: string;
  initialLanguage: CodeLanguage;
  onClose: () => void;
}

export const CodeExecutor: React.FC<CodeExecutorProps> = ({ initialCode, initialLanguage, onClose }) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState<CodeLanguage>(initialLanguage);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');

  useEffect(() => {
    // Parse initial code if it's HTML
    if (initialLanguage === CodeLanguage.HTML) {
      parseHTMLCode(initialCode);
    }
  }, [initialCode, initialLanguage]);

  const parseHTMLCode = (fullCode: string) => {
    // Simple parser to extract HTML, CSS, and JS
    const styleMatch = fullCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const scriptMatch = fullCode.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const bodyMatch = fullCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    if (styleMatch) setCssCode(styleMatch[1].trim());
    if (scriptMatch) setJsCode(scriptMatch[1].trim());
    if (bodyMatch) {
      const bodyContent = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim();
      setHtmlCode(bodyContent);
    } else {
      setHtmlCode(fullCode);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setResult(null);

    try {
      let executionResult: ExecutionResult;

      if (language === CodeLanguage.HTML) {
        executionResult = await codeExecutionService.executeHTML(htmlCode, cssCode, jsCode);
        if (executionResult.success) {
          setShowPreview(true);
        }
      } else if (language === CodeLanguage.JAVASCRIPT || language === CodeLanguage.TYPESCRIPT) {
        // Use simple execution for quick results
        executionResult = codeExecutionService.executeSimpleJS(code);
      } else {
        executionResult = {
          success: false,
          output: '',
          error: 'Language not supported for execution',
          executionTime: 0
        };
      }

      setResult(executionResult);
    } catch (error: any) {
      setResult({
        success: false,
        output: '',
        error: error.message || 'Execution failed',
        executionTime: 0
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-7xl h-[90vh] mx-4 bg-midnight-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-midnight-950/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Code Executor</h2>
            </div>

            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
              className="px-3 py-1.5 bg-midnight-800 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-accent"
            >
              <option value={CodeLanguage.JAVASCRIPT}>JavaScript</option>
              <option value={CodeLanguage.HTML}>HTML</option>
              <option value={CodeLanguage.TYPESCRIPT}>TypeScript</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Copy
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="px-4 py-1.5 bg-brand-accent text-white rounded-lg hover:bg-brand-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Running...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Run Code
                </>
              )}
            </button>
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
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10">
            {language === CodeLanguage.HTML ? (
              <div className="flex-1 overflow-auto">
                <div className="p-4 border-b border-white/5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HTML</label>
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="w-full mt-2 p-3 bg-midnight-950 border border-white/10 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent resize-none"
                    rows={8}
                    spellCheck={false}
                  />
                </div>
                <div className="p-4 border-b border-white/5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CSS</label>
                  <textarea
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className="w-full mt-2 p-3 bg-midnight-950 border border-white/10 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent resize-none"
                    rows={8}
                    spellCheck={false}
                  />
                </div>
                <div className="p-4">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">JavaScript</label>
                  <textarea
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    className="w-full mt-2 p-3 bg-midnight-950 border border-white/10 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent resize-none"
                    rows={8}
                    spellCheck={false}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-full p-4 bg-midnight-950 border border-white/10 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent resize-none"
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* Output/Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-midnight-950/50">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">
                {showPreview && language === CodeLanguage.HTML ? 'Preview' : 'Output'}
              </h3>
              {result && (
                <span className="text-xs text-slate-500">
                  Executed in {result.executionTime.toFixed(2)}ms
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {!result && (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Click "Run Code" to execute
                </div>
              )}

              {result && result.success && showPreview && language === CodeLanguage.HTML && (
                <iframe
                  srcDoc={result.output}
                  className="w-full h-full bg-white rounded-lg border border-white/10"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              )}

              {result && result.success && !showPreview && (
                <div className="bg-midnight-900 rounded-lg p-4 border border-white/10">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">{result.output}</pre>
                </div>
              )}

              {result && !result.success && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 mt-0.5 flex-shrink-0">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-400 mb-1">Execution Error</p>
                      <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap">{result.error}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { CodeBlock } from './CodeBlock';

interface MessageItemProps {
  message: Message;
  onPreview?: (code: string, language: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onPreview }) => {
  const isUser = message.role === 'user';
  const hasGrounding = message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      <div className={`max-w-4xl flex gap-5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${isUser ? 'bg-midnight-800 text-white ring-1 ring-white/10' : 'glass-panel text-brand-glow ring-1 ring-white/10'}`}>
          {isUser ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" x2="12" y1="3" y2="21"/><line x1="3" x2="21" y1="12" y2="12"/></svg>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block text-left shadow-2xl ${isUser ? 'bg-gradient-to-br from-brand-primary/80 to-brand-secondary/80 text-white px-6 py-4 rounded-3xl rounded-tr-sm backdrop-blur-md border border-white/10' : 'glass-panel text-slate-200 px-6 py-5 rounded-3xl rounded-tl-sm w-full'}`}>
                
                {/* Image Attachment Display */}
                {message.attachment && (
                  <div className="mb-4">
                    <img 
                      src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                      alt="Attachment" 
                      className="max-w-xs rounded-lg border border-white/10 shadow-lg"
                    />
                  </div>
                )}

                {/* AI-Generated Image Display */}
                {message.imageUrl && (
                  <div className="mb-4 group/image">
                    <img 
                      src={message.imageUrl} 
                      alt="AI Generated" 
                      className="max-w-full rounded-xl border border-white/10 shadow-2xl hover:shadow-brand-accent/20 transition-shadow cursor-pointer"
                      onClick={() => window.open(message.imageUrl, '_blank')}
                    />
                    <div className="mt-2 flex gap-2">
                      <a
                        href={message.imageUrl}
                        download="qyntra-generated-image.png"
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-brand-accent border border-white/5 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        Download
                      </a>
                      <button
                        onClick={() => window.open(message.imageUrl, '_blank')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-400 border border-white/5 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                        Open
                      </button>
                    </div>
                  </div>
                )}

                {message.isError ? (
                  <div className="text-red-300 p-3 border border-red-500/30 bg-red-900/20 rounded-xl flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div className={`prose prose-invert prose-sm max-w-none prose-p:leading-7 prose-headings:font-display prose-headings:text-slate-100 prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 ${isUser ? 'text-white/95' : 'text-slate-300'}`}>
                    <ReactMarkdown
                      components={{
                        code(props) {
                          const {children, className, node, ...rest} = props
                          const match = /language-(\w+)/.exec(className || '')
                          return match ? (
                            <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} onPreview={onPreview} />
                          ) : (
                            <code {...rest} className={`${isUser ? 'bg-white/20 text-white' : 'bg-black/30 text-brand-glow'} px-1.5 py-0.5 rounded text-[11px] font-mono border border-white/5`}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Grounding Sources */}
                {hasGrounding && (
                   <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        Sources
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {message.groundingMetadata?.groundingChunks.map((chunk, i) => (
                           chunk.web ? (
                            <a 
                              key={i} 
                              href={chunk.web.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-brand-glow truncate max-w-[200px] border border-white/5 transition-colors flex items-center gap-2"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                                {chunk.web.title || chunk.web.uri}
                            </a>
                           ) : null
                        ))}
                      </div>
                   </div>
                )}
            </div>
            {!isUser && (
                <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-500 uppercase tracking-widest pl-2 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    <span className="text-brand-glow font-bold">LEXIMERA</span>
                    <span className="text-slate-700">|</span>
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
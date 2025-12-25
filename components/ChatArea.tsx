import React, { useState, useRef, useEffect } from 'react';
import { Message, ModelConfig, ModelType, ChatSession, AIProvider } from '../types';
import { DEFAULT_MODEL_CONFIG, PRO_MODEL_CONFIG } from '../constants';
import { AIProviderFactory } from '../services/aiProviderFactory';
import { MessageItem } from './MessageItem';
import { Logo } from './Logo';
import { PreviewPanel } from './PreviewPanel';
import { embeddingService } from '../services/embeddingService';
import { vectorStore } from '../services/vectorStore';
import { imageService } from '../services/imageService';

interface ChatAreaProps {
  activeSessionId: string | null;
  currentSession: ChatSession | null;
  modelConfig: ModelConfig;
  onModelConfigChange: (config: ModelConfig) => void;
  onCreateSession: (firstMessage: Message, config: ModelConfig) => string;
  onUpdateSession: (sessionId: string, messages: Message[]) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  activeSessionId, 
  currentSession, 
  modelConfig, 
  onModelConfigChange,
  onCreateSession,
  onUpdateSession
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ mimeType: string; data: string } | null>(null);
  const [previewContent, setPreviewContent] = useState<{ code: string; language: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [useDocuments, setUseDocuments] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [usedSources, setUsedSources] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with parent session data
  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages);
    } else {
      setMessages([]);
      setPreviewContent(null);
    }
  }, [currentSession?.id, currentSession?.updatedAt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load document count
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        await vectorStore.init();
        const docs = await vectorStore.getAllDocuments();
        setDocumentCount(docs.length);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };
    loadDocuments();
  }, []);

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;

    // Check for /image command
    const imageCommand = imageService.parseImageCommand(input);
    
    if (imageCommand.isCommand) {
      // Handle image generation
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: Date.now()
      };

      setInput('');
      setIsLoading(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      let effectiveSessionId = activeSessionId;
      const optimisticMessages = [...messages, userMessage];
      setMessages(optimisticMessages);

      if (!effectiveSessionId) {
        effectiveSessionId = onCreateSession(userMessage, modelConfig);
      } else {
        onUpdateSession(effectiveSessionId, optimisticMessages);
      }

      try {
        // Generate image
        const result = await imageService.generateImage(imageCommand.prompt);
        
        const imageMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: result.success 
            ? `Generated image for: "${imageCommand.prompt}"` 
            : `Failed to generate image: ${result.error}`,
          timestamp: Date.now(),
          imageUrl: result.imageUrl,
          isError: !result.success
        };

        const finalHistory = [...optimisticMessages, imageMessage];
        setMessages(finalHistory);
        
        if (effectiveSessionId) {
          onUpdateSession(effectiveSessionId, finalHistory);
        }
      } catch (error) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'model',
          content: 'Failed to generate image. Please try again.',
          timestamp: Date.now(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular AI chat flow
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || (attachment ? 'Analyzed attached image' : ''),
      timestamp: Date.now(),
      attachment: attachment ? { ...attachment } : undefined
    };

    setInput('');
    setAttachment(null);
    setIsLoading(true);

    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    // Determine effective session ID (Create if not exists)
    let effectiveSessionId = activeSessionId;
    let currentHistory = messages;

    // Optimistically update local UI
    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);

    if (!effectiveSessionId) {
       effectiveSessionId = onCreateSession(userMessage, modelConfig);
       currentHistory = [userMessage];
    } else {
       onUpdateSession(effectiveSessionId, optimisticMessages);
       currentHistory = optimisticMessages;
    }

    try {
      const modelMessageId = (Date.now() + 1).toString();
      let streamedContent = '';
      
      const modelMessageStub: Message = {
        id: modelMessageId,
        role: 'model',
        content: '',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, modelMessageStub]);

      // RAG: Get document context if enabled
      let enhancedConfig = { ...modelConfig };
      const sources: string[] = [];
      
      if (useDocuments && documentCount > 0) {
        try {
          // Generate embedding for user query
          const queryEmbedding = await embeddingService.generateEmbedding(userMessage.content);
          
          // Search for relevant chunks
          const relevantChunks = await vectorStore.searchSimilar(queryEmbedding, 3, 0.6);
          
          if (relevantChunks.length > 0) {
            // Get document names for sources
            const docIds = [...new Set(relevantChunks.map(c => c.documentId))];
            for (const docId of docIds) {
              const doc = await vectorStore.getDocument(docId);
              if (doc) sources.push(doc.name);
            }
            
            // Build context from chunks
            const context = relevantChunks.map((chunk, i) => 
              `[Source ${i + 1}]\n${chunk.content}`
            ).join('\n\n---\n\n');
            
            // Enhance system instruction with context
            const baseInstruction = modelConfig.systemInstruction || 'You are a helpful AI assistant.';
            enhancedConfig.systemInstruction = `${baseInstruction}\n\nRELEVANT CONTEXT FROM USER'S DOCUMENTS:\n${context}\n\nPlease answer the user's question using the provided context when relevant. If you use information from the context, mention which source number you're referencing.`;
            
            setUsedSources(sources);
          }
        } catch (error) {
          console.error('RAG context error:', error);
          // Continue without context if there's an error
        }
      }

      // Stream response using valid history with automatic fallback
      const stream = AIProviderFactory.streamMessageWithFallback(userMessage, currentHistory, enhancedConfig);
      
      let finalGrounding;

      for await (const chunk of stream) {
        streamedContent += chunk.text;
        if (chunk.grounding) {
            finalGrounding = chunk.grounding;
        }

        setMessages(prev => prev.map(msg => 
          msg.id === modelMessageId 
            ? { ...msg, content: streamedContent, groundingMetadata: finalGrounding }
            : msg
        ));
      }

      const finalModelMessage: Message = { 
          ...modelMessageStub, 
          content: streamedContent,
          groundingMetadata: finalGrounding
      };
      const finalHistory = [...currentHistory, finalModelMessage];
      
      if (effectiveSessionId) {
          onUpdateSession(effectiveSessionId, finalHistory);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: 'I encountered an error connecting to the intelligence layer. Please check your API Key and try again.',
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleModelToggle = (type: 'FLASH' | 'PRO') => {
    onModelConfigChange({
        ...modelConfig,
        ... (type === 'FLASH' ? DEFAULT_MODEL_CONFIG : PRO_MODEL_CONFIG)
    });
  };

  const toggleSearch = () => {
      onModelConfigChange({
          ...modelConfig,
          useSearch: !modelConfig.useSearch
      });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1];
            setAttachment({ mimeType: file.type, data: base64 });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSpeech = () => {
    if (isListening) return;
    
    // Simple check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const togglePreview = (code: string, language: string) => {
    setPreviewContent({ code, language });
  };

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      
      {/* Left Pane: Chat */}
      <div className={`flex flex-col h-full transition-all duration-300 ${previewContent ? 'w-1/2' : 'w-full max-w-6xl mx-auto'}`}>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-20 pb-4 space-y-10 scroll-smooth">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
                 <div className="w-24 h-24 bg-gradient-to-br from-midnight-900 to-black rounded-3xl flex items-center justify-center mb-8 border border-white/5 shadow-2xl shadow-brand-primary/10 relative group">
                    <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <Logo className="w-12 h-12" animated={true} />
                 </div>
                 <h2 className="text-4xl font-display font-medium tracking-tight text-white mb-4">QYNTRA</h2>
                 <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.2em] text-brand-glow uppercase mb-8 opacity-80 font-mono">
                    <span>Precise</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>Intelligent</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>Secure</span>
                 </div>
                 <p className="text-sm text-slate-500 max-w-md text-center leading-relaxed font-light">
                   System ready. Select a <strong>Neural Engine</strong> to begin synthesis, analysis, or optimization tasks.
                 </p>
              </div>
            )}
            
            {messages.map(msg => (
              <MessageItem key={msg.id} message={msg} onPreview={togglePreview} />
            ))}
            {isLoading && (
                <div className="flex justify-start w-full mb-6">
                     <div className="flex items-center gap-3 ml-14 bg-white/[0.02] border border-white/5 px-4 py-3 rounded-2xl backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-glow"></span>
                        </span>
                        <span className="font-mono text-[10px] text-brand-glow tracking-widest uppercase shadow-glow">Computing</span>
                     </div>
                </div>
            )}
            <div ref={messagesEndRef} className="h-32" /> 
          </div>

          {/* Floating Input Area */}
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-midnight-950 via-midnight-950/90 to-transparent pointer-events-none z-20">
            <div className={`mx-auto pointer-events-auto transition-all duration-300 ${previewContent ? 'w-full px-4' : 'max-w-4xl'}`}>
              
              {/* Model & Tool Selector Pill */}
              <div className="flex justify-center mb-5 gap-3">
                   {/* Provider Selector */}
                   <select
                      value={modelConfig.provider || AIProvider.GEMINI}
                      onChange={(e) => {
                        const newProvider = e.target.value as AIProvider;
                        let newModel = modelConfig.model;
                        
                        console.log('🔄 Provider changing from', modelConfig.provider, 'to', newProvider);
                        console.log('🔄 Current model:', modelConfig.model);
                        
                        // Auto-select appropriate model for the provider
                        if (newProvider === AIProvider.GROQ) {
                          newModel = ModelType.LLAMA_70B; // Default Groq model
                          console.log('✅ Auto-selected Groq model:', newModel);
                        } else if (newProvider === AIProvider.GEMINI) {
                          newModel = ModelType.FLASH; // Default Gemini model
                          console.log('✅ Auto-selected Gemini model:', newModel);
                        }
                        
                        const newConfig = {
                          ...modelConfig,
                          provider: newProvider,
                          model: newModel
                        };
                        
                        console.log('✅ New config:', newConfig);
                        onModelConfigChange(newConfig);
                      }}
                      className="px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 border backdrop-blur-xl bg-black/40 border-white/5 text-slate-300 hover:bg-white/5 font-mono cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                   >
                      {AIProviderFactory.getAvailableProviders().map(provider => (
                        <option key={provider} value={provider} className="bg-midnight-900">
                          {provider.toUpperCase()}
                        </option>
                      ))}
                   </select>

                   <div className="glass-panel p-1 rounded-full flex gap-1 shadow-2xl backdrop-blur-xl bg-black/40">
                       <button 
                          onClick={() => handleModelToggle('FLASH')}
                          className={`px-6 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 font-mono ${modelConfig.model === ModelType.FLASH ? 'bg-midnight-800 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                       >
                          VELOCITY
                       </button>
                       <button 
                          onClick={() => handleModelToggle('PRO')}
                          className={`px-6 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 font-mono ${modelConfig.model === ModelType.PRO ? 'bg-brand-secondary text-white shadow-lg shadow-brand-secondary/20 ring-1 ring-brand-secondary/50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                       >
                          ARCHITECT
                       </button>
                   </div>

                   {/* Document Context Toggle */}
                   {documentCount > 0 && (
                     <button 
                       onClick={() => setUseDocuments(!useDocuments)}
                       className={`px-4 py-2 rounded-full flex items-center gap-2 text-[11px] font-bold tracking-wide transition-all duration-300 border backdrop-blur-xl ${useDocuments ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-accent shadow-lg shadow-brand-primary/10' : 'bg-black/40 border-white/5 text-slate-500 hover:bg-white/5'}`}
                       title={`${documentCount} documents available`}
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                         <polyline points="14 2 14 8 20 8"/>
                       </svg>
                       <span>DOCS {useDocuments ? 'ON' : 'OFF'}</span>
                     </button>
                   )}

                   {/* Search Toggle */}
                   <button 
                        onClick={toggleSearch}
                        className={`px-4 py-2 rounded-full flex items-center gap-2 text-[11px] font-bold tracking-wide transition-all duration-300 border backdrop-blur-xl ${modelConfig.useSearch ? 'bg-brand-accent/20 border-brand-accent/50 text-brand-accent shadow-lg shadow-brand-accent/10' : 'bg-black/40 border-white/5 text-slate-500 hover:bg-white/5'}`}
                   >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <span>SEARCH {modelConfig.useSearch ? 'ON' : 'OFF'}</span>
                   </button>
              </div>

              <div className="relative group">
                 {/* Glow effect */}
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-secondary/40 to-brand-accent/40 rounded-3xl opacity-0 group-focus-within:opacity-100 blur-lg transition duration-700"></div>
                 
                 <div className="relative flex flex-col glass-input rounded-3xl overflow-hidden transition-all duration-300 bg-midnight-900/80">
                     {/* Document Sources Indicator */}
                     {useDocuments && usedSources.length > 0 && (
                       <div className="px-4 pt-3 pb-2 border-b border-white/5">
                         <div className="flex items-center gap-2 text-xs text-brand-accent">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                             <polyline points="14 2 14 8 20 8"/>
                           </svg>
                           <span className="font-medium">Using context from:</span>
                           <span className="text-slate-400">{usedSources.join(', ')}</span>
                         </div>
                       </div>
                     )}
                     
                    {attachment && (
                        <div className="px-4 pt-4 pb-0 flex">
                            <div className="relative group/att">
                                <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                                <button 
                                    onClick={() => setAttachment(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/att:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInputResize}
                      onKeyDown={handleKeyDown}
                      placeholder="Input prompt, paste code for refactoring, or define architecture..."
                      className="w-full bg-transparent text-slate-100 pl-6 pr-14 py-4 min-h-[60px] max-h-60 resize-none focus:outline-none placeholder:text-slate-600 text-sm leading-relaxed scrollbar-hide font-light"
                      rows={1}
                    />
                    <div className="flex justify-between items-center px-4 pb-3 pt-1">
                       <div className="flex gap-2 text-slate-500">
                          {/* Attach Button */}
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-lg hover:bg-white/5 hover:text-slate-300 transition-colors"
                            title="Attach Image"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          </button>
                          {/* Basic STT Button (Legacy) */}
                          <button 
                            onClick={handleSpeech}
                            className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${isListening ? 'text-red-400 animate-pulse' : 'hover:text-slate-300'}`}
                            title="Quick Dictation"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                          </button>
                       </div>
                       <button
                          onClick={handleSend}
                          disabled={(!input.trim() && !attachment) || isLoading}
                          className={`p-2 rounded-xl transition-all duration-300 ${(!input.trim() && !attachment) || isLoading ? 'bg-white/5 text-slate-700' : 'bg-brand-gradient text-white shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 hover:scale-105'}`}
                       >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                       </button>
                    </div>
                 </div>
              </div>
              
              <div className="text-center mt-4 text-[9px] text-slate-600 font-medium tracking-widest uppercase font-mono">
                 QYNTRA v1.0 • INTELLIGENCE ENGINE
              </div>
            </div>
          </div>
      </div>

      {/* Right Pane: Preview */}
      {previewContent && (
        <div className="w-1/2 h-full absolute right-0 top-0 z-30 pt-16 pb-4 pr-4 pl-0 transition-transform duration-300 bg-midnight-950/50 backdrop-blur-sm">
             <PreviewPanel 
                code={previewContent.code} 
                language={previewContent.language} 
                onClose={() => setPreviewContent(null)} 
             />
        </div>
      )}

    </div>
  );
};
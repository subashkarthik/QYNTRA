export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isError?: boolean;
  attachment?: {
    mimeType: string;
    data: string; // base64
  };
  groundingMetadata?: GroundingMetadata;
}

export interface GroundingMetadata {
  groundingChunks: {
    web?: {
      uri: string;
      title: string;
    };
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  modelConfig?: ModelConfig;
}

export interface ModelConfig {
  model: string;
  temperature: number;
  topK: number;
  topP: number;
  maxTokens?: number; // Maximum tokens for response
  thinkingBudget: number; // 0 to disable
  systemInstruction?: string;
  useSearch?: boolean;
  provider?: AIProvider; // Which AI provider to use
}

export enum AIProvider {
  GEMINI = 'gemini',
  GROQ = 'groq'
}

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  models: string[];
  displayName: string;
  isAvailable: boolean;
}

export enum ModelType {
  // Gemini Models
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  
  // Groq Models (updated to current models as of Dec 2024)
  LLAMA_70B = 'llama-3.3-70b-versatile',
  LLAMA_8B = 'llama-3.1-8b-instant',
  MIXTRAL = 'mixtral-8x7b-32768',
  GEMMA_7B = 'gemma2-9b-it'
}

export interface CodeBlockProps {
  language: string;
  code: string;
  onPreview?: (code: string, language: string) => void;
}

export type ThemeId = 'leximera' | 'cyberpunk' | 'forest' | 'sunset' | 'ocean';

export interface ThemeColors {
  '--color-midnight-800': string;
  '--color-midnight-900': string;
  '--color-midnight-950': string;
  '--color-brand-primary': string;
  '--color-brand-secondary': string;
  '--color-brand-accent': string;
  '--color-brand-glow': string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  instruction: string;
}

// Document types for RAG
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  content: string;
  chunkCount: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    page?: number;
    section?: string;
    startIndex: number;
    endIndex: number;
  };
}

export interface SearchResult {
  id: string;
  type: 'conversation' | 'document';
  title: string;
  snippet: string;
  similarity: number;
  timestamp?: number;
  documentId?: string;
  sessionId?: string;
}
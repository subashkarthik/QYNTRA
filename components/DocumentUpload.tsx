import React, { useState, useRef } from 'react';
import { Document } from '../types';
import { documentService } from '../services/documentService';
import { embeddingService } from '../services/embeddingService';
import { vectorStore } from '../services/vectorStore';

interface DocumentUploadProps {
  onUploadComplete?: (doc: Document) => void;
  onError?: (error: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  onError
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setCurrentFile(file.name);
    setUploadProgress(0);

    try {
      // Step 1: Parse file (20%)
      setUploadProgress(20);
      const content = await documentService.parseFile(file);

      // Step 2: Create chunks (40%)
      setUploadProgress(40);
      const chunks = documentService.createChunks(
        `doc_${Date.now()}`,
        content
      );

      // Step 3: Generate embeddings (60-80%)
      setUploadProgress(60);
      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);

      // Add embeddings to chunks
      const chunksWithEmbeddings = chunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i]
      }));

      setUploadProgress(80);

      // Step 4: Store in IndexedDB (90%)
      const document: Document = {
        id: chunks[0].documentId,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now(),
        content: content,
        chunkCount: chunks.length
      };

      await vectorStore.storeDocument(document, chunksWithEmbeddings);
      setUploadProgress(100);

      // Success!
      setTimeout(() => {
        setIsUploading(false);
        setCurrentFile('');
        setUploadProgress(0);
        onUploadComplete?.(document);
      }, 500);

    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setCurrentFile('');
      setUploadProgress(0);
      onError?.(error.message || 'Failed to upload document');
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300
          ${isDragging 
            ? 'border-brand-accent bg-brand-accent/10 scale-105' 
            : 'border-white/20 hover:border-brand-accent/50 hover:bg-white/5'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".txt,.md,.pdf,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.json,.xml,.yaml,.yml"
          className="hidden"
          multiple
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isDragging ? 'bg-brand-accent/20' : 'bg-white/5'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDragging ? 'text-brand-accent' : 'text-slate-400'}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-slate-200">
              {isDragging ? 'Drop files here' : 'Upload Documents'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Drag & drop or click to browse
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-600">
            <span className="px-2 py-1 bg-white/5 rounded">PDF</span>
            <span className="px-2 py-1 bg-white/5 rounded">TXT</span>
            <span className="px-2 py-1 bg-white/5 rounded">MD</span>
            <span className="px-2 py-1 bg-white/5 rounded">Code Files</span>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-midnight-900/50 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300 truncate flex-1 mr-4">
              {currentFile}
            </span>
            <span className="text-xs text-brand-accent font-mono">
              {uploadProgress}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {uploadProgress < 40 ? 'Parsing document...' :
             uploadProgress < 80 ? 'Generating embeddings...' :
             'Storing in database...'}
          </p>
        </div>
      )}
    </div>
  );
};

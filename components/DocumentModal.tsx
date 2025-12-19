import React, { useState, useEffect } from 'react';
import { Document } from '../types';
import { DocumentUpload } from './DocumentUpload';
import { DocumentManager } from './DocumentManager';
import { vectorStore } from '../services/vectorStore';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      // Initialize vector store
      vectorStore.init().catch(console.error);
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      const docs = await vectorStore.getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleUploadComplete = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    showNotification('success', `${doc.name} uploaded successfully!`);
    setActiveTab('manage');
  };

  const handleUploadError = (error: string) => {
    showNotification('error', error);
  };

  const handleDelete = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
    showNotification('success', 'Document deleted');
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-midnight-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 font-display">
              📚 Document Library
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload documents for AI-powered context and search
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-white/5">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-brand-primary/20 text-brand-accent border border-brand-primary/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            📤 Upload
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'manage'
                ? 'bg-brand-primary/20 text-brand-accent border border-brand-primary/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            📁 Manage ({documents.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'upload' ? (
            <DocumentUpload
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />
          ) : (
            <DocumentManager
              documents={documents}
              onDelete={handleDelete}
              onRefresh={loadDocuments}
            />
          )}
        </div>

        {/* Notification */}
        {notification && (
          <div className={`absolute bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg border ${
            notification.type === 'success'
              ? 'bg-green-500/20 border-green-500/30 text-green-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? '✓' : '✗'}
              <span className="text-sm">{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

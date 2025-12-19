import React, { useState, useEffect } from 'react';
import { Document } from '../types';
import { vectorStore } from '../services/vectorStore';

interface DocumentManagerProps {
  documents: Document[];
  onDelete?: (docId: string) => void;
  onRefresh?: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onDelete,
  onRefresh
}) => {
  const [storageSize, setStorageSize] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    updateStorageSize();
  }, [documents]);

  const updateStorageSize = async () => {
    const size = await vectorStore.getStorageSize();
    setStorageSize(size);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (docId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await vectorStore.deleteDocument(docId);
      onDelete?.(docId);
      onRefresh?.();
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('text') || type.includes('markdown')) return '📝';
    if (type.includes('javascript') || type.includes('typescript')) return '⚡';
    if (type.includes('python')) return '🐍';
    if (type.includes('java')) return '☕';
    return '📎';
  };

  return (
    <div className="space-y-4">
      {/* Storage Info */}
      <div className="bg-midnight-900/50 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Total Storage</p>
            <p className="text-2xl font-bold text-brand-accent font-mono">
              {formatBytes(storageSize)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Documents</p>
            <p className="text-2xl font-bold text-slate-200">
              {documents.length}
            </p>
          </div>
        </div>
        
        {storageSize > 50 * 1024 * 1024 && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
            ⚠️ Storage usage is high. Consider deleting unused documents.
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm">No documents uploaded yet</p>
            <p className="text-xs mt-1">Upload documents to enable AI-powered search</p>
          </div>
        ) : (
          documents.map(doc => (
            <div
              key={doc.id}
              className="group bg-midnight-900/30 hover:bg-midnight-900/50 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all cursor-pointer"
              onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getFileIcon(doc.type)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-slate-200 truncate">
                      {doc.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/10 transition-all"
                      title="Delete document"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{formatBytes(doc.size)}</span>
                    <span>•</span>
                    <span>{doc.chunkCount} chunks</span>
                    <span>•</span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                  </div>

                  {/* Expanded Details */}
                  {selectedDoc?.id === doc.id && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-slate-400 mb-2">Content Preview:</p>
                      <div className="bg-black/30 rounded p-3 text-xs text-slate-300 font-mono max-h-32 overflow-y-auto custom-scrollbar">
                        {doc.content.substring(0, 300)}
                        {doc.content.length > 300 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

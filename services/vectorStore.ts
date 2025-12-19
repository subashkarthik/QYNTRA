import { Document, DocumentChunk } from '../types';

/**
 * Vector Store - Store and search embeddings in IndexedDB
 */

const DB_NAME = 'leximera_vectors';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';

export class VectorStore {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create documents store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const docStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
          docStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }

        // Create chunks store
        if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
          const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
          chunkStore.createIndex('documentId', 'documentId', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  /**
   * Store document and its chunks
   */
  async storeDocument(doc: Document, chunks: DocumentChunk[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');

    // Store document
    const docStore = transaction.objectStore(DOCUMENTS_STORE);
    docStore.put(doc);

    // Store chunks
    const chunkStore = transaction.objectStore(CHUNKS_STORE);
    for (const chunk of chunks) {
      chunkStore.put(chunk);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<Document[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(DOCUMENTS_STORE, 'readonly');
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(DOCUMENTS_STORE, 'readonly');
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get chunks for a document
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(CHUNKS_STORE, 'readonly');
    const store = transaction.objectStore(CHUNKS_STORE);
    const index = store.index('documentId');
    const request = index.getAll(documentId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all chunks
   */
  async getAllChunks(): Promise<DocumentChunk[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(CHUNKS_STORE, 'readonly');
    const store = transaction.objectStore(CHUNKS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search for similar chunks using cosine similarity
   */
  async searchSimilar(
    queryEmbedding: number[],
    topK: number = 5,
    similarityThreshold: number = 0.5
  ): Promise<Array<DocumentChunk & { similarity: number }>> {
    // Get all chunks
    const allChunks = await this.getAllChunks();

    // Calculate similarities
    const similarities = allChunks.map(chunk => ({
      ...chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Filter and sort
    return similarities
      .filter(item => item.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Delete document and its chunks
   */
  async deleteDocument(documentId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');

    // Delete document
    const docStore = transaction.objectStore(DOCUMENTS_STORE);
    docStore.delete(documentId);

    // Delete chunks
    const chunkStore = transaction.objectStore(CHUNKS_STORE);
    const index = chunkStore.index('documentId');
    const request = index.openCursor(IDBKeyRange.only(documentId));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');

    transaction.objectStore(DOCUMENTS_STORE).clear();
    transaction.objectStore(CHUNKS_STORE).clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get total storage size (approximate)
   */
  async getStorageSize(): Promise<number> {
    const documents = await this.getAllDocuments();
    return documents.reduce((total, doc) => total + doc.size, 0);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

export const vectorStore = new VectorStore();

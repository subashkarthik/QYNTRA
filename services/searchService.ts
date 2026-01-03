import Fuse from 'fuse.js';
import { ChatSession, Message, SearchResult } from '../types';
import { embeddingService } from './embeddingService';
import { vectorStore } from './vectorStore';

class SearchService {
  private fuse: Fuse<ChatSession> | null = null;

  // Initialize Fuse.js for fuzzy text search
  initializeFuzzySearch(sessions: ChatSession[]): void {
    this.fuse = new Fuse(sessions, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'messages.content', weight: 1 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2
    });
  }

  // Fuzzy text search across conversations
  fuzzySearch(query: string, sessions: ChatSession[], limit: number = 10): SearchResult[] {
    if (!this.fuse || sessions.length === 0) {
      this.initializeFuzzySearch(sessions);
    }

    if (!this.fuse || !query.trim()) {
      return [];
    }

    const results = this.fuse.search(query, { limit });

    return results.map(result => {
      const session = result.item;
      const score = result.score || 0;
      
      // Find the best matching message
      let bestMatch = session.messages[0];
      let bestMatchScore = Infinity;

      if (result.matches) {
        for (const match of result.matches) {
          if (match.key === 'messages.content' && match.score !== undefined && match.score < bestMatchScore) {
            const messageIndex = parseInt(match.refIndex?.toString() || '0');
            if (session.messages[messageIndex]) {
              bestMatch = session.messages[messageIndex];
              bestMatchScore = match.score;
            }
          }
        }
      }

      // Create snippet
      const snippet = this.createSnippet(bestMatch.content, query);

      return {
        id: session.id,
        type: 'conversation' as const,
        title: session.title,
        snippet,
        similarity: 1 - score, // Invert score (lower is better in Fuse.js)
        timestamp: session.updatedAt,
        sessionId: session.id
      };
    });
  }

  // Semantic search using embeddings
  async semanticSearch(query: string, sessions: ChatSession[], limit: number = 10): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Search across all messages in all sessions
      const allResults: Array<SearchResult & { sessionId: string; messageId: string }> = [];

      for (const session of sessions) {
        for (const message of session.messages) {
          // Generate embedding for each message (in production, these should be pre-computed)
          const messageEmbedding = await embeddingService.generateEmbedding(message.content);
          
          // Calculate cosine similarity
          const similarity = this.cosineSimilarity(queryEmbedding, messageEmbedding);

          if (similarity > 0.5) { // Threshold for relevance
            allResults.push({
              id: `${session.id}-${message.id}`,
              type: 'conversation' as const,
              title: session.title,
              snippet: this.createSnippet(message.content, query),
              similarity,
              timestamp: session.updatedAt,
              sessionId: session.id,
              messageId: message.id
            });
          }
        }
      }

      // Sort by similarity and limit results
      return allResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Semantic search failed:', error);
      // Fallback to fuzzy search
      return this.fuzzySearch(query, sessions, limit);
    }
  }

  // Hybrid search combining fuzzy and semantic
  async hybridSearch(query: string, sessions: ChatSession[], limit: number = 10): Promise<SearchResult[]> {
    try {
      // Get results from both methods
      const fuzzyResults = this.fuzzySearch(query, sessions, limit);
      const semanticResults = await this.semanticSearch(query, sessions, limit);

      // Combine and deduplicate
      const combinedMap = new Map<string, SearchResult>();

      // Add fuzzy results with weight
      fuzzyResults.forEach(result => {
        combinedMap.set(result.id, {
          ...result,
          similarity: result.similarity * 0.4 // Weight fuzzy results at 40%
        });
      });

      // Add or merge semantic results with weight
      semanticResults.forEach(result => {
        const existing = combinedMap.get(result.id);
        if (existing) {
          // Combine scores
          combinedMap.set(result.id, {
            ...result,
            similarity: existing.similarity + (result.similarity * 0.6) // Weight semantic at 60%
          });
        } else {
          combinedMap.set(result.id, {
            ...result,
            similarity: result.similarity * 0.6
          });
        }
      });

      // Sort by combined similarity and limit
      return Array.from(combinedMap.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Hybrid search failed:', error);
      return this.fuzzySearch(query, sessions, limit);
    }
  }

  // Create a snippet with context around the query
  private createSnippet(content: string, query: string, contextLength: number = 100): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) {
      // Query not found, return beginning
      return content.slice(0, contextLength * 2) + (content.length > contextLength * 2 ? '...' : '');
    }

    // Extract context around the match
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + query.length + contextLength);
    
    let snippet = content.slice(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // Filter results by date range
  filterByDateRange(results: SearchResult[], startDate?: Date, endDate?: Date): SearchResult[] {
    return results.filter(result => {
      if (!result.timestamp) return true;
      const resultDate = new Date(result.timestamp);
      if (startDate && resultDate < startDate) return false;
      if (endDate && resultDate > endDate) return false;
      return true;
    });
  }

  // Filter results by model/provider
  filterByModel(results: SearchResult[], sessions: ChatSession[], modelFilter: string): SearchResult[] {
    return results.filter(result => {
      const session = sessions.find(s => s.id === result.sessionId);
      if (!session || !session.modelConfig) return false;
      return session.modelConfig.model.includes(modelFilter);
    });
  }
}

export const searchService = new SearchService();

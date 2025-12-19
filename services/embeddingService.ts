/**
 * Embedding Service - Generate embeddings using Gemini API
 */

const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class EmbeddingService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found. Embedding features will not work.');
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: {
              parts: [{ text }]
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Embedding API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.embedding.values;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // Process in batches to avoid rate limits
    const BATCH_SIZE = 5;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(text => this.generateEmbedding(text))
      );
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same length');
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

  /**
   * Find most similar vectors from a list
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidates: Array<{ embedding: number[]; data: any }>,
    topK: number = 5
  ): Array<{ similarity: number; data: any }> {
    const similarities = candidates.map(candidate => ({
      similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding),
      data: candidate.data
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

export const embeddingService = new EmbeddingService();

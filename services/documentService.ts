import { Document, DocumentChunk } from '../types';

/**
 * Document Service - Parse and chunk documents
 */

export class DocumentService {
  /**
   * Parse file based on type
   */
  async parseFile(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Text files
    if (
      fileType === 'text/plain' ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.markdown')
    ) {
      return await this.parseTextFile(file);
    }

    // Code files
    if (this.isCodeFile(fileName)) {
      return await this.parseTextFile(file);
    }

    // PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await this.parsePDFFile(file);
    }

    throw new Error(`Unsupported file type: ${fileType || fileName}`);
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(fileName: string): boolean {
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala',
      '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.sql'
    ];
    return codeExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Parse text file
   */
  private async parseTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse PDF file using PDF.js
   */
  private async parsePDFFile(file: File): Promise<string> {
    try {
      // Dynamic import of PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n\n--- Page ${i} ---\n\n${pageText}`;
      }
      
      return fullText;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Chunk text into smaller pieces with overlap
   */
  chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50
  ): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  /**
   * Create document chunks with metadata
   */
  createChunks(
    documentId: string,
    text: string,
    chunkSize: number = 500
  ): Omit<DocumentChunk, 'embedding'>[] {
    const textChunks = this.chunkText(text, chunkSize);
    
    return textChunks.map((content, index) => ({
      id: `${documentId}_chunk_${index}`,
      documentId,
      content,
      embedding: [], // Will be filled by embedding service
      metadata: {
        startIndex: index * chunkSize,
        endIndex: (index + 1) * chunkSize,
      }
    }));
  }

  /**
   * Extract metadata from file
   */
  getFileMetadata(file: File): {
    name: string;
    type: string;
    size: number;
  } {
    return {
      name: file.name,
      type: file.type || this.guessFileType(file.name),
      size: file.size
    };
  }

  /**
   * Guess file type from extension
   */
  private guessFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'pdf': 'application/pdf',
      'js': 'text/javascript',
      'ts': 'text/typescript',
      'py': 'text/x-python',
      'java': 'text/x-java',
      'cpp': 'text/x-c++src',
      'json': 'application/json',
    };
    return typeMap[ext || ''] || 'application/octet-stream';
  }
}

export const documentService = new DocumentService();

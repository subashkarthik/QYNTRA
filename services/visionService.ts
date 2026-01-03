import { GoogleGenAI } from '@google/genai';
import { ImageAttachment } from '../types';

class VisionService {
  private apiKey: string | null = null;
  private genAI: GoogleGenAI | null = null;

  initialize(apiKey: string): void {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenAI({ apiKey });
  }

  // Convert File to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Validate image file
  validateImage(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PNG, JPEG, WebP, HEIC, or HEIF images.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Maximum size is 20MB.'
      };
    }

    return { valid: true };
  }

  // Create ImageAttachment from File
  async createImageAttachment(file: File): Promise<ImageAttachment> {
    const validation = this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const base64Data = await this.fileToBase64(file);

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      data: base64Data,
      mimeType: file.type,
      name: file.name,
      size: file.size
    };
  }

  // Analyze image with Gemini Vision
  async analyzeImage(
    prompt: string,
    images: ImageAttachment[],
    modelName: string = 'gemini-2.0-flash-exp'
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Vision service not initialized. Please set your API key.');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // Prepare image parts
      const imageParts = images.map(img => ({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      }));

      // Create content with text and images
      const result = await model.generateContent([
        prompt,
        ...imageParts
      ]);

      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('Vision analysis failed:', error);
      throw new Error(`Failed to analyze image: ${error.message || 'Unknown error'}`);
    }
  }

  // Compress image if needed (basic compression)
  async compressImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Get image dimensions
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

export const visionService = new VisionService();

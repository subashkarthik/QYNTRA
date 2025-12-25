/**
 * Image Generation Service
 * Uses Pollinations.ai free API for AI image generation
 */

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export class ImageService {
  private baseUrl = 'https://image.pollinations.ai/prompt';

  /**
   * Generate an image from a text prompt
   * @param prompt - The text description of the image to generate
   * @returns Promise with image URL or error
   */
  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    try {
      if (!prompt || prompt.trim().length === 0) {
        return {
          success: false,
          error: 'Prompt cannot be empty'
        };
      }

      // Encode the prompt for URL
      const encodedPrompt = encodeURIComponent(prompt.trim());
      
      // Pollinations.ai URL format with quality parameters
      const imageUrl = `${this.baseUrl}/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true`;

      // Verify the image loads by attempting to fetch it
      const response = await fetch(imageUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to generate image'
        };
      }

      return {
        success: true,
        imageUrl
      };
    } catch (error) {
      console.error('Image generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if a message contains an image generation command
   * @param message - The user message to check
   * @returns Object with isCommand flag and extracted prompt
   */
  parseImageCommand(message: string): { isCommand: boolean; prompt: string } {
    const trimmed = message.trim();
    const imageCommandRegex = /^\/image\s+(.+)$/i;
    const match = trimmed.match(imageCommandRegex);

    if (match && match[1]) {
      return {
        isCommand: true,
        prompt: match[1].trim()
      };
    }

    return {
      isCommand: false,
      prompt: ''
    };
  }
}

export const imageService = new ImageService();

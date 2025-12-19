import { AIProvider, Message, ModelConfig, GroundingMetadata } from "../types";
import { geminiService } from "./geminiService";
import { groqService } from "./groqService";

// Provider interface for type safety
interface AIProviderService {
  streamMessage(
    lastMessage: Message,
    history: Message[],
    config: ModelConfig
  ): AsyncGenerator<{ text: string; grounding?: GroundingMetadata }, void, unknown>;
}

export class AIProviderFactory {
  private static providers: Map<AIProvider, AIProviderService> = new Map([
    [AIProvider.GEMINI, geminiService as any],
    [AIProvider.GROQ, groqService as any]
  ]);

  /**
   * Get the appropriate AI provider service
   */
  static getProvider(provider: AIProvider): AIProviderService {
    const service = this.providers.get(provider);
    if (!service) {
      throw new Error(`Provider ${provider} not found`);
    }
    return service;
  }

  /**
   * Check if a provider is available (has API key)
   */
  static isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case AIProvider.GEMINI:
        return !!process.env.GEMINI_API_KEY;
      case AIProvider.GROQ:
        return !!process.env.GROQ_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): AIProvider[] {
    return [AIProvider.GEMINI, AIProvider.GROQ].filter(
      (provider) => this.isProviderAvailable(provider)
    );
  }

  /**
   * Get the first available provider (fallback logic)
   */
  static getFirstAvailableProvider(): AIProvider | null {
    const available = this.getAvailableProviders();
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Stream message with automatic fallback
   */
  static async *streamMessageWithFallback(
    lastMessage: Message,
    history: Message[],
    config: ModelConfig
  ): AsyncGenerator<
    { text: string; grounding?: GroundingMetadata; provider?: AIProvider },
    void,
    unknown
  > {
    const primaryProvider = config.provider || AIProvider.GEMINI;
    const availableProviders = this.getAvailableProviders();

    // Try primary provider first
    if (availableProviders.includes(primaryProvider)) {
      try {
        const service = this.getProvider(primaryProvider);
        for await (const chunk of service.streamMessage(lastMessage, history, config)) {
          yield { ...chunk, provider: primaryProvider };
        }
        return;
      } catch (error) {
        console.warn(`Primary provider ${primaryProvider} failed, trying fallback...`, error);
      }
    }

    // Try fallback providers
    for (const provider of availableProviders) {
      if (provider === primaryProvider) continue; // Already tried

      try {
        const service = this.getProvider(provider);
        console.log(`Falling back to provider: ${provider}`);
        
        // Create new config with appropriate model for this provider
        const fallbackConfig = { ...config };
        if (provider === AIProvider.GROQ) {
          fallbackConfig.model = 'llama-3.3-70b-versatile'; // Default Groq model
        } else if (provider === AIProvider.GEMINI) {
          fallbackConfig.model = 'gemini-2.5-flash'; // Default Gemini model
        }
        
        for await (const chunk of service.streamMessage(lastMessage, history, fallbackConfig)) {
          yield { ...chunk, provider };
        }
        return;
      } catch (error) {
        console.warn(`Fallback provider ${provider} failed`, error);
      }
    }

    throw new Error("All AI providers failed. Please check your API keys.");
  }
}

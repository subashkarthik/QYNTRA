import OpenAI from "openai";
import { Message, ModelConfig, GroundingMetadata } from "../types";
import { ApiKeyRotation } from "./apiKeyRotation";

// Initialize API key rotation
const apiKeys = process.env.OPENROUTER_API_KEY || "";
const keyRotation = new ApiKeyRotation(apiKeys);

export class OpenRouterService {
  private openrouter: OpenAI;
  private currentKey: string;

  constructor() {
    console.log('🔍 OpenRouter Service Initializing...');
    console.log('🔍 OPENROUTER_API_KEY from env:', apiKeys ? `${apiKeys.substring(0, 20)}...` : 'MISSING');
    console.log('🔍 Key rotation will use:', keyRotation.getKeyCount(), 'key(s)');
    
    if (!apiKeys) {
      console.warn("OpenRouter API Key is missing. Please set process.env.OPENROUTER_API_KEY");
    }
    this.currentKey = keyRotation.getNextKey();
    this.openrouter = new OpenAI({
      apiKey: this.currentKey,
      baseURL: "https://openrouter.ai/api/v1",
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        "HTTP-Referer": window.location.origin,
        "X-Title": "QYNTRA"
      }
    });
  }

  private reinitializeWithNewKey(): void {
    this.currentKey = keyRotation.getNextKey();
    this.openrouter = new OpenAI({
      apiKey: this.currentKey,
      baseURL: "https://openrouter.ai/api/v1",
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        "HTTP-Referer": window.location.origin,
        "X-Title": "QYNTRA"
      }
    });
    console.log("🔄 OpenRouter client reinitialized with new API key");
  }

  async *streamMessage(
    lastMessage: Message,
    history: Message[],
    config: ModelConfig
  ): AsyncGenerator<
    { text: string; grounding?: GroundingMetadata },
    void,
    unknown
  > {
    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        // Convert history to OpenAI format
        // Exclude the last message since it's the current user message being sent
        const historyWithoutLast = history.slice(0, -1);
        const messages = historyWithoutLast.map((msg) => ({
          role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
          content: msg.content
        }));

        // Add the current message
        messages.push({
          role: 'user' as const,
          content: lastMessage.content
        });

        const stream = await this.openrouter.chat.completions.create({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: config.systemInstruction || 'You are a helpful AI assistant.'
            },
            ...messages
          ],
          temperature: config.temperature,
          top_p: config.topP,
          stream: true,
          max_tokens: 1000  // Reduced from 4000 to stay within free tier limits
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield { text: content };
          }
        }

        // Success - exit retry loop
        return;

      } catch (error: any) {
        const errorMessage = error.message || error.toString();
        const isRateLimitError = 
          errorMessage.includes('429') || 
          errorMessage.includes('quota') || 
          errorMessage.includes('rate limit') ||
          errorMessage.includes('RESOURCE_EXHAUSTED');

        if (isRateLimitError && retryCount < MAX_RETRIES - 1) {
          console.warn(`⚠️ OpenRouter rate limit hit, rotating to next API key (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          keyRotation.markKeyFailed(this.currentKey);
          this.reinitializeWithNewKey();
          retryCount++;
          continue;
        }

        console.error("❌ OpenRouter API Error:", error);
        throw new Error(errorMessage || "Failed to generate response from OpenRouter");
      }
    }

    throw new Error("Failed to generate response after maximum retries");
  }
}

export const openRouterService = new OpenRouterService();

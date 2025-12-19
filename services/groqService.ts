import Groq from "groq-sdk";
import { Message, ModelConfig, GroundingMetadata } from "../types";
import { ApiKeyRotation } from "./apiKeyRotation";

// Initialize API key rotation
const apiKeys = process.env.GROQ_API_KEY || "";
const keyRotation = new ApiKeyRotation(apiKeys);

export class GroqService {
  private groq: Groq;
  private currentKey: string;

  constructor() {
    console.log('🔍 Groq Service Initializing...');
    console.log('🔍 GROQ_API_KEY from env:', apiKeys ? `${apiKeys.substring(0, 20)}...` : 'MISSING');
    console.log('🔍 Key rotation will use:', keyRotation.getKeyCount(), 'key(s)');
    
    if (!apiKeys) {
      console.warn("Groq API Key is missing. Please set process.env.GROQ_API_KEY");
    }
    this.currentKey = keyRotation.getNextKey();
    this.groq = new Groq({ apiKey: this.currentKey, dangerouslyAllowBrowser: true });
  }

  private reinitializeWithNewKey(): void {
    this.currentKey = keyRotation.getNextKey();
    this.groq = new Groq({ apiKey: this.currentKey, dangerouslyAllowBrowser: true });
    console.log("🔄 Groq client reinitialized with new API key");
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
        // Convert history to Groq format
        // Exclude the last message since it's the current user message being sent
        const historyWithoutLast = history.slice(0, -1);
        
        console.log('🔍 Groq Debug - Full history length:', history.length);
        console.log('🔍 Groq Debug - History without last:', historyWithoutLast.length);
        console.log('🔍 Groq Debug - Last message:', lastMessage.content.substring(0, 50));
        
        const messages = historyWithoutLast.map((msg) => ({
          role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
          content: msg.content
        }));

        // Add the current message
        messages.push({
          role: 'user' as const,
          content: lastMessage.content
        });
        
        console.log('🔍 Groq Debug - Final messages count:', messages.length);
        console.log('🔍 Groq Debug - Messages:', messages.map(m => `${m.role}: ${m.content.substring(0, 30)}...`));

        const stream = await this.groq.chat.completions.create({
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
          max_tokens: 8000
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
          console.warn(`⚠️ Groq rate limit hit, rotating to next API key (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          keyRotation.markKeyFailed(this.currentKey);
          this.reinitializeWithNewKey();
          retryCount++;
          continue;
        }

        console.error("❌ Groq API Error:", error);
        console.error("❌ Error details:", error.response?.data || errorMessage);
        throw new Error(errorMessage || "Failed to generate response from Groq");
      }
    }

    throw new Error("Failed to generate response after maximum retries");
  }
}

export const groqService = new GroqService();

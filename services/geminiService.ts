import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { Message, ModelConfig, GroundingMetadata } from "../types";
import { DEFAULT_SYSTEM_INSTRUCTION } from "../constants";
import { ApiKeyRotation } from "./apiKeyRotation";

// Initialize API key rotation
const apiKeys = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
const keyRotation = new ApiKeyRotation(apiKeys);

export class GeminiService {
  private ai: GoogleGenAI;
  private currentKey: string;
  private chat: Chat | null = null;
  private currentModel: string | null = null;
  private currentSearchEnabled: boolean = false;

  constructor() {
    if (!apiKeys) {
      console.warn("API Key is missing. Please set process.env.GEMINI_API_KEY or process.env.API_KEY");
    }
    this.currentKey = keyRotation.getNextKey();
    this.ai = new GoogleGenAI({ apiKey: this.currentKey });
  }

  private reinitializeWithNewKey(): void {
    this.currentKey = keyRotation.getNextKey();
    this.ai = new GoogleGenAI({ apiKey: this.currentKey });
    console.log("🔄 Gemini client reinitialized with new API key");
  }

  private initChat(config: ModelConfig, history: Message[]) {
    // Transform internal message format to API format
    // We filter out the *last* user message because sendMessageStream appends it automatically

    const validHistory = history.slice(0, -1).map((msg) => {
      const parts: any[] = [{ text: msg.content }];
      if (msg.attachment) {
        parts.push({
          inlineData: {
            mimeType: msg.attachment.mimeType,
            data: msg.attachment.data,
          },
        });
      }
      return {
        role: msg.role,
        parts: parts,
      };
    });

    const generationConfig: any = {
      temperature: config.temperature,
      topK: config.topK,
      topP: config.topP,
      systemInstruction: config.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
    };

    // Tools Configuration
    const tools: any[] = [];
    if (config.useSearch) {
      tools.push({ googleSearch: {} });
    }

    // Thinking Budget
    if (config.thinkingBudget > 0) {
      generationConfig.thinkingConfig = {
        thinkingBudget: config.thinkingBudget,
      };
    }

    this.chat = this.ai.chats.create({
      model: config.model,
      config: {
        ...generationConfig,
        tools: tools.length > 0 ? tools : undefined,
      },
      history: validHistory,
    });
    this.currentModel = config.model;
    this.currentSearchEnabled = config.useSearch || false;
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
        // Always re-initialize chat with current history to maintain conversation context
        // This ensures the chat instance stays in sync with the full conversation
        const searchEnabled = config.useSearch || false;
        const needsReinit =
          !this.chat ||
          this.currentModel !== config.model ||
          this.currentSearchEnabled !== searchEnabled ||
          true; // Always reinit to keep history in sync

        if (needsReinit) {
          this.initChat(config, history);
        }

        if (!this.chat) throw new Error("Chat initialization failed");

        const parts: any[] = [{ text: lastMessage.content }];

        if (lastMessage.attachment) {
          parts.push({
            inlineData: {
              mimeType: lastMessage.attachment.mimeType,
              data: lastMessage.attachment.data,
            },
          });
        }

        const messagePayload = parts.length === 1 ? parts[0].text : parts;

        const resultStream = await this.chat.sendMessageStream({
          message: messagePayload,
        });

        for await (const chunk of resultStream) {
          const responseChunk = chunk as GenerateContentResponse;

          let output: { text: string; grounding?: GroundingMetadata } = {
            text: "",
          };

          if (responseChunk.text) {
            output.text = responseChunk.text;
          }

          // Extract Grounding Metadata if available
          if (responseChunk.candidates?.[0]?.groundingMetadata) {
            output.grounding = responseChunk.candidates[0]
              .groundingMetadata as GroundingMetadata;
          }

          yield output;
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
          console.warn(`⚠️ Gemini rate limit hit, rotating to next API key (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          keyRotation.markKeyFailed(this.currentKey);
          this.reinitializeWithNewKey();
          retryCount++;
          continue;
        }

        console.error("❌ Gemini API Error:", error);
        throw new Error(errorMessage || "Failed to generate response from Gemini");
      }
    }

    throw new Error("Failed to generate response after maximum retries");
  }
}

export const geminiService = new GeminiService();

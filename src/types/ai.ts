export type AIProviderType = 'gemini' | 'openai' | 'local';

export interface AICallOptions {
  temperature?: number;
  maxTokens?: number;
  forceCloud?: boolean;
}

export interface GeminiContentPart {
  text: string;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

export interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: GeminiContentPart[];
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  text?: string;
  error?: {
    message?: string;
    code?: number;
  };
}

export interface OpenAIRequestBody {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIResponse {
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
  response?: string;
  text?: string;
  error?: {
    message?: string;
  };
}

export interface ChromeLanguageModelCapabilities {
  available: 'readily' | 'after-download' | 'no';
  defaultTemperature?: number;
  maxTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface ChromeLanguageModelSession {
  prompt(input: string): Promise<string>;
  promptStreaming?(input: string): AsyncIterable<string>;
  destroy?(): void;
}

export interface ChromeLanguageModelFactory {
  capabilities(): Promise<ChromeLanguageModelCapabilities>;
  create(options?: Record<string, unknown>): Promise<ChromeLanguageModelSession>;
  params?(): Promise<Record<string, unknown>>;
}

declare global {
  interface Window {
    ai?: {
      languageModel?: ChromeLanguageModelFactory;
    };
  }
}

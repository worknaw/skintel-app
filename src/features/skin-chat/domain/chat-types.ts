export type ChatRole = 'user' | 'model';

export type ChatMessage = Readonly<{
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  isError?: boolean;
}>;

export type GeminiModelConfig = Readonly<{
  primaryModel: string;
  fallbackModel: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
}>;


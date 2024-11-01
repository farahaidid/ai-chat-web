export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  query: string;
  contextSize?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
}
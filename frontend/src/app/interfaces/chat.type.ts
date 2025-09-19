export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isVirtual?: boolean;

}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

export interface Config {
  apiUrl: string;
  apiKey: string;
  model: string;
  initialSystemPrompt: string;
}

export interface ChatStreamChunk {
  content: string;
  isComplete: boolean;
}
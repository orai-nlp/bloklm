export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isVirtual?: boolean;

}

export interface Chat {
  title: string;
  messages: Message[];
}

export interface ChatStreamChunk {
  content: string;
  isComplete: boolean;
}
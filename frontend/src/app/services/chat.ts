import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
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

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly STORAGE_KEYS = {
    CHAT_HISTORY: 'chatHistory',
    THEME: 'theme'
  };

  // Configuration
  private config: Config = {
    apiUrl: 'http://localhost:1234/v1/chat/completions',
    apiKey: 'not-needed',
    model: 'local-model',
    initialSystemPrompt: 'You are a helpful assistant. Make a breif summary of the provided content.'
  };

  // State subjects
  private chatHistorySubject = new BehaviorSubject<Chat[]>([]);
  private currentChatSubject = new BehaviorSubject<Chat | null>(null);
  private isGeneratingSubject = new BehaviorSubject<boolean>(false);
  private themeSubject = new BehaviorSubject<string>('light');

  // Observables
  public chatHistory$ = this.chatHistorySubject.asObservable();
  public currentChat$ = this.currentChatSubject.asObservable();
  public isGenerating$ = this.isGeneratingSubject.asObservable();
  public theme$ = this.themeSubject.asObservable();

  constructor() {
    this.loadSettings();
    this.loadChatHistory();
  }

  // Configuration methods
  getConfig(): Config {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<Config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Settings management
  private loadSettings(): void {
    try {
      const savedTheme = localStorage.getItem(this.STORAGE_KEYS.THEME);
      if (savedTheme) {
        this.themeSubject.next(savedTheme);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setTheme(theme: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.THEME, theme);
      this.themeSubject.next(theme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }

  // Chat history management
  private loadChatHistory(): void {
    try {
      const savedHistory = localStorage.getItem(this.STORAGE_KEYS.CHAT_HISTORY);
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        this.chatHistorySubject.next(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  private saveChatHistory(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.CHAT_HISTORY, 
        JSON.stringify(this.chatHistorySubject.value)
      );
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  createNewChat(): Chat {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{
        role: 'system',
        content: this.config.initialSystemPrompt
      }]
    };

    const currentHistory = this.chatHistorySubject.value;
    const updatedHistory = [newChat, ...currentHistory];
    
    this.chatHistorySubject.next(updatedHistory);
    this.currentChatSubject.next(newChat);
    this.saveChatHistory();

    return newChat;
  }

  loadChat(chatId: string): Chat | null {
    const chat = this.chatHistorySubject.value.find(c => c.id === chatId);
    if (chat) {
      this.currentChatSubject.next({ ...chat });
      return { ...chat };
    }
    return null;
  }

  addMessageToCurrentChat(message: Message): void {
    const currentChat = this.currentChatSubject.value;
    if (!currentChat) return;

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, message]
    };

    // Update current chat
    this.currentChatSubject.next(updatedChat);

    // Update in history
    const currentHistory = this.chatHistorySubject.value;
    const chatIndex = currentHistory.findIndex(c => c.id === currentChat.id);
    if (chatIndex !== -1) {
      currentHistory[chatIndex] = updatedChat;
      this.chatHistorySubject.next([...currentHistory]);
      this.saveChatHistory();
    }
  }

  updateLastMessageInCurrentChat(content: string): void {
    const currentChat = this.currentChatSubject.value;
    if (!currentChat || currentChat.messages.length === 0) return;

    const updatedMessages = [...currentChat.messages];
    updatedMessages[updatedMessages.length - 1] = {
      ...updatedMessages[updatedMessages.length - 1],
      content
    };

    const updatedChat = {
      ...currentChat,
      messages: updatedMessages
    };

    this.currentChatSubject.next(updatedChat);

    // Update in history
    const currentHistory = this.chatHistorySubject.value;
    const chatIndex = currentHistory.findIndex(c => c.id === currentChat.id);
    if (chatIndex !== -1) {
      currentHistory[chatIndex] = updatedChat;
      this.chatHistorySubject.next([...currentHistory]);
      this.saveChatHistory();
    }
  }

  updateChatTitle(chatId: string, title: string): void {
    const currentHistory = this.chatHistorySubject.value;
    const chatIndex = currentHistory.findIndex(c => c.id === chatId);
    
    if (chatIndex !== -1) {
      currentHistory[chatIndex] = {
        ...currentHistory[chatIndex],
        title
      };
      
      this.chatHistorySubject.next([...currentHistory]);
      
      // Update current chat if it's the same
      const currentChat = this.currentChatSubject.value;
      if (currentChat && currentChat.id === chatId) {
        this.currentChatSubject.next({
          ...currentChat,
          title
        });
      }
      
      this.saveChatHistory();
    }
  }

  // API communication
  async sendMessage(userMessage: string): Promise<Observable<ChatStreamChunk>> {
    const currentChat = this.currentChatSubject.value;
    if (!currentChat) {
      throw new Error('No active chat');
    }

    this.isGeneratingSubject.next(true);

    // Add user message
    this.addMessageToCurrentChat({
      role: 'user',
      content: userMessage
    });

    // Update chat title if it's still "New Chat"
    if (currentChat.title === 'New Chat') {
      const title = userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '');
      this.updateChatTitle(currentChat.id, title);
    }

    // Add placeholder for AI response
    this.addMessageToCurrentChat({
      role: 'assistant',
      content: ''
    });

    const streamSubject = new Subject<ChatStreamChunk>();

    try {
      const updatedChat = this.currentChatSubject.value;
      if (!updatedChat) throw new Error('Chat not found');

      const requestBody = {
        model: this.config.model,
        messages: updatedChat.messages,
        stream: true,
        temperature: 0.7
      };

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      this.processStream(response, streamSubject);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the last message with error
      this.updateLastMessageInCurrentChat(
        'Sorry, there was an error communicating with the API. Please check your connection and API settings.'
      );
      
      streamSubject.next({ 
        content: 'Sorry, there was an error communicating with the API. Please check your connection and API settings.',
        isComplete: true 
      });
      streamSubject.complete();
      
      this.isGeneratingSubject.next(false);
    }

    return streamSubject.asObservable();
  }

  private async processStream(response: Response, streamSubject: Subject<ChatStreamChunk>): Promise<void> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let lastJSONEnd = 0;

        while (buffer.indexOf('\n', lastJSONEnd) !== -1) {
          const lineEnd = buffer.indexOf('\n', lastJSONEnd);
          const line = buffer.substring(lastJSONEnd, lineEnd).trim();
          lastJSONEnd = lineEnd + 1;

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);

            if (jsonStr === '[DONE]') continue;

            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices?.[0]?.delta?.content || '';
              
              if (content) {
                fullResponse += content;
                
                // Update the current chat
                this.updateLastMessageInCurrentChat(fullResponse);
                
                // Emit the chunk
                streamSubject.next({
                  content: fullResponse,
                  isComplete: false
                });
              }
            } catch (e) {
              console.error('Error parsing JSON from stream:', e);
            }
          }
        }

        buffer = buffer.substring(lastJSONEnd);
      }

      // Mark as complete
      streamSubject.next({
        content: fullResponse,
        isComplete: true
      });
      streamSubject.complete();

    } catch (error) {
      console.error('Stream processing error:', error);
      streamSubject.error(error);
    } finally {
      this.isGeneratingSubject.next(false);
    }
  }

  // Utility methods
  clearAllData(): void {
    try {
      localStorage.clear();
      this.chatHistorySubject.next([]);
      this.currentChatSubject.next(null);
      this.themeSubject.next('light');
      this.isGeneratingSubject.next(false);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      throw error;
    }
  }

  formatMarkdown(text: string): string {
    // Handle code blocks
    text = text.replace(/```(\w*)([\s\S]*?)```/g, (match, language, code) => {
      return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle bold text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Getters for current state
  getCurrentChat(): Chat | null {
    return this.currentChatSubject.value;
  }

  getChatHistory(): Chat[] {
    return this.chatHistorySubject.value;
  }

  getCurrentTheme(): string {
    return this.themeSubject.value;
  }

  isCurrentlyGenerating(): boolean {
    return this.isGeneratingSubject.value;
  }
}
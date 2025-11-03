import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { Chat, ChatStreamChunk, Message } from '../interfaces/chat.type';
import { NotebookService } from './notebook';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpResponse } from "@angular/common/http"
import { I18nService } from './i18n';
import { SourceService } from './source';


@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // State subjects
  private currentChatSubject = new BehaviorSubject<Chat | null>(null);
  private isGeneratingSubject = new BehaviorSubject<boolean>(false);
  private themeSubject = new BehaviorSubject<string>('light');

  // Observables
  public currentChat$ = this.currentChatSubject.asObservable();
  public isGenerating$ = this.isGeneratingSubject.asObservable();
  public theme$ = this.themeSubject.asObservable();

  // Extra
  private currentNtId;
  route = inject(ActivatedRoute)
  sourcService = inject(SourceService);
  i18n = inject(I18nService)

  // Track citations in current message
  private citationMap: Map<string, number> = new Map();

  constructor(private notebookService: NotebookService, private http: HttpClient) {

    this.currentNtId = this.route.snapshot.paramMap.get('id') || null
  }


  loadChat(id: string): void {

    this.call_backend('get_chat', 'GET', {nt_id: id}, undefined).subscribe({
      next: (chat) => {
        const newChat = this.convertChatElement(chat);
        this.currentChatSubject.next(newChat);
        console.log('Chat loaded from backend: ', newChat);
      },
      error: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error loading chat:', errorMessage);
        // You can either throw the error or handle it gracefully
        throw new Error(`Chat did not load from backend: ${errorMessage}`);
      }
    });
    
  }

  convertChatElement(chat: any): Chat{
    try {
      const chatContent = chat.chat_history
      return {
        id: chat.chat_id,
        title: 'New Chat',
        messages: chatContent
      } as Chat;
    } catch (error) {
      throw new Error("Could not convert provided content to Chat", { cause: error });
    }
  }

  async createNewChat(notebookId: string): Promise<void> {
    try {

      const newChat: Chat = {
        title: 'New Chat',
        messages: []
      };
      console.log('Chat created!');

      this.currentChatSubject.next(newChat);

    } catch (error) {
      // Handle both network errors and backend exceptions
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error creating chat:', errorMessage);
      throw new Error(errorMessage);
    }
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
  }

  updateChatTitle(title: string): void {

    // Update current chat if it's the same
    const currentChat = this.currentChatSubject.value;
    if (currentChat) {
      this.currentChatSubject.next({
        ...currentChat,
        title
      });
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
      this.updateChatTitle(title);
    }

    // Add placeholder for AI response
    this.addMessageToCurrentChat({
      role: 'assistant',
      content: ''
    });

    const nb = this.notebookService.getCurrentNotebook();
    const streamSubject = new Subject<ChatStreamChunk>();
    
    try {
      const updatedChat = this.currentChatSubject.value;
      if (!updatedChat) throw new Error('Chat not found');

      // Use fetch for streaming
      const response = await fetch(`${environment.apiBaseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userMessage,
          collection: nb ? nb.id : ''
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Process the stream
      this.processStream(response, streamSubject);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the last message with error
      this.updateLastMessageInCurrentChat(
        this.i18n.translate('chat_api_error')
      );
      
      streamSubject.next({ 
        content: this.i18n.translate('chat_api_error'),
        isComplete: true 
      });
      streamSubject.complete();
      
      this.isGeneratingSubject.next(false);
    }

    return streamSubject.asObservable();
  }

  // Updated processStream to work with fetch Response
  private async processStream(
    response: Response, 
    streamSubject: Subject<ChatStreamChunk>
  ): Promise<void> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let fullResponse = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Debug: log raw buffer content
        console.log('Raw buffer chunk:', buffer);
        
        let lastJSONEnd = 0;
        
        while (buffer.indexOf('\n', lastJSONEnd) !== -1) {
          const lineEnd = buffer.indexOf('\n', lastJSONEnd);
          const line = buffer.substring(lastJSONEnd, lineEnd).trim();
          lastJSONEnd = lineEnd + 1;
          
          // Debug: log each line
          console.log('Processing line:', line);
          
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            
            // Debug: log the JSON string we're trying to parse
            console.log('JSON string to parse:', jsonStr);
            
            if (jsonStr === '[DONE]') {
              console.log('Received [DONE] signal');
              // Mark as complete
              streamSubject.next({
                content: fullResponse,
                isComplete: true
              });
              streamSubject.complete();
              continue;
            }
            
            // Skip empty data lines
            if (!jsonStr || jsonStr.trim() === '') {
              continue;
            }
            
            try {
              const json = JSON.parse(jsonStr);
              console.log('Parsed JSON:', json);
              
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
              console.error('Failed to parse:', jsonStr);
              console.error('Full line was:', line);
              // Continue processing other lines instead of failing completely
            }
          }
        }
        buffer = buffer.substring(lastJSONEnd);
      }
      
      // If stream ended without [DONE] signal
      if (!streamSubject.closed) {
        streamSubject.next({
          content: fullResponse,
          isComplete: true
        });
        streamSubject.complete();
      }
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
      this.resetCitationMap()
      this.currentChatSubject.next({title: this.currentChatSubject.value?.title || '', messages: []});
      this.isGeneratingSubject.next(false);

      this.call_backend('delete_chat', 'GET', {nt_id: this.notebookService.getCurrentId() || ''}, undefined).subscribe(()=>{
        console.log('Chat deleted in backend!');
      })
    } catch (error) {
      console.error('Error clearing chat:', error);
      throw error;
    }
  }

  formatMarkdown(text: string): string {
    // Handle undefined, null, or empty string
    if (!text) {
      return '';
    }
    
    // Process citations first
    const { processed: textWithCitations } = this.processCitations(text);
    let text_work = textWithCitations;
    
    // Handle code blocks
    text_work = text_work.replace(/```(\w*)([\s\S]*?)```/g, (match, language, code) => {
      return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Handle inline code
    text_work = text_work.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle bold text
    text_work = text_work.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    text_work = text_work.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle line breaks
    text_work = text_work.replace(/\n/g, '<br>');
    
    return text_work;
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

  getCurrentTheme(): string {
    return this.themeSubject.value;
  }

  isCurrentlyGenerating(): boolean {
    return this.isGeneratingSubject.value;
  }

  onCitationClicked(chunkId: string): void {
    console.log('Citation clicked! Chunk ID:', chunkId);
    this.call_backend("chunk", 'GET', {id: chunkId}, undefined).subscribe({
      next: (res:any) => {
        this.sourcService.openFromChunk(res.file_id, res.file_text, res.offset, res.text)
      },
      error: (err) => {
        console.error('chunk error', err);
      }
    }
    )
  }

  private processCitations(text: string): { processed: string; citations: Map<string, number> } {
    // Match both patterns: [SID: 123] or Source ID: 123
    const citationRegex = /\[SID: ?(\d+)\]|Source ?ID: ?(\d+)/g;
    let citationCounter = 1;
    const localCitationMap = new Map<string, number>();

    const processed = text.replace(citationRegex, (match, sid1, sid2) => {
      const chunkId = sid1 || sid2; // whichever matched
      if (!localCitationMap.has(chunkId)) {
        localCitationMap.set(chunkId, citationCounter);
        citationCounter++;
      }
      const citationNumber = localCitationMap.get(chunkId)!;

      return `<button type="button" class="citation" data-chunk-id="${chunkId}" data-citation-number="${citationNumber}">${citationNumber}</button>`;
    });

    return { processed, citations: localCitationMap };
  }

  private resetCitationMap(): void {
    this.citationMap.clear();
  }



  private call_backend(
        id: string,
        method: 'GET' | 'POST',
        args_get?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
        args_post?: Record<string, string | number | boolean | readonly (string | number | boolean)[] | FormDataEntryValue | null> | FormData
    ): Observable<any> 
    {

    const url = `${environment.apiBaseUrl}/${id}`;


    switch (method) {
      case 'GET':
        return this.http.get(url, { params: args_get });
      case 'POST':
        return this.http.post(url, args_post);
      default:
        // This line will never be reached if you only call with 'GET' | 'POST',
        // but it satisfies the compiler.
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
  
}
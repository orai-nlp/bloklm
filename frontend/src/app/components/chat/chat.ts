import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, AfterContentInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest, filter } from 'rxjs';
import { Chat, Message } from '../../interfaces/chat.type';
import { ChatService } from '../../services/chat';
import { ActivatedRoute } from '@angular/router';
import { NotebookService } from '../../services/notebook';
import { I18nService } from '../../services/i18n';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';


@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',

})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('userInput') userInput!: ElementRef;

  route = inject(ActivatedRoute);
  notebookService = inject(NotebookService);
  i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  // UI State
  userInputValue: string = '';
  showWelcomeScreen: boolean = true;
  showTypingIndicator: boolean = false;
  showConfirmationModal: boolean = false;

  // Service data
  currentChat: Chat | null = null;
  currentTheme: string = 'light';
  isGenerating: boolean = false;
  isLoading: boolean = true;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom: boolean = false;
  placeholder_input:string = this.i18n.translate('chat_input_placeholder') + '...'

  constructor(private chatService: ChatService, private snackBar: MatSnackBar, private sanitizer: DomSanitizer ) {}

  async ngOnInit() {
    this.subscribeToServiceData();
    
    // Get the notebook ID from the route
    const notebookId = this.route.snapshot.paramMap.get('id');
    
    if (notebookId) {
      try {
        // Wait for notebook service to be ready
        await this.notebookService.whenReady();
        
        // Load notebook data first
        const notebook = this.notebookService.getCurrentNotebook();
        
        if (notebook) {
          // Create or load the chat for this notebook
          await this.loadOrCreateChat(notebookId);
        }
      } catch (error) {
        console.error('Error loading notebook/chat data:', error);
      } finally {
        this.isLoading = false;
        this.updateWelcomeScreen();
        this.cdr.detectChanges();
      }
    } else {
      this.isLoading = false;
      this.updateWelcomeScreen();
    }
  }

  private async loadOrCreateChat(notebookId: string) {
    try {
      // First try to load existing chat
      await new Promise<void>((resolve, reject) => {
        this.chatService.loadChat(notebookId);

        // Wait for the chat to be loaded
        const subscription = this.chatService.currentChat$
          .pipe(
            filter(chat => chat !== null),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (chat) => {
              subscription.unsubscribe();
              resolve();
            },
            error: (error) => {
              subscription.unsubscribe();
              reject(error);
            }
          });
        
        // Add timeout in case loading fails
        setTimeout(() => {
          subscription.unsubscribe();
          reject(new Error('Chat loading timeout'));
        }, 5000);
      });
    } catch (error) {
      console.log('No existing chat found, creating new one');
      // If loading fails, create a new chat
      try {
        await this.chatService.createNewChat(notebookId);
      } catch (createError) {
        console.error('Error creating new chat:', createError);
      }
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 0);
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToServiceData() {
    // Subscribe to current chat with proper change detection
    this.chatService.currentChat$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chat => {
        this.currentChat = chat;
        this.updateWelcomeScreen();
        // Force change detection
        this.cdr.detectChanges();
        this.forceScrollToBottom();
      });

    // Subscribe to generation status
    this.chatService.isGenerating$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isGenerating => {
        this.isGenerating = isGenerating;
        this.showTypingIndicator = isGenerating;
        this.cdr.detectChanges();
      });
  }

  private updateWelcomeScreen() {
    // Hide welcome screen once we have data
    this.showWelcomeScreen = !this.currentChat && !this.isLoading;
  }

  onCitationClick(event: Event): void {
    const target = event.target as HTMLElement;
  
    if (target.classList.contains('citation')) {
      const chunkId = target.getAttribute('data-chunk-id');

      if (chunkId) {
        this.chatService.onCitationClicked(chunkId);
      }
    }
  }

  formatMarkdownWithSafeHtml(content: string): SafeHtml {
    const formatted = this.chatService.formatMarkdown(content);
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }


  // Message Management
  getDisplayMessages(): Message[] {
    if (!this.currentChat || !this.currentChat.messages) return [];
    
    const regularMessages = this.currentChat.messages.filter(msg => msg.role !== 'system');
    
    // Check if we're in a notebook context and have sources
    const notebook = this.notebookService.getCurrentNotebook();
    const hasNotebookSummary = notebook && notebook.summary;
    
    if (hasNotebookSummary && regularMessages.length === 0) {
      // Create a virtual summary message as the first message only if no other messages exist
      const summaryMessage: Message = {
        role: 'assistant',
        content: 'summary',
        isVirtual: true
      };
      
      return [summaryMessage];
    } else if (hasNotebookSummary) {
      // If there are regular messages, show summary first then messages
      const summaryMessage: Message = {
        role: 'assistant',
        content: 'summary',
        isVirtual: true
      };
      
      return [summaryMessage, ...regularMessages];
    }
    
    return regularMessages;
  }

  async sendMessage() {
    const userMessage = this.userInputValue.trim();
    if (userMessage === '' || this.isGenerating) return;

    // Clear input
    this.userInputValue = '';
    this.autoResizeTextarea();
    this.shouldScrollToBottom = true;

    try {
      const streamObservable = await this.chatService.sendMessage(userMessage);
      
      streamObservable
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (chunk) => {
            this.cdr.detectChanges();
            setTimeout(() => {
              this.shouldScrollToBottom = true;
            }, 0);
          },
          error: (error) => {
            console.error('Stream error:', error);
          },
          complete: () => {
            this.focusInput();
            // Final scroll after completion
            setTimeout(() => {
              this.cdr.detectChanges();
              this.shouldScrollToBottom = true;
            }, 100);
          }
        });

    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  // UI Utilities
  focusInput() {
    setTimeout(() => {
      if (this.userInput?.nativeElement) {
        this.userInput.nativeElement.focus();
      }
    }, 100);
  }

  scrollToBottom() {
    if (this.chatContainer?.nativeElement) {
      const element = this.chatContainer.nativeElement;
      // Use scrollTo for smoother behavior
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  private forceScrollToBottom() {
    // Multiple attempts to ensure scroll works
    const scroll = () => {
      if (this.chatContainer?.nativeElement) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    };
    
    // Immediate scroll
    scroll();
    
    // Retry after short delay
    setTimeout(scroll, 0);
    setTimeout(scroll, 50);
    setTimeout(scroll, 100);
  }

  autoResizeTextarea() {
    const textarea = document.querySelector('.input-container textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.overflowY = 'hidden'; // reset overflow
      textarea.style.height = textarea.scrollHeight + 'px';

      // If content exceeds max height, show scrollbar
      if (textarea.scrollHeight > 250) {
        textarea.style.overflowY = 'auto';
      }
    }
  }

  onInputChange() {
    this.autoResizeTextarea();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Modal Management
  showConfirmModal() {
    this.showConfirmationModal = true;
  }

  hideConfirmModal() {
    this.showConfirmationModal = false;
  }

  clearAllData() {
    try {
      this.chatService.clearAllData();
      this.hideConfirmModal();
      
      // Show success message
      if (this.currentChat) {
        this.snackBar.open(this.i18n.translate('chat_clear_noti'), '', {
          duration: 2000, // disappears after 2 seconds
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      }
      
    } catch (error) {
      console.error('Error clearing data:', error);
      if (this.currentChat) {
        this.chatService.addMessageToCurrentChat({
          role: 'assistant',
          content: 'There was an error clearing your data. Please try again.'
        });
      }
    }
  }

  // Template Helper Methods
  get canSend(): boolean {
    return this.userInputValue.trim() !== '' && !this.isGenerating;
  }

  get themeOptions() {
    return [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'night-blue', label: 'Night Blue' },
      { value: 'sepia', label: 'Sepia' }
    ];
  }

  // Formatting (delegated to service)
  formatMarkdown(text: string): string {
    return this.chatService.formatMarkdown(text);
  }
}
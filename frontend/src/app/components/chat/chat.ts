import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, AfterContentInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Chat, Message } from '../../interfaces/chat.type';
import { ChatService } from '../../services/chat';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss'
})
export class ChatComponent implements OnInit, AfterViewChecked, AfterContentInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('userInput') userInput!: ElementRef;

  route = inject(ActivatedRoute)


  // UI State
  userInputValue: string = '';
  showWelcomeScreen: boolean = true;
  showTypingIndicator: boolean = false;
  showConfirmationModal: boolean = false;

  // Service data
  currentChat: Chat | null = null;
  currentTheme: string = 'light';
  isGenerating: boolean = false;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom: boolean = false;

  constructor(private chatService: ChatService) {}

  ngAfterContentInit(){
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { return; }
    this.chatService.loadChat(id)
  }
  ngOnInit() {
    this.subscribeToServiceData();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToServiceData() {
    // Subscribe to current chat
    this.chatService.currentChat$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chat => {
        this.currentChat = chat;
        this.updateWelcomeScreen();
        this.shouldScrollToBottom = true;
      });

    // Subscribe to theme changes
    this.chatService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
        this.applyTheme(theme);
      });

    // Subscribe to generation status
    this.chatService.isGenerating$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isGenerating => {
        this.isGenerating = isGenerating;
        this.showTypingIndicator = isGenerating;
      });
  }

  private updateWelcomeScreen() {
    this.showWelcomeScreen = !this.currentChat || 
      this.currentChat.messages.filter(m => m.role !== 'system').length === 0;
  }

  // Theme Management
  applyTheme(themeName: string) {
    document.body.setAttribute('data-theme', themeName);
  }

  onThemeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.chatService.setTheme(target.value);
  }

  // loadChat(chatId: string) {
  //   this.chatService.loadChat(chatId);
  //   this.focusInput();
  // }

  // Message Management
  getDisplayMessages(): Message[] {
    if (!this.currentChat) return [];
    return this.currentChat.messages.filter(msg => msg.role !== 'system');
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
            this.shouldScrollToBottom = true;
            // The service handles updating the messages
          },
          error: (error) => {
            console.error('Stream error:', error);
          },
          complete: () => {
            this.focusInput();
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
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }

  autoResizeTextarea() {
    if (this.userInput?.nativeElement) {
      const textarea = this.userInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
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
      // this.createNewChat();
      this.hideConfirmModal();
      
      // Show success message
      if (this.currentChat) {
        this.chatService.addMessageToCurrentChat({
          role: 'assistant',
          content: 'All chat history and settings have been cleared successfully.'
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
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { I18nService } from '../../services/i18n';
import { marked, Tokens } from 'marked';
import DOMPurify from 'dompurify';
import { Source } from '../../interfaces/source.type';
import { SourceService } from '../../services/source';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-modal',
  imports: [CommonModule],
  templateUrl: './file-modal.html',
  styleUrl: './file-modal.scss'
})
export class FileModalComponent implements OnInit, OnDestroy  {
  modalService = inject(SourceService);
  i18n = inject(I18nService);
  cdr = inject(ChangeDetectorRef)
  
  source: Source | undefined = undefined;
  isVisible = false;
  renderedContent: string = '';
  
  private destroy$ = new Subject<void>();

  constructor() {
    // Configure marked options for better markdown rendering
    marked.setOptions({
      gfm: true,           // GitHub Flavored Markdown
      breaks: false         // Convert \n to <br>
    });

    // Custom renderer to preserve whitespace in code blocks
    const renderer = new marked.Renderer();
    
    renderer.code = ({ text, lang }: Tokens.Code): string => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${this.escapeHtml(text)}</code></pre>`;
    };

    renderer.codespan = ({ text }: Tokens.Codespan): string => {
      return `<code>${this.escapeHtml(text)}</code>`;
    };

    marked.use({ renderer });
  }

  ngOnInit() {
    this.modalService.source$
      .pipe(takeUntil(this.destroy$))
      .subscribe(source => {
        this.source = source;
        this.isVisible = !!source;
        
        if (source) {
          this.prepareContent(source);
        }
        this.cdr.detectChanges();
      });
  }

  prepareContent(source: Source) {
    console.log('Source modal', source)
    let text = this.modalService.text || ''
    console.log('Source modal', text)

    // If in chunk mode, highlight the chunk text
    if (this.modalService.isChunkMode && this.modalService.chunk_text && this.modalService.offset !== undefined) {
      const offset = this.modalService.offset;
      const chunkLength = this.modalService.chunk_text.length;
      
      // Insert highlight markers
      const before = text.substring(0, offset);
      const highlighted = text.substring(offset, offset + chunkLength);
      const after = text.substring(offset + chunkLength);
      
      const markedLines = highlighted
        .split('\n')
        .map(line => `<mark class="highlight-chunk">${line}</mark>`)
        .join('\n');

      text = before + markedLines + after;
    }

    // Render markdown with marked and sanitize with DOMPurify
    const rawHtml = marked.parse(text) as string;
    this.renderedContent = DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target', 'class'],
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's', 'del',
        'ul', 'ol', 'li',
        'a', 'img',
        'pre', 'code',
        'blockquote',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr',
        'mark'  // Add this
      ]
    });

    // Scroll to highlighted content after render
    if (this.modalService.isChunkMode) {
      setTimeout(() => {
        const highlighted = document.querySelector('.highlight-chunk');
        if (highlighted) {
          highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }

  /**
   * Escape HTML entities for code blocks
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  close() {
    this.modalService.close();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  ngOnDestroy() {    
    this.destroy$.next();
    this.destroy$.complete();
  }
}

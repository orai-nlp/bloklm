import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Note } from '../../interfaces/note.type';
import { Subject, takeUntil } from 'rxjs';
import { I18nService } from '../../services/i18n';
import { NoteService } from '../../services/note';
import cytoscape from 'cytoscape';
import { marked, Tokens } from 'marked';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-note-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-modal.html',
  styleUrl: './note-modal.scss'
})
export class NoteModalComponent implements OnInit, OnDestroy {
  modalService = inject(NoteService);
  i18n = inject(I18nService);
  
  note: Note | null = null;
  isVisible = false;
  renderedContent: string = '';
  isMindmap = false;
  
  private destroy$ = new Subject<void>();
  private cy: any = null; // Cytoscape instance

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
    this.modalService.note$
      .pipe(takeUntil(this.destroy$))
      .subscribe(note => {
        this.note = note;
        this.isVisible = !!note;
        
        if (note) {
          this.prepareContent(note);
        }
      });
  }

  prepareContent(note: Note) {
    this.isMindmap = note.type.toLowerCase() === 'mindmap';
    
    if (this.isMindmap) {
      // Parse and render mindmap with Cytoscape
      setTimeout(() => this.renderMindmap(note.content), 0);
    } else {
      // Render markdown with marked and sanitize with DOMPurify
      const rawHtml = marked.parse(note.content || '') as string;
      this.renderedContent = DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target'],
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 's', 'del',
          'ul', 'ol', 'li',
          'a', 'img',
          'pre', 'code',
          'blockquote',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr'
        ]
      });
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

  renderMindmap(content: string) {
    const container = document.getElementById('mindmap-container');
    if (!container) return;

    try {
      const data = JSON.parse(content);
      
      // Clear container and destroy previous instance
      if (this.cy) {
        this.cy.destroy();
      }
      container.innerHTML = '';
      
      // Transform data to Cytoscape format
      const elements = [
        // Nodes
        ...data.nodes.map((node: any) => ({
          data: { 
            id: node.id, 
            label: node.label 
          }
        })),
        // Edges
        ...data.edges.map((edge: any) => ({
          data: { 
            source: edge.source, 
            target: edge.target,
            label: edge.relation || ''
          }
        }))
      ];
      
      // Initialize Cytoscape
      this.cy = cytoscape({
        container: container,
        elements: elements,
        
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#ffffff',
              'border-color': '#1a73e8',
              'border-width': 2,
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#202124',
              'font-size': '12px',
              'font-weight': 500,
              'width': 60,
              'height': 60,
              'text-wrap': 'wrap',
              'text-max-width': '50px'
            }
          },
          {
            selector: 'node[id = "1"]', // Center node (first node)
            style: {
              'background-color': '#1a73e8',
              'color': '#ffffff',
              'width': 80,
              'height': 80,
              'font-size': '14px'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#dadce0',
              'target-arrow-color': '#dadce0',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '10px',
              'color': '#5f6368',
              'text-background-color': '#f8f9fa',
              'text-background-opacity': 1,
              'text-background-padding': '3px'
            }
          }
        ],
        
        layout: {
          name: 'cose',
          idealEdgeLength: 150,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: 400000,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        },
        
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false
      });

      // Optional: Add interactivity
      this.cy.on('tap', 'node', (event: any) => {
        const node = event.target;
        console.log('Node clicked:', node.data('label'));
      });

    } catch (error) {
      console.error('Error rendering mindmap:', error);
      container.innerHTML = '<p style="color: red; padding: 20px;">Error rendering mindmap</p>';
    }
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
    // Clean up Cytoscape instance
    if (this.cy) {
      this.cy.destroy();
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
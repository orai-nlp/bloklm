import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Note } from '../../interfaces/note.type';
import { Subject, takeUntil } from 'rxjs';
import { I18nService } from '../../services/i18n';
import { NoteService } from '../../services/note';
import cytoscape from 'cytoscape';

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
      // Render markdown
      this.renderedContent = this.parseMarkdown(note.content);
    }
  }

  parseMarkdown(markdown: string): string {
    if (!markdown) return '';
    
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Wrap in paragraphs if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<ul')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
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
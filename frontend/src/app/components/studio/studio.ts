import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n';
import { NotebookService } from '../../services/notebook';
import { NoteService } from '../../services/note';
import { NoteParameters, NoteTemplate, Note } from '../../interfaces/note.type';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-studio',
  imports: [CommonModule],
  templateUrl: './studio.html',
  styleUrl: './studio.scss'
})
export class StudioComponent implements OnDestroy {
  // Services 
  i18n = inject(I18nService);
  notebookService = inject(NotebookService);
  noteService = inject(NoteService);
  cdr = inject(ChangeDetectorRef)

  // Data
  currentNotes: Note[] = []
  

  // Note types
  noteTemplates: NoteTemplate[] = [
    { 
      icon: 'school', 
      labelKey: 'outline',
      parameters: ['detail', 'language'],
      color: '#F5AD8F' // soft coral
    },
    { 
      icon: 'description', 
      labelKey: 'summary',
      parameters: ['formality', 'style', 'detail', 'language_complexity', 'language'],
      color: '#A1B6CD' // cool steel blue
    },
    { 
      icon: 'help', 
      labelKey: 'FAQ',
      parameters: ['detail', 'language_complexity', 'language'],
      color: '#F2EED5' // light sand
    },
    { 
      icon: 'timeline', 
      labelKey: 'timeline',
      parameters: ['detail', 'language'],
      color: '#DFB9DF' // soft lavender
    },
    { 
      icon: 'menu_book', 
      labelKey: 'glossary',
      parameters: ['detail', 'language_complexity', 'language'],
      color: '#ECACB7' // rose pink
    },
    { 
      icon: 'device_hub', 
      labelKey: 'mindmap',
      parameters: ['detail', 'language'],
      color: '#ADF3E6' // mint aqua
    },
    { 
      icon: 'mic', 
      labelKey: 'podcast',
      parameters: ['formality', 'style', 'detail', 'language_complexity', 'podcast_type', 'voice_type', 'language'],
      color: '#ADF3E6' // mint aqua
    }
  ];

  // Menu state
  selectedTemplate: NoteTemplate | null = null;
  selectedParameters: NoteParameters = {};

  // Available options for each parameter
  formalityOptions = [
    { value: 'low', label: 'studio_conf_opt_formal' },
    { value: 'medium', label: 'studio_conf_opt_neutro' },
    { value: 'high', label: 'studio_conf_opt_informal' }
  ];

  styleOptions = [
    { value: 'academic', label: 'studio_conf_opt_academic' },
    { value: 'technical', label: 'studio_conf_opt_technical' },
    { value: 'non-technical', label: 'studio_conf_opt_non_expert' }
  ];

  detailOptions = [
    { value: 'low', label: 'studio_conf_opt_low' },
    { value: 'medium', label: 'studio_conf_opt_medium' },
    { value: 'high', label: 'studio_conf_opt_high' }
  ];

  complexityOptions = [
    { value: 'low', label: 'studio_conf_opt_simple' },
    { value: 'medium', label: 'studio_conf_opt_moderate' },
    { value: 'high', label: 'studio_conf_opt_complex' }
  ];

  typeOptions = [
    { value: 'conversational', label: 'studio_conf_opt_conversational' },
    { value: 'narrative', label: 'studio_conf_opt_narrative' }
  ];

  langOptions = [
    { value: 'eu', label: 'studio_conf_opt_eu' },
    { value: 'es', label: 'studio_conf_opt_es' }
  ];

  // Logistics
  private destroy$ = new Subject<void>();
  

  constructor(){
    this.setUpSubscribers()
    this.noteService.getNotes()
  }

  setUpSubscribers(){
    // Subscribe to notes
    this.noteService.notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notes => {
        this.currentNotes = notes;
        this.cdr.detectChanges();
      });

    // // Subscribe to generating state
    // this.noteService.isGenerating$
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(isGenerating => {
    //     this.isGenerating = isGenerating;
    //     this.cdr.detectChanges();
    //   });
  }

  onClickShowContent(note: Note): void {
    if (note.status_ready) {
      this.noteService.open(note);
    }
  }
  
  getDaysAgo(createdAt: Date | undefined): string {
    if (!createdAt) return '';
    
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return this.i18n.translate('today');
    } else if (diffDays === 1) {
      return this.i18n.translate('yesterday');
    } else {
      return `${this.i18n.translate('days_ago_1')} ${diffDays} ${this.i18n.translate('days_ago_2')}`;
    }
  }

  openParameterMenu(template: NoteTemplate) {
    if (this.selectedTemplate === template) {
      this.closeParameterMenu();
    } else {
      this.selectedTemplate = template;
      this.selectedParameters = {};
    }
  }

  closeParameterMenu() {
    this.selectedTemplate = null;
    this.selectedParameters = {};
  }

  needsParameter(paramName: string): boolean {
    return this.selectedTemplate?.parameters.includes(paramName) || false;
  }

  selectParameter(paramName: string, value: any) {
    this.selectedParameters = {
      ...this.selectedParameters,
      [paramName]: value
    };
  }

  isParameterSelected(paramName: string, value: any): boolean {
    return this.selectedParameters[paramName as keyof NoteParameters] === value;
  }

  areAllParametersSelected(): boolean {
    if (!this.selectedTemplate) return false;
    
    return this.selectedTemplate.parameters.every(param => 
      this.selectedParameters[param as keyof NoteParameters] !== undefined
    );
  }

  iconFor(type: string): string {
    return this.noteTemplates.find(t => t.labelKey === type)?.icon ?? 'note';
  }

  createNote() {
    if (!this.selectedTemplate || !this.areAllParametersSelected()) return;
    
    const noteType = this.selectedTemplate.labelKey;
    const parameters = { ...this.selectedParameters };
    
    console.log('Creating note:', {
      type: noteType,
      parameters: parameters
    });
    
    // Call service to create the note
    this.noteService.createNote(noteType, parameters).subscribe({
      next: (id) => {
        console.log('Note created successfully in component:', id);
        // The note list is automatically updated via the notes$ subscription
      },
      error: (error) => {
        console.error('Error creating note in component:', error);
        // Handle error (you might want to show a user notification here)
      }
    });

    // Close the parameter menu
    this.closeParameterMenu();
  }

  deleteNote(note: Note) {
    if (!note.status_ready) return;
    
    this.noteService.deleteNote(note.id).subscribe({
      next: () => {
        console.log('Note deleted successfully:', note.id);
      },
      error: (error) => {
        console.error('Error deleting note:', error);
        // Handle error (you might want to show a user notification here)
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
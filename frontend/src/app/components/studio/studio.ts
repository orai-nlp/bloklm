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
      parameters: ['detail']
    },
    { 
      icon: 'description', 
      labelKey: 'summary',
      parameters: ['formality', 'style', 'detail', 'language_complexity']
    },
    { 
      icon: 'help', 
      labelKey: 'FAQ',
      parameters: ['detail', 'language_complexity']
    },
    { 
      icon: 'timeline', 
      labelKey: 'timeline',
      parameters: ['detail']
    },
    { 
      icon: 'menu_book', 
      labelKey: 'glossary',
      parameters: ['detail', 'language_complexity']
    },
    { 
      icon: 'device_hub', 
      labelKey: 'mindmap',
      parameters: ['detail']
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
    { value: 'non-technical', label: 'Non-studio_conf_opt_non_expert' }
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
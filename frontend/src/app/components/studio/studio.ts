import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n';
import { NotebookService } from '../../services/notebook';
import { NoteService } from '../../services/note';
import { NoteParameters, NoteTemplate } from '../../interfaces/note.type';

@Component({
  selector: 'app-studio',
  imports: [CommonModule],
  templateUrl: './studio.html',
  styleUrl: './studio.scss'
})
export class StudioComponent {
  i18n = inject(I18nService);
  notebookService = inject(NotebookService);
  noteService = inject(NoteService);
  
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

  createNote() {
    if (!this.selectedTemplate || !this.areAllParametersSelected()) return;
    
    console.log('Creating note:', {
      type: this.selectedTemplate.labelKey,
      parameters: this.selectedParameters
    });
    
    // TODO: Implement note creation logic
    this.noteService.createNote(this.selectedTemplate.labelKey, this.selectedParameters);
    
    this.closeParameterMenu();
  }
}
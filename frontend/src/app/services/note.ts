import { inject, Injectable } from '@angular/core';
import { Note, NoteParameters } from '../interfaces/note.type';
import { BehaviorSubject, Observable, tap, finalize } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { NotebookService } from './notebook';


@Injectable({
  providedIn: 'root'
})
export class NoteService {
  // inject 
  http = inject(HttpClient)
  notebookService = inject(NotebookService)
  
  // Subjects
  private notesSubject = new BehaviorSubject<Note[]>([])
  private isGeneratingSubject = new BehaviorSubject<boolean>(false);

  // Observables
  public notes$ = this.notesSubject.asObservable();
  public isGenerating$ = this.isGeneratingSubject.asObservable();

  createNote(type: string, parameters: NoteParameters): Observable<Note> {
    const ids = this.notebookService.getSources().map(s => s.id);
    const collectionId = this.notebookService.getCurrentId() || ''
    
    if (!collectionId) {
      throw new Error('No collection ID available');
    }

    // Create a temporary loading note
    const loadingNote: Note = {
      id: `loading-${Date.now()}`, // Temporary ID
      type: type,
      name: '', // Empty for loading state
      content: '', // Empty for loading state
      isLoading: true // Flag to identify loading state
    };

    // Add loading note to the list
    const currentNotes = this.notesSubject.value;
    this.notesSubject.next([...currentNotes, loadingNote]);

    // Set generating state
    this.isGeneratingSubject.next(true);

    // Call backend to create the note
    return this.call_backend<Note>(
      type.toLowerCase(), 
      'POST', 
      undefined, 
      {
        collection_id: collectionId,
        file_ids: ids,
        ...parameters
      }
    ).pipe(
      tap((createdNote: Note) => {
        console.log('Note created successfully from backend:', createdNote);
        
        // Remove loading note and add the real note
        const updatedNotes = this.notesSubject.value
          .filter(note => note.id !== loadingNote.id)
          .concat(createdNote);
        
        this.notesSubject.next(updatedNotes);
      }),
      finalize(() => {
        // Always set generating to false when done (success or error)
        this.isGeneratingSubject.next(false);
        
        // If there was an error, remove the loading note
        const currentNotes = this.notesSubject.value;
        if (currentNotes.some(note => note.id === loadingNote.id)) {
          this.notesSubject.next(
            currentNotes.filter(note => note.id !== loadingNote.id)
          );
        }
      })
    );
  }

  getNotes() {
    const notebookId = this.notebookService.getCurrentId();
    
    if (!notebookId) {
      console.warn('No notebook ID available for loading notes');
      return;
    }

    this.call_backend<Note[]>('notes', 'GET', { nt_id: notebookId }, undefined)
      .subscribe({
        next: (notes) => {
          this.notesSubject.next(notes);
          console.log('Notes loaded from backend:', notes);
        },
        error: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Error loading notes:', errorMessage);
          // Set empty array on error instead of throwing
          this.notesSubject.next([]);
        }
      });
  }

  private call_backend<T>(
    id: string,
    method: 'GET' | 'POST',
    args_get?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
    args_post?: Record<string, string | number | boolean | readonly (string | number | boolean)[] | FormDataEntryValue | null> | FormData
  ): Observable<T> {
    const url = `${environment.apiBaseUrl}/${id}`;

    switch (method) {
      case 'GET':
        return this.http.get<T>(url, { params: args_get });
      case 'POST':
        return this.http.post<T>(url, args_post);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}
import { inject, Injectable, OnDestroy } from '@angular/core';
import { Note, NoteParameters } from '../interfaces/note.type';
import { BehaviorSubject, Observable, tap, finalize, interval, switchMap, takeWhile, catchError, of, EMPTY, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { NotebookService } from './notebook';


@Injectable({
  providedIn: 'root'
})
export class NoteService implements OnDestroy{
  // inject 
  http = inject(HttpClient)
  notebookService = inject(NotebookService)
  
  // Subjects
  private notesSubject = new BehaviorSubject<Note[]>([])

  // Observables
  public notes$ = this.notesSubject.asObservable();

  private pollingIntervals = new Map<string, any>(); // Track active polling

  createNote(type: string, parameters: NoteParameters): Observable<{ id: string }> {
    const ids = this.notebookService.getSources().map(s => s.id);
    const collectionId = this.notebookService.getCurrentId() || ''
    
    if (!collectionId) {
      throw new Error('No collection ID available');
    }

    // Call backend to create the note (now returns only ID)
    return this.call_backend<{ id: string }>(
      type.toLowerCase(), 
      'POST', 
      undefined, 
      {
        collection_id: collectionId,
        file_ids: ids,
        ...parameters
      }
    ).pipe(
      tap((response: { id: string }) => {
        console.log('Note creation initiated, ID:', response.id);
        
        // Create a loading note with the actual ID
        const loadingNote: Note = {
          id: response.id,
          type: type,
          name: '',
          content: '',
          status_ready: false
        };

        // Add loading note to the list
        const currentNotes = this.notesSubject.value;
        this.notesSubject.next([...currentNotes, loadingNote]);

        // Start polling for this note
        this.startPolling(response.id);
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
          
          // Start polling for notes that are not yet created
          notes.forEach(note => {
            if (!note.status_ready) {
              this.startPolling(note.id);
            }
          });
        },
        error: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Error loading notes:', errorMessage);
          this.notesSubject.next([]);
        }
      });
  }

  private startPolling(noteId: string) {
    // Avoid duplicate polling for the same note
    if (this.pollingIntervals.has(noteId)) {
      return;
    }

    // Poll every 3 seconds
    const polling = interval(6000).pipe(
      switchMap(() => this.checkNoteStatus(noteId)),
      takeWhile((noteStatus) => !noteStatus.status_ready, true) // Continue until created, include final emission
    ).subscribe({
      next: (noteStatus) => {
        
        
        // If note is created, stop polling
        if (noteStatus.status_ready) {
          this.updateNoteStatus(noteId, noteStatus);
          this.stopPolling(noteId);
        }
      },
      error: (error) => {
        console.error(`Error polling note ${noteId}:`, error);
        this.stopPolling(noteId);
      }
    });

    this.pollingIntervals.set(noteId, polling);
  }

  private stopPolling(noteId: string) {
    const polling = this.pollingIntervals.get(noteId);
    if (polling) {
      polling.unsubscribe();
      this.pollingIntervals.delete(noteId);
    }
  }

  private checkNoteStatus(noteId: string): Observable<Partial<Note>> {
    return this.call_backend<Partial<Note>>('note', 'GET', { id: noteId }, undefined).pipe(
      catchError((error) => {
        if (error.status === 409) {
          // Note not ready yet → treat as partial response
          return of({ id: noteId, status_ready: false });
        } else if (error.status === 404) {
          // Note does not exist → stop polling
          console.warn(`Note ${noteId} not found (404).`);
          this.stopPolling(noteId);
          return EMPTY; // stop emitting further values
        } else {
          console.error(`Unexpected error for note ${noteId}:`, error);
          return throwError(() => error); // rethrow for outer handler
        }
      })
    );
  }

  private updateNoteStatus(noteId: string, noteStatus: Partial<Note>) {
    debugger
    const currentNotes = this.notesSubject.value;
    const updatedNotes = currentNotes.map(note => {
      if (note.id === noteId) {
        return {
          ...note,
          ...noteStatus,
          status_ready: noteStatus.status_ready
        };
      }
      return note;
    });
    
    this.notesSubject.next(updatedNotes);
  }


  // Clean up polling on service destruction
  ngOnDestroy() {
    this.pollingIntervals.forEach(polling => polling.unsubscribe());
    this.pollingIntervals.clear();
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
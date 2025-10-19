import { inject, Injectable, OnDestroy, NgZone } from '@angular/core';
import { Note, NoteParameters } from '../interfaces/note.type';
import { BehaviorSubject, Observable, tap, finalize, interval, switchMap, takeWhile, catchError, of, EMPTY, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { NotebookService } from './notebook';
import { I18nService } from './i18n';


@Injectable({
  providedIn: 'root'
})
export class NoteService implements OnDestroy{

  // FOR MODAL

  private noteSubject = new BehaviorSubject<Note | null>(null);
  public note$ = this.noteSubject.asObservable();

  open(note: Note) {
    this.noteSubject.next(note);
  }

  close() {
    this.noteSubject.next(null);
  }
  
  // inject 
  http = inject(HttpClient)
  notebookService = inject(NotebookService)
  i18n = inject(I18nService)
  ngZone = inject(NgZone)
  
  // Subjects
  private notesSubject = new BehaviorSubject<Note[]>([])

  // Observables
  public notes$ = this.notesSubject.asObservable();

  private pollingIntervals = new Map<string, any>(); // Track active polling

  createNote(type: string, parameters: NoteParameters): Observable<{ id: string }> {
    const ids = this.notebookService.getSources().filter(s => s.selected).map(s => s.id);
    if(ids.length == 0){
      alert(this.i18n.translate('studio_not_sources_selected'))
      throw new Error(this.i18n.translate('studio_not_sources_selected'))
    }
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
          status: 0,
          created_at: new Date(),
          contained_file_ids: ids
        };

        // Add loading note at the beginning of the list
        const currentNotes = this.notesSubject.value;
        this.notesSubject.next([loadingNote, ...currentNotes]);

        // Start polling for this note
        this.startPolling(response.id);
      })
    );
  }

  deleteNote(noteId: string): Observable<void> {
  return this.call_backend<void>('delete_note', 'GET', { id: noteId }, undefined)
    .pipe(
      tap(() => {
        console.log('Note deleted from backend:', noteId);
        
        // Stop polling if active
        this.stopPolling(noteId);
        
        // Remove note from the list
        const currentNotes = this.notesSubject.value;
        const updatedNotes = currentNotes.filter(note => note.id !== noteId);
        this.notesSubject.next(updatedNotes);
      }),
      catchError((error) => {
        console.error('Error deleting note:', error);
        return throwError(() => error);
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
          // First, set the notes without audio data
          this.notesSubject.next(notes);
          console.log('Notes loaded from backend:', notes);
          
          // Start polling for notes that are not yet created
          notes.forEach(note => {
            if (!note.status) {
              this.startPolling(note.id);
            }
            
            // Fetch audio for podcast notes that are ready (status === 1)
            if (note.type === 'podcast' && note.status === 1) {
              note.status = 0
              this.fetchPodcastAudio(note.id).subscribe({
                next: (audioData) => {
                  const blob = new Blob([audioData], { type: 'audio/mpeg' });
                  const audioUrl = URL.createObjectURL(blob);
                  
                  const currentNotes = this.notesSubject.value;
                  const updatedNotes = currentNotes.map(n => {
                    if (n.id === note.id) {
                      return {
                        ...n,
                        status:1,
                        audioData: new Uint8Array(audioData),
                        audioUrl: audioUrl
                      };
                    }
                    return n;
                  });
                  
                  this.notesSubject.next(updatedNotes);
                },
                error: (error) => {
                  console.error(`Error fetching podcast audio for note ${note.id}:`, error);
                }
              });
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

    // Poll every 6 seconds
    const polling = interval(6000).pipe(
      switchMap(() => this.checkNoteStatus(noteId)),
      takeWhile((noteStatus) => noteStatus.status === 0, true) // Continue while status is 0, include final emission
    ).subscribe({
      next: (noteStatus) => {
        // If note is created (status 1), update and stop polling
        if (noteStatus.status === 1) {
          this.updateNoteStatus(noteId, noteStatus);
          this.stopPolling(noteId);
        }
        // If note has error (status 2), update status and stop polling
        else if (noteStatus.status === 2) {
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
          // Note not ready yet → treat as partial response with status 0
          return of({ id: noteId, status: 0 });
        } else if (error.status === 404) {
          // Note does not exist → stop polling
          console.warn(`Note ${noteId} not found (404).`);
          this.stopPolling(noteId);
          return EMPTY;
        } else if (error.status === 500) {
          // Error in note generation → status 2
          return of({ id: noteId, status: 2 });
        } else {
          console.error(`Unexpected error for note ${noteId}:`, error);
          return throwError(() => error);
        }
      })
    );
  }

  private fetchPodcastAudio(noteId: string): Observable<ArrayBuffer> {
    return this.call_backend<ArrayBuffer>('podcast', 'GET', { id: noteId }, undefined, 'arraybuffer');
  }

  private updateNoteStatus(noteId: string, noteStatus: Partial<Note>) {
    this.ngZone.run(() => {
      const currentNotes = this.notesSubject.value;
      const noteIndex = currentNotes.findIndex(note => note.id === noteId);
      
      if (noteIndex === -1) return;
      
      const note = currentNotes[noteIndex];

      // If it's a podcast and status is ready (1), fetch the audio
      if (note.type === 'podcast' && noteStatus.status === 1) {
        // Keep status as 0 (loading) while fetching audio
        const loadingNote = {
          ...note,
          ...noteStatus,
          status: 0  // Keep loading state
        };
        
        const updatedNotes = [...currentNotes];
        updatedNotes[noteIndex] = loadingNote;
        this.notesSubject.next(updatedNotes);
        
        this.fetchPodcastAudio(noteId).subscribe({
          next: (audioData) => {
            const blob = new Blob([audioData], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);
            
            const completeNote = {
              ...loadingNote,
              status: 1,  // Now set to ready
              audioData: new Uint8Array(audioData),
              audioUrl: audioUrl
            };
            
            const finalNotes = [...this.notesSubject.value];
            const finalIndex = finalNotes.findIndex(n => n.id === noteId);
            if (finalIndex !== -1) {
              finalNotes[finalIndex] = completeNote;
              this.notesSubject.next(finalNotes);
            }
          },
          error: (error) => {
            console.error(`Error fetching podcast audio for note ${noteId}:`, error);
            const errorNote = {
              ...loadingNote,
              status: 2  // Error state
            };
            const finalNotes = [...this.notesSubject.value];
            const finalIndex = finalNotes.findIndex(n => n.id === noteId);
            if (finalIndex !== -1) {
              finalNotes[finalIndex] = errorNote;
              this.notesSubject.next(finalNotes);
            }
          }
        });
      } else {
        // For non-podcast notes or non-ready status, just update normally
        const updatedNote = {
          ...note,
          ...noteStatus,
          status: noteStatus.status ?? 1
        };
        const updatedNotes = [...currentNotes];
        updatedNotes[noteIndex] = updatedNote;
        this.notesSubject.next(updatedNotes);
      }
    });
  }


  // Clean up polling on service destruction
  ngOnDestroy() {
    this.pollingIntervals.forEach(polling => polling.unsubscribe());
    this.pollingIntervals.clear();
    
    // Clean up any blob URLs
    const notes = this.notesSubject.value;
    notes.forEach(note => {
      if (note.audioUrl) {
        URL.revokeObjectURL(note.audioUrl);
      }
    });
  }

  private call_backend<T>(
    id: string,
    method: 'GET' | 'POST',
    args_get?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
    args_post?: Record<string, string | number | boolean | readonly (string | number | boolean)[] | FormDataEntryValue | null> | FormData,
    responseType?: 'json' | 'arraybuffer'
  ): Observable<T> {
    const url = `${environment.apiBaseUrl}/${id}`;

    switch (method) {
      case 'GET':
        if (responseType === 'arraybuffer') {
          return this.http.get(url, { 
            params: args_get,
            responseType: 'arraybuffer' 
          }) as Observable<T>;
        }
        return this.http.get<T>(url, { params: args_get });
      case 'POST':
        return this.http.post<T>(url, args_post);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}
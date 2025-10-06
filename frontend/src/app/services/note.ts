import { Injectable, signal } from '@angular/core';
import { Note, NoteParameters } from '../interfaces/note.type';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class NoteService {
  
  private notes = signal<Note[]>([])
  private loadDone?: Promise<void>
  private currentNoteSubject = new BehaviorSubject<Note | null>(null);
  private isGeneratingSubject = new BehaviorSubject<boolean>(false);

  createNote(type:string, parameters:NoteParameters){

  }
}

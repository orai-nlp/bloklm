import { Injectable, signal } from "@angular/core"
import { HttpClient, HttpErrorResponse } from "@angular/common/http"
import { firstValueFrom, map } from 'rxjs';
import { type Observable, of } from "rxjs"
import { environment } from '../../environments/environment';
import{Notebook ,BackendNotebook} from '../interfaces/notebook.type';
import{Source, BackendSource} from '../interfaces/source.type';
import { I18nService } from "./i18n";
import { Form } from "@angular/forms";



@Injectable({
  providedIn: "root",
})
export class NotebookService {

  private notebooks = signal<Notebook[]>([])
  private currentNotebook = signal<Notebook | null>(null)
  private sources = signal<Source[]>([])
  private loadDone?: Promise<void>


  constructor(private http: HttpClient, private i18n: I18nService) {
    this.loadDone = this.loadNotebooks();
  }

  whenReady(): Promise<void> {
    return this.loadDone!;
  }
  
  getNotebooks(): Notebook[] {
    return this.notebooks()
  }

  getCurrentNotebook(): Notebook | null {
    return this.currentNotebook()
  }

  setCurrentNotebook(note: Notebook): void {
    this.currentNotebook.set(note)
  }

  getSources(): Source[] {
    return this.sources()
  }

  // Add method to clear current notebook
  clearCurrentNotebook(): void {
    this.currentNotebook.set(null)
    this.sources.set([])
  }

  renameLocalNotebook(id:string, name:string){
    let notebook = this.notebooks().find(n => n.id === id);
    if (notebook){
      notebook.title = name
    }
  }


  deleteLocalNotebook(id:string){
    this.notebooks.update(notebooks => 
      notebooks.filter(notebook => notebook.id !== id)
    );
  }

  createNotebook(): Observable<Notebook> {
    const newNotebook: Notebook = {
      id: Date.now().toString(),
      title: this.i18n.language == 'eu'? "Titulugabedun Bilduma" : "Documento sin título",
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceCount: 0,
    }

    const currentNotebooks = this.notebooks()
    this.notebooks.set([...currentNotebooks, newNotebook])
    this.currentNotebook.set(newNotebook)

    this.call_backend('sortu_bilduma', 'POST', undefined,
                    {id: newNotebook.id, title: newNotebook.title, date: newNotebook.createdAt.toISOString().slice(0, 10)}, 
                    ).subscribe(data => { console.log('Sortu da bilduma, id: ', data.id)})

    return of(newNotebook)
  }

  loadNotebook(id: string): Observable<Notebook | null> {
    let notebook = this.notebooks().find((n) => n.id === id)

    // backend-ean bilatu
    if (!notebook){
      this.call_backend('bilduma', 'GET', {id: id}, undefined).subscribe({
        next: (data) => {
          console.log('Notebook loaded: ', data);
          notebook = this.convertBackendNotebook(data) 
        },
        error: (err: HttpErrorResponse) => { console.error('Notebook loading request failed:', err.message, err.status); },
      });
    }
    this.currentNotebook.set(notebook || null)

    return of(notebook || null)
  }

  async loadNotebookAsync(id: string): Promise<Notebook | null> {
    // sources
    await this.loadSourcesForNotebook(id);

    // if already in memory, return it
    let notebook = this.notebooks().find(n => n.id === id);
    if (notebook) {
      this.currentNotebook.set(notebook);
      return notebook;
    }

    // otherwise fetch from the backend
    const raw$ = this.call_backend('bilduma', 'GET', { id }, undefined);
    const data = await firstValueFrom(raw$);

    notebook = this.convertBackendNotebook(data[0]);
    this.currentNotebook.set(notebook);
    return notebook;
  }

  private async loadSourcesForNotebook(notebookId: string) {
    // backend-ean bilatu

    const raw$ = this.call_backend('fitxategiak', 'GET', {id: notebookId}, undefined);
    const raw_fitxaegiak = await firstValueFrom(raw$);
    const fitxategiak: Source[] = (raw_fitxaegiak as BackendSource[]).map(this.convertBackendSource)

    this.sources.set(fitxategiak)
  }

  private convertBackendSource(b: BackendSource): Source {
    return {
        id: String(b.id),
        name: b.name,
        type: b.format.toLowerCase(),
        size: b.charNum  
    };
  }

  private async loadNotebooks() {
    const raw$ = this.call_backend('bildumak', 'GET', {}, undefined);
    const raw_notebooks = await firstValueFrom(raw$);

    // print(raw$)
    const converted_notebooks: Notebook[] = (raw_notebooks as BackendNotebook[]).map(this.convertBackendNotebook);

    this.notebooks.set(converted_notebooks);
  }

  private convertBackendNotebook(b: BackendNotebook): Notebook {
    return {
      id: String(b.id),
      title: b.name,
      createdAt: new Date(b.c_date),
      updatedAt: new Date(b.u_date),
      sourceCount: b.fitxategia_count,
    };
  }

  private getFileType(filename: string): Source["type"] {
    const extension = filename.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "pdf":
        return "pdf"
      case "txt":
        return "txt"
      case "doc":
        return "doc"
      case "docx":
        return "docx"
      case "srt":
        return "srt"
      default:
        return "txt"
    }
  }

  renameBackendNotebook(args: Record<string, string>){
    this.call_backend('berrizendatu_bilduma', 'POST', undefined, args).subscribe(data => {
      console.log('Backendean berrizendatua notebook-a: ', data.id)
    })
  }

  deleteBackendNotebook(id:string){
    this.call_backend('ezabatu_bilduma','POST', undefined, {id: id}).subscribe(data => {
      console.log(`Backendean ${data.id} notebook-a ezabatu da`)
    })
  }

  uploadFiles(files: FileList): Observable<Source[]> {
    const newSources: Source[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const source: Source = {
        id: Date.now().toString() + i,
        name: file.name,
        type: this.getFileType(file.name),
        size: file.size,
      }
      newSources.push(source)
    }

    const currentSources = this.sources()
    this.sources.set([...currentSources, ...newSources])

    // Update notebook source count
    const currentNotebook = this.currentNotebook()
    if (currentNotebook) {
      currentNotebook.sourceCount += newSources.length
      this.currentNotebook.set({ ...currentNotebook })
    }

    return of(newSources)
  }

  uploadFilesToBackend(notebookId: string, formData: FormData): Observable<void> {
    // 'upload_files' becomes the <id> segment in the final URL
    formData.append('nt_id', notebookId);
    return this.call_backend('igo_fitxategiak', 'POST', undefined, formData);
  }

  private call_backend(
        id: string,
        method: 'GET' | 'POST',
        args_get?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
        args_post?: Record<string, string | number | boolean | readonly (string | number | boolean)[] | FormDataEntryValue | null> | FormData
    ): Observable<any> 
    {

    const url = `${environment.apiBaseUrl}/${id}`;


    switch (method) {
      case 'GET':
        return this.http.get(url, { params: args_get });
      case 'POST':
        return this.http.post(url, args_post);
      default:
        // This line will never be reached if you only call with 'GET' | 'POST',
        // but it satisfies the compiler.
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}
import { Injectable, signal } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { firstValueFrom } from 'rxjs';
import { type Observable, of } from "rxjs"
import { environment } from '../../environments/environment';
import{Notebook ,BackendNotebook} from '../interfaces/notebook.type';
import{Source} from '../interfaces/source.type';
import { I18nService } from "./i18n";



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

  getSources(): Source[] {
    return this.sources()
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

    this.call_backend('sortu_bilduma', 
                    {id: newNotebook.id, title: newNotebook.title, date: newNotebook.createdAt.toISOString().slice(0, 10)}, 
                    'POST').subscribe(data => { console.log('Sortu da bilduma, id: ', data.id)})

    return of(newNotebook)
  }

  loadNotebook(id: string): Observable<Notebook | null> {
    const notebook = this.notebooks().find((n) => n.id === id)
    this.currentNotebook.set(notebook || null)

    // Load sources for this notebook
    if (notebook) {
      this.loadSourcesForNotebook(id)
    }

    return of(notebook || null)
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
        uploadedAt: new Date(),
        selected: true,
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

  private async loadNotebooks() {
    const raw$ = this.call_backend('bildumak', {}, 'GET');
    const raw_notebooks = await firstValueFrom(raw$);

    // print(raw$)
    const converted_notebooks: Notebook[] = (raw_notebooks as BackendNotebook[]).map(b => ({
      id: String(b.id),
      title: b.name,
      createdAt: new Date(b.c_date),
      updatedAt: new Date(b.u_date),
      sourceCount: b.fitxategia_count,
    }));

    this.notebooks.set(converted_notebooks);
  }


  private loadSourcesForNotebook(notebookId: string) {
    // Simulate loading sources
    if (notebookId === "1") {
      const mockSources: Source[] = [
        {
          id: "1",
          name: "test.txt",
          type: "txt",
          size: 1024,
          uploadedAt: new Date(),
          selected: true,
        },
      ]
      this.sources.set(mockSources)
    } else {
      this.sources.set([])
    }
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

  private call_backend(
        id: string,
        args: Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
        method: 'GET' | 'POST'
    ): Observable<any> 
    {

    const url = `${environment.apiBaseUrl}/${id}`;

    switch (method) {
      case 'GET':
        return this.http.get(url, { params: args });
      case 'POST':
        return this.http.post(url, args);
      default:
        // This line will never be reached if you only call with 'GET' | 'POST',
        // but it satisfies the compiler.
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}

import { Injectable, signal } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { type Observable, of } from "rxjs"

export interface Notebook {
  id: string
  title: string
  description?: string
  createdAt: Date
  updatedAt: Date
  sourceCount: number
  icon?: string
}

export interface Source {
  id: string
  name: string
  type: "pdf" | "txt" | "doc" | "docx" | "srt"
  size: number
  uploadedAt: Date
  selected: boolean
}

@Injectable({
  providedIn: "root",
})
export class NotebookService {
  private notebooks = signal<Notebook[]>([])
  private currentNotebook = signal<Notebook | null>(null)
  private sources = signal<Source[]>([])

  constructor(private http: HttpClient) {
    this.loadNotebooks()
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
      title: "Untitled notebook",
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceCount: 0,
    }

    const currentNotebooks = this.notebooks()
    this.notebooks.set([...currentNotebooks, newNotebook])
    this.currentNotebook.set(newNotebook)

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

  private loadNotebooks() {
    // Simulate loading from backend
    const mockNotebooks: Notebook[] = [
      {
        id: "1",
        title: "Arrasate's Etxe Txikiak: A Century...",
        createdAt: new Date("2025-01-22"),
        updatedAt: new Date("2025-01-22"),
        sourceCount: 1,
        icon: "⏳",
      },
    ]

    this.notebooks.set(mockNotebooks)
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
}

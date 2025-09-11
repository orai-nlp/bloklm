import { Component, inject, type OnInit, ChangeDetectorRef, ViewChild, ElementRef, HostListener, AfterViewInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { I18nService } from "../../services/i18n"
import { NotebookService} from "../../services/notebook"
import{Notebook} from '../../interfaces/notebook.type';

interface NotebookWithUI extends Notebook {
  isRenaming?: boolean;
  tempTitle?: string;
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl:"./home.html",
  styleUrls: ["./home.scss"],
})
export class HomeComponent implements OnInit {
  i18n = inject(I18nService)
  notebookService = inject(NotebookService)
  router = inject(Router)
  private cdr = inject(ChangeDetectorRef)

  notebooks: NotebookWithUI[] = []
  activeMenuId: string | null = null

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close dropdown menu when clicking outside
    this.activeMenuId = null
  }

  constructor(){
  }

  async ngOnInit() {
      const rawNotebooks = this.notebookService.getNotebooks();
      this.notebooks = rawNotebooks.map(notebook => ({
        ...notebook,
        isRenaming: false,
        tempTitle: notebook.title
      }))
      this.cdr.detectChanges()
  }

  createNewNotebook() {
    this.notebookService.createNotebook().subscribe((notebook) => {
      // Update local notebooks array
      const notebookWithUI: NotebookWithUI = {
        ...notebook,
        isRenaming: false,
        tempTitle: notebook.title
      }
      this.notebooks = [...this.notebooks, notebookWithUI]
      this.router.navigate(["/notebook", notebook.id])
    })
  }

  openNotebook(id: string) {
    this.router.navigate(["/notebook", id])
  }

  toggleMenu(event: Event, notebookId: string) {
    event.stopPropagation()
    this.activeMenuId = this.activeMenuId === notebookId ? null : notebookId
  }

  startRename(notebook: NotebookWithUI) {
    notebook.isRenaming = true
    notebook.tempTitle = notebook.title
    this.activeMenuId = null
    
    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector(`input.notebook-title-input`) as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 0)
  }

  confirmRename(notebook: NotebookWithUI) {
    if (notebook.tempTitle && notebook.tempTitle.trim() !== '') {
      const oldTitle = notebook.title
      notebook.title = notebook.tempTitle.trim()
      notebook.updatedAt = new Date()
      
      this.notebookService.renameLocalNotebook(notebook.id, notebook.title)
      console.log(`Renaming notebook ${notebook.id} from "${oldTitle}" to "${notebook.title}"`)
      this.notebookService.renameBackendNotebook({id: notebook.id, title: notebook.title })
    }
    
    notebook.isRenaming = false
    this.cdr.detectChanges()
  }

  cancelRename(notebook: NotebookWithUI) {
    notebook.tempTitle = notebook.title
    notebook.isRenaming = false
    this.cdr.detectChanges()
  }

  deleteNotebook(notebookId: string) {
    const notebookIndex = this.notebooks.findIndex(n => n.id === notebookId)
    
    if (notebookIndex !== -1) {
      const notebook = this.notebooks[notebookIndex]
      
      // Confirm deletion
      const confirmDelete = confirm(this.i18n.translate('confirm_delete')+`${notebook.title}"?`)
      
      if (confirmDelete) {
        // Remove from local array
        this.notebooks.splice(notebookIndex, 1)
        this.activeMenuId = null
        
        this.notebookService.deleteLocalNotebook(notebookId)
        console.log(`Deleting notebook ${notebookId}`)
        this.notebookService.deleteBackendNotebook(notebookId)
        
        this.cdr.detectChanges()
      }
    }
  }

  trackByNotebookId(index: number, notebook: NotebookWithUI): string {
    return notebook.id
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.i18n.language === "eu" ? "eu-ES" : "es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }
}
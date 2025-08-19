import { Component, inject, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import { I18nService } from "../../services/i18n"
import { NotebookService} from "../../services/notebook"
import{Notebook} from '../../interfaces/notebook.type';
import{Source} from '../../interfaces/source.type';

import { UploadModalComponent } from "../upload-modal/upload-modal"

@Component({
  selector: "app-notebook",
  standalone: true,
  imports: [CommonModule, UploadModalComponent],
  templateUrl: "./notebook.html",
  styleUrls: ["./notebook.scss"],
})
export class NotebookComponent implements OnInit {
  i18n = inject(I18nService)
  notebookService = inject(NotebookService)
  route = inject(ActivatedRoute)

  notebook: Notebook | null = null
  sources: Source[] = []
  showUploadModal = false

  get allSourcesSelected(): boolean {
    return this.sources.length > 0 && this.sources.every((s) => s.selected)
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get("id")
    if (id) {
      this.notebookService.loadNotebook(id).subscribe((notebook) => {
        this.notebook = notebook
        this.sources = this.notebookService.getSources()
      })
    }
  }

  toggleAllSources() {
    const newState = !this.allSourcesSelected
    this.sources.forEach((source) => (source.selected = newState))
  }

  toggleSource(source: Source) {
    source.selected = !source.selected
  }

  onFilesUploaded(files: FileList) {
    this.sources = this.notebookService.getSources()
  }
}

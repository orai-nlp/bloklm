import { ChangeDetectorRef, Component, inject, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import { I18nService } from "../../services/i18n"
import { NotebookService} from "../../services/notebook"
import{Notebook} from '../../interfaces/notebook.type';
import{Source} from '../../interfaces/source.type';

import { UploadModalComponent } from "../upload-modal/upload-modal"
import { ChatComponent } from "../chat/chat"

@Component({
  selector: "app-notebook",
  standalone: true,
  imports: [CommonModule, UploadModalComponent, ChatComponent],
  templateUrl: "./notebook.html",
  styleUrls: ["./notebook.scss"],
})
export class NotebookComponent implements OnInit {
  i18n = inject(I18nService)
  notebookService = inject(NotebookService)
  route = inject(ActivatedRoute)
  private cdr = inject(ChangeDetectorRef)


  notebook: Notebook | null = null
  sources: Source[] = []
  showUploadModal = false
  chat_placeholder = this.i18n.translate('chat_placerholder')
  chat_placeholder_empty = this.i18n.translate('chat_placerholder_empty')

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { return; }

    this.notebook = await this.notebookService.loadNotebookAsync(id);
    this.sources = this.notebookService.getSources();
    this.cdr.markForCheck();   // only needed if OnPush
  }

  onFilesUploaded(files: FileList) {
    this.sources = this.notebookService.getSources()
  }
}

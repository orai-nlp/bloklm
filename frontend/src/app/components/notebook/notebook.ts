import { ChangeDetectorRef, Component, effect, inject, type OnInit, AfterViewInit, ElementRef, ViewChild } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import { I18nService } from "../../services/i18n"
import { NotebookService} from "../../services/notebook"
import{Notebook} from '../../interfaces/notebook.type';
import{Source} from '../../interfaces/source.type';

import { UploadModalComponent } from "../upload-modal/upload-modal"
import { ChatComponent } from "../chat/chat"
import { StudioComponent } from "../studio/studio"
import { FormsModule } from "@angular/forms"
import { SourceService } from "../../services/source"

@Component({
  selector: "app-notebook",
  standalone: true,
  imports: [CommonModule, UploadModalComponent, ChatComponent, StudioComponent, FormsModule],
  templateUrl: "./notebook.html",
  styleUrls: ["./notebook.scss"],
})
export class NotebookComponent implements OnInit, AfterViewInit {
  i18n = inject(I18nService)
  notebookService = inject(NotebookService)
  sourceService = inject(SourceService)
  route = inject(ActivatedRoute)
  private cdr = inject(ChangeDetectorRef)
  private elementRef = inject(ElementRef)

  @ViewChild('sourcesPanel') sourcesPanel!: ElementRef
  @ViewChild('studioPanel') studioPanel!: ElementRef

  notebook: Notebook | null = null
  sources: Source[] = []
  showUploadModal = false
  chat_placeholder = this.i18n.translate('chat_placerholder')
  chat_placeholder_empty = this.i18n.translate('chat_placerholder_empty')

  // Panel widths
  sourcesPanelWidth = 250
  studioPanelWidth = 500

  constructor(){
    effect(() => {
      this.notebook = this.notebookService.getCurrentNotebook();
      console.log('Notebook changed:', this.notebook);
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { return; }

    this.notebook = await this.notebookService.loadNotebookAsync(id);
    this.sources = this.notebookService.getSources();
    this.cdr.markForCheck();
  }

  ngAfterViewInit() {
  }

  onFilesUploaded(files: FileList) {
    this.sources = this.notebookService.getSources()
  }

  get gridTemplateColumns(): string {
    return `${this.sourcesPanelWidth}px 1fr ${this.studioPanelWidth}px`;
  }


  async onClickShowContent(source: Source): Promise<void> {
    await this.sourceService.open(source);
    console.log('Klikatu da');
  }
}
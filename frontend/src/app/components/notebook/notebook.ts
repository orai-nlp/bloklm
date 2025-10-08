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

@Component({
  selector: "app-notebook",
  standalone: true,
  imports: [CommonModule, UploadModalComponent, ChatComponent, StudioComponent],
  templateUrl: "./notebook.html",
  styleUrls: ["./notebook.scss"],
})
export class NotebookComponent implements OnInit, AfterViewInit {
  i18n = inject(I18nService)
  notebookService = inject(NotebookService)
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
  studioPanelWidth = 400

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
    this.setupResizers();
  }

  private setupResizers() {
    const container = this.elementRef.nativeElement.querySelector('.notebook-content');
    if (!container) return;

    // Create resizers
    const sourcesResizer = this.createResizer('sources');
    const studioResizer = this.createResizer('studio');

    // Insert resizers
    const sourcesPanel = container.querySelector('.sources-panel');
    const studioPanel = container.querySelector('.studio-panel');
    
    if (sourcesPanel) {
      sourcesPanel.insertAdjacentElement('afterend', sourcesResizer);
    }
    if (studioPanel) {
      studioPanel.insertAdjacentElement('beforebegin', studioResizer);
    }
  }

  private createResizer(type: 'sources' | 'studio'): HTMLElement {
    const resizer = document.createElement('div');
    resizer.className = `panel-resizer ${type}-resizer`;
    
    let startX = 0;
    let startWidth = 0;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = type === 'sources' ? this.sourcesPanelWidth : this.studioPanelWidth;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      resizer.classList.add('active');
    };

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      let newWidth: number;

      if (type === 'sources') {
        newWidth = Math.max(200, Math.min(500, startWidth + diff));
        this.sourcesPanelWidth = newWidth;
      } else {
        newWidth = Math.max(300, Math.min(600, startWidth - diff));
        this.studioPanelWidth = newWidth;
      }

      this.updatePanelWidths();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizer.classList.remove('active');
    };

    resizer.addEventListener('mousedown', onMouseDown);
    
    return resizer;
  }

  private updatePanelWidths() {
    const container = this.elementRef.nativeElement.querySelector('.notebook-content');
    if (container) {
      container.style.gridTemplateColumns = `${this.sourcesPanelWidth}px 1fr ${this.studioPanelWidth}px`;
    }
  }

  onFilesUploaded(files: FileList) {
    this.sources = this.notebookService.getSources()
  }
}
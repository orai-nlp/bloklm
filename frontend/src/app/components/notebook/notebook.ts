import { ChangeDetectorRef, Component, effect, inject, type OnInit, AfterViewInit, ElementRef, ViewChild, HostListener } from "@angular/core"
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

// Panel configuration interface
interface PanelConfig {
  sources: {
    default: number;
    min: number;
    max: number;
  };
  studio: {
    default: number;
    min: number;
    max: number;
  };
}

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

  // Panel configuration - CUSTOMIZE THESE VALUES
  private panelConfig: PanelConfig = {
    sources: {
      default: 250, 
      min: 100,      // Minimum width before hiding
      max: 500       // Maximum width
    },
    studio: {
      default: 400,  
      min: 180,      // Minimum width before hiding
      max: 600       // Maximum width
    }
  };

  // Current panel widths
  sourcesPanelWidth = this.panelConfig.sources.default;
  studioPanelWidth = this.panelConfig.studio.default;

  // Breakpoints for responsive behavior
  private readonly MOBILE_BREAKPOINT = 768;
  private readonly TABLET_BREAKPOINT = 1024;
  private readonly DESKTOP_SMALL_BREAKPOINT = 1200;
  private readonly DESKTOP_MEDIUM_BREAKPOINT = 1400;

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
    this.adjustPanelWidths();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.adjustPanelWidths();
  }

  private adjustPanelWidths() {
    const windowWidth = window.innerWidth;
    
    if (windowWidth <= this.MOBILE_BREAKPOINT) {
      // Mobile: panels stack vertically (handled by CSS)
      this.sourcesPanelWidth = windowWidth;
      this.studioPanelWidth = windowWidth;
    } else if (windowWidth <= this.TABLET_BREAKPOINT) {
      // Tablet: reduce panel widths proportionally
      const scale = 0.85;
      this.sourcesPanelWidth = Math.max(
        this.panelConfig.sources.min,
        Math.min(this.panelConfig.sources.default * scale, this.panelConfig.sources.max)
      );
      this.studioPanelWidth = Math.max(
        this.panelConfig.studio.min,
        Math.min(this.panelConfig.studio.default * scale, this.panelConfig.studio.max)
      );
    } else if (windowWidth <= this.DESKTOP_SMALL_BREAKPOINT) {
      // Small desktop: slightly reduced
      const scale = 0.9;
      this.sourcesPanelWidth = Math.max(
        this.panelConfig.sources.min,
        Math.min(this.panelConfig.sources.default * scale, this.panelConfig.sources.max)
      );
      this.studioPanelWidth = Math.max(
        this.panelConfig.studio.min,
        Math.min(this.panelConfig.studio.default * scale, this.panelConfig.studio.max)
      );
    } else if (windowWidth <= this.DESKTOP_MEDIUM_BREAKPOINT) {
      // Medium desktop: use default sizes
      this.sourcesPanelWidth = this.panelConfig.sources.default;
      this.studioPanelWidth = this.panelConfig.studio.default;
    } else {
      // Large desktop: allow panels to grow slightly
      const availableSpace = windowWidth - 800; // Reserve space for chat panel
      const totalDefaultWidth = this.panelConfig.sources.default + this.panelConfig.studio.default;
      const scale = Math.min(1.2, availableSpace / totalDefaultWidth);
      
      this.sourcesPanelWidth = Math.min(
        this.panelConfig.sources.max,
        this.panelConfig.sources.default * scale
      );
      this.studioPanelWidth = Math.min(
        this.panelConfig.studio.max,
        this.panelConfig.studio.default * scale
      );
    }

    this.cdr.detectChanges();
  }

  onFilesUploaded(files: FileList) {
    this.sources = this.notebookService.getSources()
  }

  get gridTemplateColumns(): string {
    const windowWidth = window.innerWidth;
    
    if (windowWidth <= this.MOBILE_BREAKPOINT) {
      return '1fr'; // Mobile: single column, panels stack
    }
    
    return `${this.sourcesPanelWidth}px 1fr ${this.studioPanelWidth}px`;
  }

  async onClickShowContent(source: Source): Promise<void> {
    await this.sourceService.open(source);
    console.log('Klikatu da');
  }

  onMouseEnter(source: any, event: MouseEvent) {
    const span = event.target as HTMLElement;
    const parent = span.parentElement!;
    if (span.scrollWidth > parent.clientWidth) {
      parent.classList.add('text-overflow');
    }
  }

  onMouseLeave(source: any, event: MouseEvent) {
    const span = event.target as HTMLElement;
    span.parentElement?.classList.remove('text-overflow');
  }

  getSourceIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'pdf': 'picture_as_pdf',
      'txt': 'text_snippet',
      'doc': 'description',
      'docx': 'description',
      'srt': 'subtitles',
      'wav': 'audio_file',
      'mp3': 'audiotrack',
    };
    
    return iconMap[type] || 'insert_drive_file';
  }
}
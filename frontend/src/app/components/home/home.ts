import { Component, inject, type OnInit, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router } from "@angular/router"
import { I18nService } from "../../services/i18n"
import { NotebookService} from "../../services/notebook"
import{Notebook} from '../../interfaces/notebook.type';


@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule],
  templateUrl:"./home.html",
  styleUrls: ["./home.scss"],
})
export class HomeComponent implements OnInit {
  i18n = inject(I18nService)
  notebookService = inject(NotebookService)
  router = inject(Router)
  private cdr = inject(ChangeDetectorRef)

  notebooks: Notebook[] = []

  async ngOnInit() {
      this.notebooks = this.notebookService.getNotebooks();
      this.cdr.detectChanges() // Manually trigger change detection
  }

  createNewNotebook() {
    this.notebookService.createNotebook().subscribe((notebook) => {
      this.router.navigate(["/notebook", notebook.id])
    })
  }

  openNotebook(id: string) {
    this.router.navigate(["/notebook", id])
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.i18n.language === "eu" ? "eu-ES" : "es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }
}
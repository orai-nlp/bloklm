import { Component, inject, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router } from "@angular/router"
import { I18nService } from "../../services/i18n"
import { NotebookService, type Notebook } from "../../services/notebook"

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

  notebooks: Notebook[] = []

  ngOnInit() {
    this.notebooks = this.notebookService.getNotebooks()
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

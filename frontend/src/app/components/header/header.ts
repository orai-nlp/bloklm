import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { I18nService } from "../../services/i18n"
import { NotebookService } from "../../services/notebook"
import { Notebook } from '../../interfaces/notebook.type'
import { RouterLink, Router, NavigationEnd } from "@angular/router"
import { filter, Subscription } from "rxjs"
import { NONE_TYPE } from "@angular/compiler"

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./header.html",
  styleUrls: ["./header.scss"],
})
export class HeaderComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService)
  cdr = inject(ChangeDetectorRef)
  notebookService = inject(NotebookService)
  router = inject(Router)
  currentNotebook:any = null;
  private routerSubscription?: Subscription

  async ngOnInit() {
    // Listen to route changes and clear current notebook when not on notebook route
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Clear current notebook if we're not on a notebook route
        if (!event.url.includes('/notebook/')) {
          this.notebookService.clearCurrentNotebook()
        }
      })
    this.currentNotebook = this.notebookService.getCurrentNotebook();
    console.log(this.currentNotebook);
    
    this.cdr.detectChanges()
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe()
  }
}
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, effect } from "@angular/core"
import { CommonModule } from "@angular/common"
import { I18nService } from "../../services/i18n"
import { NotebookService } from "../../services/notebook"
import { Notebook } from '../../interfaces/notebook.type'
import { RouterLink, Router, NavigationEnd } from "@angular/router"
import { filter, Subscription } from "rxjs"

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
  currentNotebook: Notebook | null = null;
  displayedTitle: string = '';
  showCursor: boolean = false;
  private routerSubscription?: Subscription
  private animationTimeout?: number;

  constructor() {
    // Subscribe to currentNotebook signal changes using effect
    effect(() => {
      const newNotebook = this.notebookService.getCurrentNotebook();
      console.log('Current notebook changed:', newNotebook);
      
      // Clear any existing animation
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
      }
      
      this.currentNotebook = newNotebook;
      
      if (newNotebook?.title) {
        this.animateTitle(newNotebook.title);
      } else {
        this.displayedTitle = '';
        this.showCursor = false;
        this.cdr.detectChanges();
      }
    });
  }

  private animateTitle(title: string): void {
    this.displayedTitle = '';
    this.showCursor = true;
    let currentIndex = 0;
    
    const animateNextLetter = () => {
      if (currentIndex < title.length) {
        this.displayedTitle += title[currentIndex];
        currentIndex++;
        this.cdr.detectChanges();
        
        // Adjust timing: faster for spaces, slower for letters
        const delay = title[currentIndex - 1] === ' ' ? 50 : 65;
        this.animationTimeout = window.setTimeout(animateNextLetter, delay);
      } else {
        // Animation complete, hide cursor after a brief pause
        this.animationTimeout = window.setTimeout(() => {
          this.showCursor = false;
          this.cdr.detectChanges();
        }, 1000);
      }
    };
    
    // Start the animation after a brief delay
    this.animationTimeout = window.setTimeout(animateNextLetter, 150);
  }

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
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe()
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }
}
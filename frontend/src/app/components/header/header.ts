import { Component, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { I18nService } from "../../services/i18n"
import { RouterLink } from "@angular/router"

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./header.html",
  styleUrls: ["./header.scss"],
})
export class HeaderComponent {
  i18n = inject(I18nService)
}

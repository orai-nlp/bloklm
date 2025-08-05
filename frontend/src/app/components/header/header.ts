import { Component, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { I18nService } from "../../services/i18n"

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./header.html",
  styleUrls: ["./header.scss"],
})
export class HeaderComponent {
  i18n = inject(I18nService)
}

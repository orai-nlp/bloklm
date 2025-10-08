import { Component } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { HeaderComponent } from "./components/header/header"
import { NoteModalComponent } from "./components/note-modal/note-modal"

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NoteModalComponent],
  templateUrl: './app.html',
  styleUrls: ["./app.scss"],
})
export class App {
  title = "BlokLM"
}

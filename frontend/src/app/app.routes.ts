import type { Routes } from "@angular/router"
import { HomeComponent } from "./components/home/home"
import { NotebookComponent } from "./components/notebook/notebook"

export const routes: Routes = [
  {
    path: "",
    component: HomeComponent
  },
  {
    path: "notebook/:id",
    component: NotebookComponent
  },
  {
    path: "**",
    redirectTo: "",
  },
]

import type { Routes } from "@angular/router"
import { HomeComponent } from "./components/home/home"
import { NotebookComponent } from "./components/notebook/notebook"
import { notebooksResolver } from "./resolvers/notebooks.resolver"

export const routes: Routes = [
  {
    path: "",
    component: HomeComponent,
    resolve: { notebooks: notebooksResolver }

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

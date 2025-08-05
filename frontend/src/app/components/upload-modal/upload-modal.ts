import { Component, EventEmitter, Input, Output, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { I18nService } from "../../services/i18n"
import { NotebookService } from "../../services/notebook"

@Component({
  selector: "app-upload-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-modal.html',
  styleUrls: ["./upload-modal.scss"],
})
export class UploadModalComponent {
  @Input() isOpen = false
  @Output() close = new EventEmitter<void>()
  @Output() filesUploaded = new EventEmitter<FileList>()

  i18n = inject(I18nService)
  notebookService = inject(NotebookService)

  isDragOver = false
  sourceCount = 0

  closeModal() {
    this.close.emit()
  }

  onDragOver(event: DragEvent) {
    event.preventDefault()
    this.isDragOver = true
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault()
    this.isDragOver = false
  }

  onDrop(event: DragEvent) {
    event.preventDefault()
    this.isDragOver = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      this.handleFiles(files)
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.handleFiles(input.files)
    }
  }

  private handleFiles(files: FileList) {
    this.notebookService.uploadFiles(files).subscribe(() => {
      this.filesUploaded.emit(files)
      this.closeModal()
    })
  }
}

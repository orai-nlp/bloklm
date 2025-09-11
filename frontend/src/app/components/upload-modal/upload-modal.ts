import { Component, EventEmitter, Input, Output, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { I18nService } from "../../services/i18n"
import { NotebookService } from "../../services/notebook"
import { firstValueFrom } from "rxjs"

interface UploadFile {
  name: string
  type: string
  size: number
  file?: File
  content?: string
}

@Component({
  selector: "app-upload-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  uploadedFiles: UploadFile[] = []
  showPasteArea = false
  pastedText = ''
  pastedFileName = ''
  placeholderText = this.i18n.translate('modal_placeholdertext')
  placeholderText_docname = this.i18n.translate('modal_placeholdertext_docname')

  // Allowed file extensions
  private allowedExtensions = ['.pdf', '.txt', '.srt', '.doc', '.docx']


  closeModal() {
    // Only close if no files are uploaded or user explicitly cancels
    if (this.uploadedFiles.length === 0) {
      this.resetModal()
      this.close.emit()
    } else {
      // Ask for confirmation if files are pending
      if (confirm('You have files pending upload. Are you sure you want to close?')) {
        this.resetModal()
        this.close.emit()
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragOver = true
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragOver = false
  }

  onDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.isDragOver = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      this.processFiles(files)
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.processFiles(input.files)
    }
    // Reset input value to allow selecting the same file again
    input.value = ''
  }

  private processFiles(files: FileList) {
    const validFiles: UploadFile[] = []
    const invalidFiles: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (this.isValidFile(file)) {
        // Check if file already exists
        if (!this.uploadedFiles.some(f => f.name === file.name)) {
          validFiles.push({
            name: file.name,
            type: this.getFileExtension(file.name),
            size: file.size,
            file: file
          })
        }
      } else {
        invalidFiles.push(file.name)
      }
    }

    if (invalidFiles.length > 0) {
      alert(`The following files are not supported:\n${invalidFiles.join('\n')}\n\nOnly PDF, TXT, SRT, DOC, and DOCX files are allowed.`)
    }

    // Add valid files to the list (max 50 files)
    const remainingSlots = 50 - this.uploadedFiles.length
    const filesToAdd = validFiles.slice(0, remainingSlots)
    this.uploadedFiles = [...this.uploadedFiles, ...filesToAdd]

    if (validFiles.length > remainingSlots) {
      alert(`Only ${remainingSlots} files were added. Maximum limit of 50 files reached.`)
    }
  }

  private isValidFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    return this.allowedExtensions.includes(extension)
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'txt'
  }

  showPasteTextArea() {
    this.showPasteArea = true
  }

  cancelPaste() {
    this.showPasteArea = false
    this.pastedText = ''
    this.pastedFileName = ''
  }

  addPastedText() {
    if (!this.pastedText || !this.pastedFileName) {
      return
    }

    // Ensure filename has valid extension
    let filename = this.pastedFileName
    const hasValidExtension = this.allowedExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    )
    
    if (!hasValidExtension) {
      filename += '.txt' // Default to .txt if no valid extension
    }

    // Check if file already exists
    if (this.uploadedFiles.some(f => f.name === filename)) {
      alert('A file with this name already exists.')
      return
    }

    // Add to uploaded files
    this.uploadedFiles.push({
      name: filename,
      type: this.getFileExtension(filename),
      size: new Blob([this.pastedText]).size,
      content: this.pastedText
    })

    // Reset paste area
    this.cancelPaste()
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1)
  }

  getFileIcon(type: string): string {
    switch(type) {
      case 'pdf':
        return 'picture_as_pdf'
      case 'doc':
      case 'docx':
        return 'description'
      case 'srt':
        return 'code'
      default:
        return 'text_snippet'
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  async uploadFiles() {
    if (this.uploadedFiles.length === 0) {
      return
    }

    // Convert uploadedFiles to FileList-like structure for backend
    const formData = new FormData()

    for (const uploadFile of this.uploadedFiles) {
      if (uploadFile.file) {
        // Regular file upload
        formData.append('files', uploadFile.file)
      } else if (uploadFile.content) {
        // Text content from paste
        const blob = new Blob([uploadFile.content], { type: 'text/plain' })
        const file = new File([blob], uploadFile.name, { type: 'text/plain' })
        formData.append('files', file)
      }
    }

    // Backend call
    try {
      await this.callBackend(formData)
      
      // Create a FileList-like object for saving them locally
      const fileList = this.createFileList()
      
      // Notify parent component
      this.notebookService.uploadFiles(fileList).subscribe(() => {
        this.filesUploaded.emit(fileList)
        this.resetModal()
        this.close.emit()
      })
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload files. Please try again.')
    }
  }

  private createFileList(): FileList {
    // Create a DataTransfer object to build a FileList
    const dataTransfer = new DataTransfer()
    
    for (const uploadFile of this.uploadedFiles) {
      if (uploadFile.file) {
        dataTransfer.items.add(uploadFile.file)
      } else if (uploadFile.content) {
        const blob = new Blob([uploadFile.content], { type: 'text/plain' })
        const file = new File([blob], uploadFile.name, { type: 'text/plain' })
        dataTransfer.items.add(file)
      }
    }
    
    return dataTransfer.files
  }

  private async callBackend(formData: FormData): Promise<void> {
    const notebookId = this.notebookService.getCurrentNotebook()?.id;
    if (!notebookId) {
      throw new Error('No notebook selected');
    }
    debugger
    // Tell the notebook service to do the upload
    await firstValueFrom(
      this.notebookService.uploadFilesToBackend(notebookId, formData)
    );
  }

  private resetModal() {
    this.uploadedFiles = []
    this.showPasteArea = false
    this.pastedText = ''
    this.pastedFileName = ''
    this.isDragOver = false
  }
}
import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, Output, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { I18nService } from "../../services/i18n"
import { NotebookService } from "../../services/notebook"
import { firstValueFrom } from "rxjs"
import { ChatService } from "../../services/chat"

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
  chatService = inject(ChatService)
  private cdr = inject(ChangeDetectorRef)
  private zone = inject(NgZone)
  
  isDragOver = false
  uploadedFiles: UploadFile[] = []
  showPasteArea = false
  pastedText = ''
  pastedFileName = ''
  placeholderText = this.i18n.translate('modal_placeholdertext')
  placeholderText_docname = this.i18n.translate('modal_placeholdertext_docname')
  
  // Loading state
  isUploading = false

  // Allowed file extensions
  private allowedExtensions = ['.pdf', '.txt', '.srt', '.doc', '.docx', '.wav', '.mp3']
  private audioExtensions = ['.wav', '.mp3']
  private maxAudioDurationMinutes = 10

  closeModal() {
    // Prevent closing if upload is in progress
    if (this.isUploading) {
      return
    }

    // Only close if no files are uploaded or user explicitly cancels
    if (this.uploadedFiles.length === 0) {
      this.resetModal()
      this.close.emit()
    } else {
      // Ask for confirmation if files are pending
      if (confirm(this.i18n.translate('modal_cancel_confirm'))) {
        this.resetModal()
        this.close.emit()
      }
    }
  }

  onDragOver(event: DragEvent) {
    // Prevent drag over if uploading
    if (this.isUploading) {
      return
    }
    
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
    // Prevent drop if uploading
    if (this.isUploading) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    this.isDragOver = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      this.zone.run(() => {
        this.processFiles(files)
      })
    }
  }

  onFileSelected(event: Event) {
    if (this.isUploading) {
      return
    }

    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      // Store the FileList in a variable since it gets cleared
      const files = Array.from(input.files)
      
      this.zone.run(() => {
        // Convert back to FileList-like structure
        const dataTransfer = new DataTransfer()
        files.forEach(file => dataTransfer.items.add(file))
        this.processFiles(dataTransfer.files)
      })
    }
    // Reset input value to allow selecting the same file again
    input.value = ''
  }

  private async processFiles(files: FileList) {
    const validFiles: UploadFile[] = []
    const invalidFiles: string[] = []
    const tooLongAudioFiles: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (this.isValidFile(file)) {
        // Check if file already exists
        if (!this.uploadedFiles.some(f => f.name === file.name)) {
          // Check audio duration if it's an audio file
          if (this.isAudioFile(file)) {
            try {
              const duration = await this.getAudioDuration(file)
              const durationMinutes = duration / 60
              
              if (durationMinutes > this.maxAudioDurationMinutes) {
                tooLongAudioFiles.push(`${file.name} (${Math.round(durationMinutes)} min)`)
                continue
              }
            } catch (error) {
              console.error(`Failed to check duration for ${file.name}:`, error)
              // If we can't check duration, allow the file (fail open)
            }
          }

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

    // Wrap the UI updates in zone.run to ensure change detection
    this.zone.run(() => {
      if (invalidFiles.length > 0) {
        alert(`${this.i18n.translate('modal_alertFormat')}\n${invalidFiles.join('\n')}`)
      }

      if (tooLongAudioFiles.length > 0) {
        alert(`${this.i18n.translate('modal_alertAudioTooLong')}\n${tooLongAudioFiles.join('\n')}`)
      }

      // Add valid files to the list (max 50 files)
      const remainingSlots = 50 - this.uploadedFiles.length
      const filesToAdd = validFiles.slice(0, remainingSlots)
      this.uploadedFiles = [...this.uploadedFiles, ...filesToAdd]

      if (validFiles.length > remainingSlots) {
        alert(`${remainingSlots} ${this.i18n.translate('modal_alertFileNum')}`)
      }

      // Manually trigger change detection
      this.cdr.detectChanges()
    })
  }

  private isValidFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    return this.allowedExtensions.includes(extension)
  }

  private isAudioFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    return this.audioExtensions.includes(extension)
  }

  private getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const objectUrl = URL.createObjectURL(file)
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl)
        resolve(audio.duration)
      })
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Failed to load audio file'))
      })
      
      audio.src = objectUrl
    })
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'txt'
  }

  showPasteTextArea() {
    // Prevent showing paste area if uploading
    if (this.isUploading) {
      return
    }
    this.showPasteArea = true
  }

  cancelPaste() {
    // Prevent canceling paste if uploading
    if (this.isUploading) {
      return
    }
    this.showPasteArea = false
    this.pastedText = ''
    this.pastedFileName = ''
  }

  addPastedText() {
    if (!this.pastedText || !this.pastedFileName || this.isUploading) {
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
      alert(this.i18n.translate('modal_alertFileExists'))
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
    // Prevent removing files if uploading
    if (this.isUploading) {
      return
    }
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
      case 'wav':
      case 'mp3':
        return 'audio_file'
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
    if (this.uploadedFiles.length === 0 || this.isUploading) {
      return
    }

    // Set loading state
    this.isUploading = true

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
      // Create a FileList-like object for saving them locally
      const fileList = this.createFileList()
      
      // Notify parent component
      this.notebookService.uploadFiles(fileList).subscribe(() => {
        console.log('Local files uploaded');
      })
      await this.callBackend(formData)
      await this.createChat()
      this.filesUploaded.emit(fileList)
      this.resetModal()
      this.close.emit()

    } catch (error) {
      console.error('Upload failed:', error)
      alert(this.i18n.translate('modal_alertUploadFailed'))
    } finally {
      // Always reset loading state
      this.isUploading = false
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
    // Tell the notebook service to do the upload
    const response = await firstValueFrom(
      this.notebookService.uploadFilesToBackend(notebookId, formData)
    );
    this.notebookService.updateLocalNotebook(response.id, response.title, response.description, response.summary)
    this.notebookService.updateLocalSourcesIds(response.file_ids)
  }

  private async createChat(): Promise<void> {
    const notebookId = this.notebookService.getCurrentNotebook()?.id;
    if (!notebookId) {
      throw new Error('No notebook selected');
    }
    
    // Tell the notebook service to do the upload
    await this.chatService.createNewChat(notebookId)
  }

  private resetModal() {
    this.uploadedFiles = []
    this.showPasteArea = false
    this.pastedText = ''
    this.pastedFileName = ''
    this.isDragOver = false
    this.isUploading = false
  }
}
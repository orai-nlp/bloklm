export interface Source {
  id: string
  name: string
  type: "pdf" | "txt" | "doc" | "docx" | "srt"
  size: number
  uploadedAt: Date
  selected: boolean
}
export interface Source {
  id: string
  name: string
  type: "pdf" | "txt" | "doc" | "docx" | "srt" | string
  size: number
}

export interface BackendSource {
  id: string
  name: string
  format: "PDF" | "TXT" | "DOC" | "DOCX" | "SRT"
  charNum: number
}
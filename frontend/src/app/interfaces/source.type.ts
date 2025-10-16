export interface Source {
  id: string
  name: string
  type: "pdf" | "txt" | "doc" | "docx" | "srt" | "wav" | "mp3" | string
  size: number
  selected: true
}

export interface BackendSource {
  id: string
  name: string
  format: "PDF" | "TXT" | "DOC" | "DOCX" | "SRT" | "WAV" | "MP3"
  charNum: number
  text?: string
}
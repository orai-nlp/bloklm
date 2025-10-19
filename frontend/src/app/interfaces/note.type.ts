export interface Note {
  id: string;
  name: string;
  content: string;
  type: string;
  status: number; // Changed from boolean to number (0, 1, or 2)
  created_at?: Date;  // Optional: for displaying time left
  contained_file_ids: string[];
  audioData?: Uint8Array; // podcast audio bytes
  audioUrl?: string; // blob URL to play audio
}

export interface NoteTemplate {
  icon: string;
  labelKey: string;
  parameters: string[]; // Which parameters this note type needs
  color: string;
}

export interface NoteParameters {
  formality?: number;
  style?: string;
  detail?: number;
  language_complexity?: number;
  podcast_type?: string;
}
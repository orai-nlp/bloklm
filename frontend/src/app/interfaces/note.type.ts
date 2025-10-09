export interface Note {
  id: string;
  name: string;
  content: string;
  type: string;
  status_ready: boolean | undefined; // Add this optional property for loading state
  created_at?: Date;  // Optional: for displaying time left
  contained_file_ids: string[];
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
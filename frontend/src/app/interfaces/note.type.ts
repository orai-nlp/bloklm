export interface Note {
  id: string;
  name: string;
  content: string;
  type: string;
  isLoading?: boolean; // Add this optional property for loading state
}

export interface NoteTemplate {
  icon: string;
  labelKey: string;
  parameters: string[]; // Which parameters this note type needs
}

export interface NoteParameters {
  formality?: number;
  style?: string;
  detail?: number;
  language_complexity?: number;
  podcast_type?: string;
}
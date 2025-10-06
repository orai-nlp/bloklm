export interface Note {
  id: string;
  name: string;
  content: string;
  type: string;
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
export interface Note {
  id: string;
  name: string;
  content: string;
  type: string;
  status_ready: boolean | undefined; // Add this optional property for loading state
  estimatedTime?: number;  // Optional: for displaying time left

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
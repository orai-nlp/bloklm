export interface Notebook {
  id: string
  title: string
  description?: string
  summary?: string
  createdAt: Date
  updatedAt: Date
  sourceCount: number
  icon?: string
}

export interface BackendNotebook {
  id: number;          // number in backend
  name: string;        // becomes notebook title
  title:string;         // For chat title
  summary: string;      // summary of notebook files
  c_date: string;        // ISO date string
  u_date: string;        // ISO date string
  fitxategia_count: number; // becomes sourceCount
};
export interface Notebook {
  id: string
  title: string
  description?: string
  createdAt: Date
  updatedAt: Date
  sourceCount: number
  icon?: string
}

export interface BackendNotebook {
  id: number;          // number in backend
  name: string;        // becomes title
  c_date: string;        // ISO date string
  u_date: string;        // ISO date string
  fitxategia_count: number; // becomes sourceCount
};
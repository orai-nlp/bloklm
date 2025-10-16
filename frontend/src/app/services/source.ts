import { inject, Injectable } from '@angular/core';
import { BackendSource, Source } from '../interfaces/source.type';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { NotebookService } from './notebook';


@Injectable({
  providedIn: 'root'
})
export class SourceService {
    private sourceSubject = new BehaviorSubject<Source | undefined>(undefined);
    public source$ = this.sourceSubject.asObservable();
    public text: string | undefined = undefined;
    public chunk_text: string | undefined = undefined;
    public offset: number | undefined = undefined;
    public isChunkMode: boolean = false;  
    private http = inject(HttpClient)
    private notebookService = inject(NotebookService)
  
    open(source: Source) {
      this.isChunkMode = false;  
      this.call_backend('fitxategia', 'GET', { id: source.id }, undefined)
        .subscribe({
          next: (res:any) => {
            this.text = res?.text ?? undefined;
            console.log('fitxategia jasota backendetik:', res);
            this.sourceSubject.next(source);
          },
          error: (err) => {
            console.error('fitxategia error', err);
        },
      });      
    }
  
    close() {
      this.sourceSubject.next(undefined);
      this.text = undefined
      this.offset = undefined
      this.chunk_text = undefined
      this.isChunkMode = false;  
    }

    openFromChunk(file_id:string, file_text:string, offset:number, text:string) {
      const file = this.notebookService.getSources().find(elem => elem.id == file_id)
      this.text = file_text
      this.offset = offset
      this.chunk_text = text
      this.isChunkMode = true;
      
      this.sourceSubject.next(file);
    }

    private call_backend<T>(
      id: string,
      method: 'GET' | 'POST',
      args_get?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>,
      args_post?: Record<string, string | number | boolean | readonly (string | number | boolean)[] | FormDataEntryValue | null> | FormData
    ): Observable<T> {
      const url = `${environment.apiBaseUrl}/${id}`;
  
      switch (method) {
        case 'GET':
          return this.http.get<T>(url, { params: args_get });
        case 'POST':
          return this.http.post<T>(url, args_post);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    }
}

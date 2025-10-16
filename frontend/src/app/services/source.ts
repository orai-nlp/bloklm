import { inject, Injectable } from '@angular/core';
import { BackendSource, Source } from '../interfaces/source.type';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class SourceService {
    private sourceSubject = new BehaviorSubject<Source | null>(null);
    public source$ = this.sourceSubject.asObservable();
    public text: string = '';
    private http = inject(HttpClient)
  
    async open(source: Source) {
      this.call_backend('fitxategia', 'GET', { id: source.id }, undefined)
        .subscribe({
          next: (res:any) => {
            this.text = res?.text ?? '';
            console.log('fitxategia jasota backendetik:', res);
            this.sourceSubject.next(source);
          },
          error: (err) => {
            // handle error
            console.error('fitxategia error', err);
        },
      });      
    }
  
    close() {
      this.sourceSubject.next(null);
      this.text = ''
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

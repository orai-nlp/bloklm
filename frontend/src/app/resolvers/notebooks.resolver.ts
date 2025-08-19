import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { NotebookService } from '../services/notebook';

export const notebooksResolver: ResolveFn<void> = async () => {
  const svc = inject(NotebookService);
  await svc.whenReady();   // waits for the HTTP call
};
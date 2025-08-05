import { TestBed } from '@angular/core/testing';

import { NotebookService } from './notebook';

describe('Notebook', () => {
  let service: NotebookService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotebookService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

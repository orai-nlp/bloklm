import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileModalComponent } from './file-modal';

describe('FileModalComponent', () => {
  let component: FileModalComponent;
  let fixture: ComponentFixture<FileModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

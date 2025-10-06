import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Studio } from './studio';

describe('Studio', () => {
  let component: Studio;
  let fixture: ComponentFixture<Studio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Studio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Studio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

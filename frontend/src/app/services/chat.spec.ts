import { TestBed } from '@angular/core/testing';
import { ChatComponent } from '../components/chat/chat';

describe('Chat', () => {
  let service: ChatComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatComponent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

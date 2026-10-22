import { TestBed } from '@angular/core/testing';
import { AdminService } from './admin.service';

describe('AdminService (receipt review)', () => {
  let service: AdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminService);
  });

  it('approving a receipt removes it from the review queue', () => {
    const before = service.pendingCount();
    service.approve('p1');
    expect(service.pendingCount()).toBe(before - 1);
    expect(service.payments().find((p) => p.id === 'p1')?.status).toBe('approved');
  });

  it('rejecting keeps the note for the student', () => {
    service.reject('p2', 'Amount doesn’t match');
    const p = service.payments().find((x) => x.id === 'p2');
    expect(p?.status).toBe('rejected');
    expect(p?.note).toBe('Amount doesn’t match');
  });
});

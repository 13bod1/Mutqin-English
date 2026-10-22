import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { CommerceService, EG_PHONE, normalizePhone } from './commerce.service';

describe('CommerceService (access & pricing)', () => {
  let service: CommerceService;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommerceService);
    auth = TestBed.inject(AuthService);
  });

  it('lets anyone watch free items', () => {
    auth.user.set(null);
    expect(service.canAccess({ type: 'free' }, 'lecture', 'x')).toBeTrue();
  });

  it('requires an account for included items', () => {
    auth.user.set(null);
    expect(service.canAccess({ type: 'included' }, 'lecture', 'x')).toBeFalse();
    auth.user.set({ fullName: 'Omar Tarek', email: 'o@example.com' });
    expect(service.canAccess({ type: 'included' }, 'lecture', 'x')).toBeTrue();
  });

  it('requires a purchase for paid items', () => {
    auth.user.set({ fullName: 'Omar Tarek', email: 'o@example.com' });
    expect(service.canAccess({ type: 'paid', priceEgp: 350 }, 'live', 'exam-night')).toBeFalse();
    expect(service.canAccess({ type: 'paid', priceEgp: 350 }, 'live', 'advanced-grammar')).toBeTrue();
  });

  it('builds an order summary only for paid items', (done) => {
    service.getPurchasable('live', 'exam-night').subscribe((item) => {
      expect(item?.priceEgp).toBe(350);
      service.getPurchasable('live', 'phrasal-verbs').subscribe((included) => {
        expect(included).toBeNull();
        done();
      });
    });
  });

  it('validates Egyptian mobile numbers', () => {
    expect(EG_PHONE.test(normalizePhone('010 1234 5678'))).toBeTrue();
    expect(EG_PHONE.test(normalizePhone('+20 11 2345 6789'))).toBeTrue();
    expect(EG_PHONE.test(normalizePhone('013 1234 5678'))).toBeFalse();
  });
});

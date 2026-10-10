import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupabaseService],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created and expose client getters', () => {
    expect(service).toBeTruthy();
    expect(service.client).toBeTruthy();
    expect(service.auth).toBeTruthy();
    expect(service.storage).toBeTruthy();
    expect(service.from('lectures')).toBeTruthy();
  });

  it('should generate storage public url', () => {
    const url = service.getStoragePublicUrl('avatars', 'user1.png');
    expect(url).toContain('avatars/user1.png');
  });
});

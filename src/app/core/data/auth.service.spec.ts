import { TestBed } from '@angular/core/testing';
import { AuthService, LoginRequest, SignupRequest } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AuthService', () => {
  let service: AuthService;
  let supabaseMock: any;

  beforeEach(() => {
    localStorage.removeItem('mutqin_auth_user');

    supabaseMock = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ data: { user: null } })),
        onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: jasmine.createSpy('signInWithPassword').and.returnValue(
          Promise.resolve({
            data: { user: { id: 'test_id', email: 'test@example.com', user_metadata: { full_name: 'Test Student', stage: 'sec3' } }, session: { user: { id: 'test_id' }, access_token: 'synthetic-test-access', refresh_token: 'synthetic-test-refresh', token_type: 'bearer', expires_in: 3600 } },
            error: null,
          })
        ),
        signUp: jasmine.createSpy('signUp').and.returnValue(
          Promise.resolve({
            data: { user: { id: 'new_id', email: 'new@example.com' }, session: { user: { id: 'new_id' }, access_token: 'synthetic-signup-access', refresh_token: 'synthetic-signup-refresh', token_type: 'bearer', expires_in: 3600 } },
            error: null,
          })
        ),
        signInWithOAuth: jasmine.createSpy('signInWithOAuth').and.returnValue(Promise.resolve({ data: { url: 'https://oauth.url' }, error: null })),
        signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve({ error: null })),
      },
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(Promise.resolve({ data: null, error: null })),
          }),
        }),
        upsert: jasmine.createSpy('upsert').and.returnValue(Promise.resolve({ data: null, error: null })),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.removeItem('mutqin_auth_user');
    localStorage.removeItem('mutqin_student_accounts');
    localStorage.removeItem('mutqin_student_logins');
  });

  it('should be created and start with null user if no storage', () => {
    expect(service).toBeTruthy();
  });

  it('should handle login successfully', (done) => {
    const req: LoginRequest = { email: 'student@example.com', password: 'password123', remember: true };
    service.login(req).subscribe({
      next: (user) => {
        expect(user).toBeTruthy();
        expect(service.user()).toBeTruthy();
        expect(service.user()?.email).toBe('test@example.com');
        done();
      },
    });
  });

  it('should reject login on Supabase auth error and not fallback to demo user', (done) => {
    supabaseMock.auth.signInWithPassword.and.returnValue(Promise.resolve({ data: { user: null }, error: new Error('Invalid login credentials') }));

    const req: LoginRequest = { email: 'unregistered@example.com', password: 'password123', remember: true };
    service.login(req).subscribe({
      next: () => {
        fail('should have failed login');
      },
      error: (err) => {
        expect(err).toBeTruthy();
        expect(service.user()).toBeNull();
        done();
      },
    });
  });

  it('should throw error on invalid credentials', (done) => {
    supabaseMock.auth.signInWithPassword.and.returnValue(Promise.resolve({ data: { user: null }, error: new Error('Invalid login credentials') }));

    const req: LoginRequest = { email: 'user@example.com', password: 'wrongpass', remember: false };
    service.login(req).subscribe({
      error: (err) => {
        expect(err.message).toBe('Invalid login credentials');
        done();
      },
    });
  });

  it('should signup a new user', (done) => {
    const req: SignupRequest = {
      fullName: 'Ahmed Ali',
      stage: 'sec3',
      email: 'ahmed@example.com',
      password: 'password123',
    };

    service.signup(req).subscribe({
      next: (user) => {
        expect(user.fullName).toBe('Ahmed Ali');
        expect(user.initials).toBe('AA');
        expect(service.user()?.fullName).toBe('Ahmed Ali');
        done();
      },
    });
  });

  it('rejects a successful-looking login without a session', (done) => {
    supabaseMock.auth.signInWithPassword.and.returnValue(Promise.resolve({ data: { user: { id: 'test_id', email: 'test@example.com' }, session: null }, error: null }));
    service.login({ email: 'test@example.com', password: 'synthetic', remember: false }).subscribe({
      next: () => { fail('Sessionless login must not authenticate'); done(); },
      error: () => { expect(service.user()).toBeNull(); done(); },
    });
  });

  it('rejects a login session belonging to a different user', (done) => {
    supabaseMock.auth.signInWithPassword.and.returnValue(Promise.resolve({ data: { user: { id: 'test_id' }, session: { user: { id: 'other_id' } } }, error: null }));
    service.login({ email: 'test@example.com', password: 'synthetic', remember: false }).subscribe({
      next: () => { fail('Mismatched identity must not authenticate'); done(); },
      error: () => { expect(service.user()).toBeNull(); done(); },
    });
  });

  it('keeps email-confirmation signup unauthenticated without a session', (done) => {
    supabaseMock.auth.signUp.and.returnValue(Promise.resolve({ data: { user: { id: 'pending_id' }, session: null }, error: null }));
    service.signup({ fullName: 'Synthetic Learner', stage: 'sec3', email: 'synthetic@example.invalid', password: 'synthetic-password' }).subscribe({
      next: () => { expect(service.user()).toBeNull(); expect(supabaseMock.from).not.toHaveBeenCalledWith('profiles'); done(); },
      error: (error) => { fail(error); done(); },
    });
  });

  it('should logout user and clear state', async () => {
    service.user.set({ fullName: 'Demo User', email: 'demo@example.com', initials: 'DU' });
    expect(service.user()).toBeTruthy();

    await service.logout();

    expect(service.user()).toBeNull();
    expect(localStorage.getItem('mutqin_auth_user')).toBeNull();
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginPage } from './login.page';
import { AuthService } from '../../core/data/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authMock: any;
  let router: Router;

  beforeEach(async () => {
    authMock = {
      login: jasmine.createSpy('login').and.returnValue(of({ fullName: 'Student', email: 'test@example.com' })),
      continueWithGoogle: jasmine.createSpy('continueWithGoogle').and.returnValue(Promise.resolve()),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
  });

  it('should create LoginPage', () => {
    expect(component).toBeTruthy();
  });

  it('should mark controls as touched on invalid submit', () => {
    (component as any).submit();
    expect((component as any).form.invalid).toBeTrue();
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it('should submit valid credentials and navigate to progress', () => {
    (component as any).form.controls.email.setValue('student@example.com');
    (component as any).form.controls.password.setValue('password123');

    (component as any).submit();

    expect(authMock.login).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password123',
      remember: true,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/progress');
  });

  it('should show authError on failed login', () => {
    authMock.login.and.returnValue(throwError(() => new Error('invalid_credentials')));

    (component as any).form.controls.email.setValue('student@example.com');
    (component as any).form.controls.password.setValue('wrongpass');

    (component as any).submit();

    expect((component as any).authError()).toBeTrue();
  });

  it('should trigger Google OAuth on google() call', () => {
    (component as any).google();
    expect(authMock.continueWithGoogle).toHaveBeenCalled();
  });
});

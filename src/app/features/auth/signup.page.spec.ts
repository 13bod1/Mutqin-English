import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { SignupPage } from './signup.page';
import { AuthService } from '../../core/data/auth.service';

describe('SignupPage', () => {
  let component: SignupPage;
  let fixture: ComponentFixture<SignupPage>;
  let authMock: any;
  let router: Router;

  beforeEach(async () => {
    authMock = {
      signup: jasmine.createSpy('signup').and.returnValue(of({ fullName: 'Adel Mostafa', email: 'adel@example.com' })),
      continueWithGoogle: jasmine.createSpy('continueWithGoogle').and.returnValue(Promise.resolve()),
    };

    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    fixture = TestBed.createComponent(SignupPage);
    component = fixture.componentInstance;
  });

  it('should create SignupPage', () => {
    expect(component).toBeTruthy();
  });

  it('should reject invalid form submit', () => {
    (component as any).submit();
    expect((component as any).form.invalid).toBeTrue();
    expect(authMock.signup).not.toHaveBeenCalled();
  });

  it('should validate matching passwords and strong password rule', () => {
    const form = (component as any).form;
    form.controls.fullName.setValue('Adel Mostafa');
    form.controls.stage.setValue('sec3');
    form.controls.email.setValue('adel@example.com');
    form.controls.password.setValue('StrongP@ss1');
    form.controls.confirm.setValue('StrongP@ss1');
    form.controls.terms.setValue(true);

    expect(form.valid).toBeTrue();

    (component as any).submit();

    expect(authMock.signup).toHaveBeenCalledWith({
      fullName: 'Adel Mostafa',
      stage: 'sec3',
      email: 'adel@example.com',
      password: 'StrongP@ss1',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/progress');
  });
});

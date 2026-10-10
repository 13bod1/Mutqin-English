import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { LanguageService } from '../../core/i18n/language.service';
import { AuthService } from '../../core/data/auth.service';
import { signal } from '@angular/core';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authMock: any;

  beforeEach(async () => {
    authMock = {
      user: signal(null),
      logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve()),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        LanguageService,
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  it('should render header with navigation links for guest', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('nav a');
    expect(navLinks.length).toBeGreaterThan(0);
  });

  it('should render user avatar when logged in', () => {
    authMock.user.set({ fullName: 'Adel Mostafa', email: 'adel@example.com', initials: 'AM', stage: 'sec3' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('AM');
  });
});

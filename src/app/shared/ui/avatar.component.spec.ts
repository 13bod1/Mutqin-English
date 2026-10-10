import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let component: AvatarComponent;
  let fixture: ComponentFixture<AvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  it('should render initials when src is not provided', () => {
    fixture.componentRef.setInput('name', 'Adel Mostafa');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const span = compiled.querySelector('span');
    expect(span).toBeTruthy();
    expect(span?.textContent?.trim()).toBe('AM');
  });

  it('should render single initial for single name', () => {
    fixture.componentRef.setInput('name', 'Mustafa');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const span = compiled.querySelector('span');
    expect(span?.textContent?.trim()).toBe('M');
  });

  it('should render img tag when src is provided', () => {
    fixture.componentRef.setInput('name', 'Adel Mostafa');
    fixture.componentRef.setInput('src', 'https://example.com/photo.jpg');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.jpg');
    expect(img?.getAttribute('alt')).toBe('Adel Mostafa');
  });
});

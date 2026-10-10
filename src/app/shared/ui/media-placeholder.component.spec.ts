import { ComponentFixture, TestBed } from '@angular/core';
import { MediaComponent } from './media-placeholder.component';

describe('MediaComponent', () => {
  let fixture: ComponentFixture<MediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaComponent);
  });

  it('should render image when src is provided', () => {
    fixture.componentRef.setInput('src', 'https://example.com/thumb.jpg');
    fixture.componentRef.setInput('alt', 'Lecture thumbnail');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/thumb.jpg');
    expect(img?.getAttribute('alt')).toBe('Lecture thumbnail');
  });

  it('should render fallback placeholder when src is absent', () => {
    fixture.componentRef.setInput('label', 'Intro Video');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('img')).toBeFalsy();
    expect(compiled.querySelector('span')?.textContent).toContain('Intro Video');
  });
});

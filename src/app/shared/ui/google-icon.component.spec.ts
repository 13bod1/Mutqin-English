import { ComponentFixture, TestBed } from '@angular/core';
import { GoogleIconComponent } from './google-icon.component';

describe('GoogleIconComponent', () => {
  let fixture: ComponentFixture<GoogleIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GoogleIconComponent);
  });

  it('should render SVG element', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('svg')).toBeTruthy();
  });
});

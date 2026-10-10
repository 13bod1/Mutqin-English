import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionHeaderComponent } from './section-header.component';

describe('SectionHeaderComponent', () => {
  let fixture: ComponentFixture<SectionHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionHeaderComponent);
  });

  it('should render title, eyebrow, and subtitle', () => {
    fixture.componentRef.setInput('title', 'Featured Lectures');
    fixture.componentRef.setInput('eyebrow', 'LEARN MORE');
    fixture.componentRef.setInput('subtitle', 'Explore top lessons');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Featured Lectures');
    expect(compiled.querySelector('p.eyebrow')?.textContent).toContain('LEARN MORE');
    expect(compiled.querySelector('p.text-base')?.textContent).toContain('Explore top lessons');
  });
});

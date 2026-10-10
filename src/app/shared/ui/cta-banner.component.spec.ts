import { ComponentFixture, TestBed } from '@angular/core';
import { CtaBannerComponent } from './cta-banner.component';

describe('CtaBannerComponent', () => {
  let component: CtaBannerComponent;
  let fixture: ComponentFixture<CtaBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CtaBannerComponent);
    component = fixture.componentInstance;
  });

  it('should render title and text', () => {
    fixture.componentRef.setInput('title', 'Ready to Master English?');
    fixture.componentRef.setInput('text', 'Join thousands of students today.');
    fixture.componentRef.setInput('eyebrow', 'START TODAY');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Ready to Master English?');
    expect(compiled.querySelector('p.text-base')?.textContent).toContain('Join thousands of students today.');
  });
});

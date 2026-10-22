import { TestBed } from '@angular/core/testing';
import { AccessEditorComponent } from './access-editor.component';

describe('AccessEditorComponent', () => {
  it('switching to paid applies the default price', () => {
    const f = TestBed.createComponent(AccessEditorComponent);
    f.componentRef.setInput('value', { type: 'included' });
    f.componentRef.setInput('defaultPrice', 150);
    f.detectChanges();
    const buttons = f.nativeElement.querySelectorAll('button[role="radio"]') as NodeListOf<HTMLButtonElement>;
    buttons[2].click();
    expect(f.componentInstance.value()).toEqual({ type: 'paid', priceEgp: 150 });
  });
});

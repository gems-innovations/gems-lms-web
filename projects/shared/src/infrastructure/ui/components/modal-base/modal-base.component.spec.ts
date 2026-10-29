import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalBaseComponent } from './modal-base.component';

@Component({
  imports: [ModalBaseComponent],
  template: `<button id="opener" (click)="open.set(true)">Abrir</button>
    <lib-modal-base [isOpen]="open()" title="Prueba" (close)="open.set(false)" />`,
})
class HostComponent { open = signal(false); }

describe('ModalBaseComponent', () => {
  it('moves focus into the dialog, closes on Escape and gives focus back to the opener', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();

    opener.click();
    await fixture.whenStable();
    const overlay = fixture.nativeElement.querySelector('.modal-overlay') as HTMLElement;
    expect(document.activeElement).toBe(overlay);

    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.modal-overlay')).toBeNull();
    expect(document.activeElement).toBe(opener);
    fixture.nativeElement.remove();
  });
});

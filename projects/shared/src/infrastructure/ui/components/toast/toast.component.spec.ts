import { TestBed } from '@angular/core/testing';
import { ToastComponent, ToastType } from './toast.component';

describe('ToastComponent', () => {
  function render(type: ToastType) {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.componentRef.setInput('message', 'Guardado');
    fixture.componentRef.setInput('type', type);
    fixture.detectChanges();
    return fixture;
  }

  it('draws its own SVG icon for each type, with the role that fits', () => {
    const paths: Record<ToastType, string> = {
      success: 'm16 9-5.5 5.5L8 12',
      error: 'm15 9-6 6',
      warning: 'M12 9v4',
      info: 'M12 16v-4'
    };
    for (const type of Object.keys(paths) as ToastType[]) {
      const el: HTMLElement = render(type).nativeElement;
      const icon = el.querySelector('.toast__icon svg')!;
      expect(icon.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(icon.querySelector('path')!.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(Array.from(icon.querySelectorAll('path')).some(p => p.getAttribute('d') === paths[type])).toBeTrue();
      expect(el.querySelector('.toast')!.getAttribute('role')).toBe(type === 'error' ? 'alert' : 'status');
    }
  });

  it('emits close from the close button', () => {
    const fixture = render('info');
    let closed = 0;
    fixture.componentInstance.close.subscribe(() => closed++);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.toast__close')!.click();
    expect(closed).toBe(1);
  });
});

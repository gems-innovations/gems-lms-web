import { Directive, ElementRef, inject, afterNextRender } from '@angular/core';

/**
 * Enfoca el elemento host en cuanto se renderiza. Útil para inputs que
 * aparecen dentro de un @if (agregar módulo/lección, etc.).
 */
@Directive({
  selector: '[libAutofocus]',
  standalone: true,
})
export class AutofocusDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
      if (node && typeof node.focus === 'function') node.focus();
    });
  }
}

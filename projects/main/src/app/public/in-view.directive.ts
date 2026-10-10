import { DestroyRef, Directive, ElementRef, afterNextRender, inject, output } from '@angular/core';

@Directive({ selector: '[gemsInView]' })
export class InViewDirective {
  readonly inView = output<boolean>();

  constructor() {
    const el = inject<ElementRef<Element>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(([entry]) => this.inView.emit(entry.isIntersecting));
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

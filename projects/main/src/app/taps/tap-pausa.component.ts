import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';

/**
 * Pausa sana (auditoria-permanencia.md, mejora 11; competencia-y-recompensas.md §6.3). Tras 20 Taps o 30 minutos, una hoja
 * inferior amable sugiere un descanso con un resumen de lo logrado. Sin culpa, sin cuenta atrás y sin bloquear: «Seguir
 * jugando» y «Tomar un descanso» pesan lo mismo, y seguir cierra en un toque (también Esc o tocar fuera). El foco empieza en
 * el título. Sale una sola vez por sesión (tiempo activo, taps.sesion.ts) y nunca en la portada.
 */
@Component({
  selector: 'gems-tap-pausa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="pausa" #hoja (close)="cerrar.emit(descansando())" (click)="$event.target === hoja && hoja.close()" aria-labelledby="taps-pausa-t" aria-describedby="taps-pausa-d">
      <div class="pausa__body">
        <svg class="pausa__icono" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
          <path d="M10 20h24v8a12 12 0 0 1-24 0v-8Z" fill="#4de1ff"/>
          <path d="M34 22h3a5 5 0 0 1 0 10h-4" fill="none" stroke="#4de1ff" stroke-width="3" stroke-linecap="round"/>
          <path d="M17 8c-2 3 2 5 0 8M24 6c-2 3 2 5 0 8M31 8c-2 3 2 5 0 8" fill="none" stroke="#aab4c4" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M8 42h28" stroke="#aab4c4" stroke-width="3" stroke-linecap="round"/>
        </svg>
        @if (!descansando()) {
          <h2 id="taps-pausa-t" class="pausa__titulo" tabindex="-1" #titulo>¿Un descanso?</h2>
          <p id="taps-pausa-d" class="pausa__texto">{{ resumen() }} Vas muy bien. Si quieres, estira las piernas o toma agua: todo queda guardado.</p>
          <div class="pausa__botones">
            <button type="button" class="pausa__btn" (click)="hoja.close()">Seguir jugando</button>
            <button type="button" class="pausa__btn" (click)="descansar()">Tomar un descanso</button>
          </div>
        } @else {
          <h2 id="taps-pausa-t" class="pausa__titulo" tabindex="-1" #titulo>Buen descanso</h2>
          <p id="taps-pausa-d" class="pausa__texto">Tu racha, tus colecciones y el reto del día quedan guardados en este navegador. Aquí te esperamos.</p>
          <div class="pausa__botones"><button type="button" class="pausa__btn" (click)="hoja.close()">Volver a jugar</button></div>
        }
      </div>
    </dialog>
  `,
  styles: `
    :host { --safe-b: max(12px, calc(env(safe-area-inset-bottom) + 8px)); font-family: var(--font-texto, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif); }
    .pausa { width: 100%; max-width: 480px; margin: auto auto 0; padding: 0; border: 0; border-radius: 22px 22px 0 0; color: #fff; background: #161b24;
      &::backdrop { background: rgba(0, 0, 0, .45); }
      &[open] { animation: pausa-in .3s cubic-bezier(.2, 1.1, .4, 1); } }
    .pausa__body { display: grid; justify-items: center; gap: 10px; padding: 18px 16px var(--safe-b); text-align: center; }
    .pausa__titulo { margin: 0; font-size: 20px; outline: none; }
    .pausa__texto { margin: 0 0 4px; font-size: 15px; line-height: 1.45; color: #c8d1de; }
    /* Seguir y descansar pesan lo mismo: ninguna opción empuja a la otra. */
    .pausa__botones { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 10px; width: 100%; }
    .pausa__btn { min-height: 50px; padding: 6px 10px; border-radius: 14px; font: inherit; font-weight: 800; cursor: pointer; color: #fff;
      background: rgba(255, 255, 255, .08); border: 1.5px solid rgba(255, 255, 255, .3); }
    button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @media (min-width: 768px) { .pausa { margin: auto; border-radius: 22px; } }
    @keyframes pausa-in { from { transform: translateY(100%); } }
    @media (prefers-reduced-motion: reduce) { .pausa[open] { animation: none; } }
  `,
})
export class TapPausaComponent {
  /** «Hoy: 20 Taps, 3 insignias y racha de 4 días.» */
  readonly resumen = input('');
  /** Se cerró: true si la persona eligió descansar. */
  readonly cerrar = output<boolean>();
  readonly descanso = output<void>();
  protected readonly descansando = signal(false);
  private readonly hoja = viewChild.required<ElementRef<HTMLDialogElement>>('hoja');
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly injector = inject(Injector);

  constructor() {
    // El foco empieza en el título (se lee la propuesta antes que los botones) y no en «Seguir jugando».
    afterNextRender(() => { const d = this.hoja().nativeElement; if (!d.open) d.showModal?.(); this.titulo()?.nativeElement.focus(); });
  }

  protected descansar(): void {
    this.descansando.set(true);
    this.descanso.emit();
    afterNextRender(() => this.titulo()?.nativeElement.focus(), { injector: this.injector });   // el nuevo título «Buen descanso»
  }
}

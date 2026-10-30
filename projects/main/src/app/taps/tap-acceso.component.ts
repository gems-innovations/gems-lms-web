import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Hoja «Inicia sesión para dar me gusta y comentar» (decisión del dueño, 29-oct: me gusta y comentarios solo con sesión).
 * Se abre al tocar el corazón o los comentarios sin sesión. Las dos salidas llevan a /auth/signin con `volver` (al entrar se
 * regresa al Tap); la cuenta nueva se crea con Google en esa misma pantalla. Se monta con @if y se abre sola.
 */
@Component({
  selector: 'gems-tap-acceso',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #d class="hoja" aria-labelledby="acceso-h" aria-describedby="acceso-p" (close)="cerrar.emit()" (click)="fuera($event)"
            (keydown)="$event.stopPropagation()" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()">
      <div class="hoja__caja">
        <span class="hoja__asa" aria-hidden="true"></span>
        <svg class="acceso__dibujo" viewBox="0 0 64 40" width="72" height="45" aria-hidden="true">
          <path d="M20 34s-13-7.6-16-15.4C2 13 5.6 7.6 11.4 7.6c3.4 0 6.2 1.9 8.6 5 2.4-3.1 5.2-5 8.6-5 5.8 0 9.4 5.4 7.2 11C33 26.4 20 34 20 34z" fill="#ff3b5c"/>
          <path d="M38 8h20a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-9l-7 6v-6h-4a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#4de1ff"/>
          <path d="M42 15h12M42 21h8" stroke="#0d1117" stroke-width="2.6" stroke-linecap="round"/>
        </svg>
        <h2 class="hoja__h" id="acceso-h">Inicia sesión para dar me gusta y comentar</h2>
        <p class="hoja__p" id="acceso-p">Jugar y ver las vistas sigue siendo libre. Con tu cuenta, tus me gusta y comentarios quedan a tu nombre.</p>
        <a class="boton boton--p" routerLink="/auth/signin" [queryParams]="{ volver: volver() }">Iniciar sesión</a>
        <a class="boton" routerLink="/auth/signin" [queryParams]="{ volver: volver() }">Crear cuenta</a>
        <button type="button" class="hoja__no" (click)="d.close()">Ahora no</button>
      </div>
    </dialog>
  `,
  styleUrl: './tap-hoja.scss',
  styles: '.acceso__dibujo { align-self: center; margin: 4px 0 6px; } .hoja__h, .hoja__p { text-align: center; }',
})
export class TapAccesoComponent {
  /** Ruta a la que se vuelve al entrar (`/t/<id>` o la de Explorar). */
  readonly volver = input.required<string>();
  readonly cerrar = output<void>();
  private readonly d = viewChild.required<ElementRef<HTMLDialogElement>>('d');

  constructor() { afterNextRender(() => { const d = this.d().nativeElement; if (!d.open) d.showModal(); }); }

  /** Tocar fuera de la caja (el fondo) cierra. */
  protected fuera(e: MouseEvent): void { e.stopPropagation(); if (e.target === this.d().nativeElement) this.d().nativeElement.close(); }
}

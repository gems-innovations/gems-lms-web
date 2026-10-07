import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ICourseResult {
  finalTitle: string;
  finalScore: number;
  passingScore: number;
  passed: boolean;
  practiceAverage: number | null;
  practicesDone: number;
}

/**
 * Resultado final de un curso gratis (sin certificado): el puntaje del simulacro, si alcanzó el mínimo
 * y el promedio de sus prácticas. El puntaje es orientativo: no equivale al de ningún examen oficial.
 */
@Component({
  selector: 'edu-course-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cres__overlay" (click)="close.emit()"></div>
    <section class="cres" role="dialog" aria-modal="true" aria-labelledby="cres-title">
      <p class="cres__kicker">Terminaste el curso</p>
      <h2 id="cres-title" class="cres__title">{{ courseTitle() }}</h2>

      <div class="cres__score" [class.cres__score--ok]="result().passed">
        <span class="cres__number">{{ result().finalScore }}</span><span class="cres__of">/100</span>
      </div>
      <p class="cres__verdict">
        @if (result().passed) {
          <strong>¡Aprobaste!</strong> Superaste el mínimo de {{ result().passingScore }} puntos en la evaluación final.
        } @else {
          <strong>Te faltó poco.</strong> El mínimo para aprobar es {{ result().passingScore }}. Repasa las lecciones donde fallaste y vuelve a intentar la evaluación final: no hay límite de intentos.
        }
      </p>

      @if (result().practiceAverage !== null) {
        <dl class="cres__stats">
          <div><dt>Promedio en las otras prácticas</dt><dd>{{ result().practiceAverage }}/100</dd></div>
          <div><dt>Prácticas hechas</dt><dd>{{ result().practicesDone }}</dd></div>
        </dl>
      }

      <p class="cres__note">Es un puntaje de práctica, orientativo: no equivale al resultado de ningún examen oficial.</p>
      <button type="button" class="cres__btn" (click)="close.emit()">Seguir</button>
    </section>
  `,
  styles: [`
    .cres__overlay { position: fixed; inset: 0; z-index: 1000; background: var(--color-fondo-overlay, rgba(0,0,0,.6)); }
    .cres { position: fixed; z-index: 1001; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(440px, calc(100vw - 32px));
      max-height: calc(100vh - 32px); overflow: auto; padding: 28px 24px; border-radius: 18px; text-align: center;
      background: var(--color-superficie); border: 1px solid var(--color-borde-secundario); box-shadow: var(--sombra-xl); }
    .cres__kicker { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--color-texto-acento); }
    .cres__title { margin: 6px 0 18px; font: 800 20px/1.25 var(--font-titulo); color: var(--color-texto-principal); }
    .cres__score { display: inline-flex; align-items: baseline; gap: 2px; padding: 14px 26px; border-radius: 16px;
      color: var(--color-advertencia, #d97706); background: color-mix(in srgb, var(--color-advertencia, #d97706) 12%, transparent); }
    .cres__score--ok { color: var(--color-exito, #16a34a); background: color-mix(in srgb, var(--color-exito, #16a34a) 12%, transparent); }
    .cres__number { font: 800 48px/1 var(--font-titulo); }
    .cres__of { font-size: 18px; font-weight: 700; opacity: .8; }
    .cres__verdict { margin: 16px 0 0; line-height: 1.5; color: var(--color-texto-secundario); }
    .cres__verdict strong { color: var(--color-texto-principal); }
    .cres__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 18px 0 0; }
    .cres__stats div { padding: 10px; border-radius: 12px; background: var(--color-fondo-sutil, var(--color-tarjeta-hover)); }
    .cres__stats dt { font-size: 12px; color: var(--color-texto-terciario, var(--color-texto-secundario)); }
    .cres__stats dd { margin: 4px 0 0; font-weight: 800; color: var(--color-texto-principal); }
    .cres__note { margin: 16px 0 0; font-size: 12px; color: var(--color-texto-terciario, var(--color-texto-secundario)); }
    .cres__btn { width: 100%; margin-top: 18px; padding: 13px; border: 0; border-radius: 10px; font-weight: 700; cursor: pointer;
      background: var(--color-primario-accion); color: var(--color-sobre-primario); }
  `],
})
export class CourseResult {
  readonly result = input.required<ICourseResult>();
  readonly courseTitle = input('');
  readonly close = output<void>();
}

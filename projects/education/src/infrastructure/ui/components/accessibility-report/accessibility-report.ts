import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CountUpDirective } from 'shared';
import type { ICourse } from '../../../../domain/model/course.model';
import { auditCourseAccessibility } from '../../../../application/content-accessibility';

/** Revisión de accesibilidad del contenido de un curso, para quien lo edita. */
@Component({
  selector: 'edu-accessibility-report',
  imports: [CountUpDirective],
  template: `
    @if (report(); as r) {
      <section class="a11y" aria-labelledby="a11y-title">
        <header class="a11y__head">
          <div class="a11y__ring" [attr.data-level]="level()" role="img"
               [attr.aria-label]="'Accesibilidad del contenido: ' + r.score + ' de 100'">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="15.9" class="a11y__track" />
              <circle cx="18" cy="18" r="15.9" class="a11y__value" [attr.stroke-dasharray]="r.score + ' 100'" />
            </svg>
            <strong [libCountUp]="r.score"></strong>
          </div>
          <div>
            <h2 id="a11y-title" class="a11y__title">Accesibilidad del contenido</h2>
            <p class="a11y__sub">
              @if (r.issues.length === 0) {
                Los {{ r.blocks }} bloques del curso cumplen las comprobaciones: imágenes descritas, videos con subtítulos o transcripción y enlaces claros.
              } @else {
                {{ errors() }} {{ errors() === 1 ? 'problema importante' : 'problemas importantes' }} y {{ warnings() }} {{ warnings() === 1 ? 'mejora sugerida' : 'mejoras sugeridas' }} en {{ r.blocks }} bloques.
              }
            </p>
          </div>
          @if (r.issues.length) {
            <button type="button" class="a11y__toggle" [attr.aria-expanded]="open()" (click)="open.set(!open())">
              {{ open() ? 'Ocultar detalle' : 'Ver qué corregir' }}
            </button>
          }
        </header>

        @if (open()) {
          <ul class="a11y__list">
            @for (i of report()!.issues; track $index) {
              <li class="a11y__issue" [attr.data-severity]="i.severity">
                <span class="a11y__sev">{{ i.severity === 'error' ? 'Importante' : 'Sugerencia' }}</span>
                <div>
                  <strong>{{ i.message }}</strong>
                  <span class="a11y__where">{{ i.module }} › {{ i.lesson }} › {{ i.block }}</span>
                  <span class="a11y__fix">{{ i.fix }}</span>
                </div>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
  styleUrl: './accessibility-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilityReport {
  readonly course = input<ICourse | null>(null);

  protected readonly open = signal(false);
  protected readonly report = computed(() => { const c = this.course(); return c ? auditCourseAccessibility(c) : null; });
  protected readonly errors = computed(() => this.report()?.issues.filter(i => i.severity === 'error').length ?? 0);
  protected readonly warnings = computed(() => this.report()?.issues.filter(i => i.severity === 'warning').length ?? 0);
  protected readonly level = computed(() => {
    const s = this.report()?.score ?? 100;
    return s >= 90 ? 'good' : s >= 60 ? 'fair' : 'poor';
  });
}

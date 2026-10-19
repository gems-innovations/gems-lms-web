import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, input, output, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from 'shared/core';
import { EMPTY_STATE_ICONS, EmptyStateIcon } from './empty-state.icons';
import { EmptyStateCopy, EmptyStateKind } from './empty-states.copy';

/** Icono por defecto de cada tipo, cuando ni `icon` ni `copy` lo indican. */
const DEFAULT_ICON: Record<EmptyStateKind, EmptyStateIcon> = {
  'first-use': 'compass',
  'no-results': 'search',
  done: 'done',
  'no-access': 'lock',
  error: 'alert',
  info: 'inbox',
};

type RouterTarget = string | readonly unknown[];

let nextId = 0;

/**
 * Estado vacío informativo: qué es la sección, por qué está vacía y cuál es el siguiente paso.
 *
 *   <lib-empty-state [copy]="copy.student.myCourses" actionLink="/learn/catalog" secondaryLink="/taps" />
 *   <lib-empty-state [copy]="copy.common.noResults" (action)="clearFilters()" />
 *
 * Los textos salen de EMPTY_STATES (empty-states.copy.ts); `title`, `description`, `actionLabel`… los
 * sobrescriben. Todo texto pasa por I18nService. Guía: projects/shared/ESTADOS-VACIOS.md.
 */
@Component({
  selector: 'lib-empty-state',
  imports: [RouterLink],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lib-empty es',
    '[attr.data-kind]': 'resolvedKind()',
    '[class.es--sm]': "size() === 'sm'",
    '[class.es--framed]': 'framed()',
    '[attr.role]': 'role()',
    '[attr.aria-labelledby]': 'titleId',
    '[attr.aria-describedby]': 'resolvedDescription() ? descId : null',
  },
})
export class EmptyStateComponent {
  private readonly i18n = inject(I18nService);
  private readonly injector = inject(Injector);

  /** Textos y tipo desde el catálogo central. Cualquier input explícito tiene prioridad. */
  readonly copy = input<EmptyStateCopy | undefined>(undefined);
  readonly kind = input<EmptyStateKind | undefined>(undefined);
  readonly icon = input<EmptyStateIcon | undefined>(undefined);
  readonly title = input<string | undefined>(undefined);
  readonly description = input<string | undefined>(undefined);
  /** Valores para los marcadores {clave} de los textos. */
  readonly params = input<Record<string, string | number> | undefined>(undefined);

  /** Acción principal. `''` la oculta aunque el catálogo traiga una. Con `actionLink` se dibuja como enlace. */
  readonly actionLabel = input<string | undefined>(undefined);
  readonly actionLink = input<RouterTarget | undefined>(undefined);
  readonly actionQueryParams = input<Record<string, unknown> | undefined>(undefined);
  readonly secondaryLabel = input<string | undefined>(undefined);
  readonly secondaryLink = input<RouterTarget | undefined>(undefined);

  /** Nivel del encabezado para respetar la jerarquía de la página (h2 si es lo único bajo el h1). */
  readonly headingLevel = input<1 | 2 | 3 | 4>(3);
  /** `sm` para paneles, desplegables y tarjetas pequeñas. */
  readonly size = input<'md' | 'sm'>('md');
  /** Dibuja el estado dentro de una tarjeta de vidrio (cuando no hay contenedor alrededor). */
  readonly framed = input(false);
  /** Lleva el foco a la acción principal al aparecer (p. ej., tras un filtro que dejó la lista vacía). */
  readonly autofocusAction = input(false);
  /** @deprecated Usa `icon`. SVG en texto, se conserva por compatibilidad. */
  readonly svgIcon = input<string | undefined>(undefined);

  readonly action = output<void>();
  readonly secondaryAction = output<void>();

  protected readonly titleId = `es-title-${++nextId}`;
  protected readonly descId = `es-desc-${nextId}`;
  protected readonly gradientId = `es-grad-${nextId}`;

  private readonly primaryRef = viewChild<ElementRef<HTMLElement>>('primary');

  readonly resolvedKind = computed<EmptyStateKind>(() => this.kind() ?? this.copy()?.kind ?? 'info');
  protected readonly iconPaths = computed<readonly string[]>(() =>
    EMPTY_STATE_ICONS[this.icon() ?? this.copy()?.icon ?? DEFAULT_ICON[this.resolvedKind()]]);

  readonly resolvedTitle = computed(() => this.tr(this.title() ?? this.copy()?.title));
  readonly resolvedDescription = computed(() => this.tr(this.description() ?? this.copy()?.description));
  readonly resolvedAction = computed(() => this.tr(this.pick(this.actionLabel(), this.copy()?.action)));
  readonly resolvedSecondary = computed(() => this.tr(this.pick(this.secondaryLabel(), this.copy()?.secondary)));

  protected readonly role = computed(() => {
    const kind = this.resolvedKind();
    return kind === 'error' ? 'alert' : kind === 'no-results' ? 'status' : 'group';
  });


  constructor() {
    afterNextRender(() => {
      if (this.autofocusAction()) this.focusAction();
    }, { injector: this.injector });
  }

  /** Enfoca la acción principal (si existe). Útil cuando el estado aparece tras una acción de la persona. */
  focusAction(): void {
    this.primaryRef()?.nativeElement.focus();
  }

  protected onAction(): void { this.action.emit(); }
  protected onSecondary(): void { this.secondaryAction.emit(); }

  private pick(explicit: string | undefined, fallback: string | undefined): string | undefined {
    return explicit !== undefined ? explicit : fallback;
  }

  private tr(text: string | undefined): string {
    return text ? this.i18n.t(text, this.params()) : '';
  }
}

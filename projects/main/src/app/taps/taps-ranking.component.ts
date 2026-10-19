import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthSessionService } from 'auth/core';
import { EmptyStateComponent } from 'shared';
import { LoadErrorComponent, SkeletonComponent } from 'shared/loading';
import { TAP_TOPICS } from './taps.data';
import {
  IRanking, IRankingFila, TRankingPeriodo, TRankingTema, cierrePeriodo, cuentaRegresiva, etiquetaPuesto, fechaMs, filaFijada, fraseDistancia, frasePercentil, frasePuesto, numero,
  temaDeRanking, xpDeTap,
} from './taps.ranking';
import { TapsRankingService, rankingNoDisponible } from './taps-ranking.service';

type TVista =
  | { tipo: 'cargando' }
  | { tipo: 'preparando' }
  | { tipo: 'error'; error: unknown }
  | { tipo: 'vacio' }
  | { tipo: 'datos'; r: IRanking };

const PERIODOS: { id: TRankingPeriodo; nombre: string }[] = [
  { id: 'semana', nombre: 'Esta semana' },
  { id: 'hoy', nombre: 'Hoy' },
];

/**
 * Ranking de Taps (competencia-y-recompensas.md §4.3-4.5, escritorio.md §3): hoja inferior en móvil y cajón a la derecha
 * desde 768 px. Pestañas «Esta semana» / «Hoy», filtro por tema, top 20 con tu fila resaltada (y fijada abajo si no estás en
 * el top) y cuenta regresiva al cierre. Relativo y amable: percentil y «a 30 XP del puesto 6», nunca puestos enormes.
 * Se carga diferido (@defer) solo cuando alguien lo abre. Si el backend aún no está (404): «El ranking se está preparando».
 */
@Component({
  selector: 'gems-taps-ranking',
  imports: [RouterLink, EmptyStateComponent, LoadErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './taps-ranking.component.html',
  styleUrl: './taps-ranking.component.scss',
})
export class TapsRankingComponent implements OnInit {
  private readonly service = inject(TapsRankingService);
  private readonly session = inject(AuthSessionService, { optional: true });
  private readonly injector = inject(Injector);

  /** Tema con el que se abre (el filtro del feed, si hay uno que el ranking conozca). */
  readonly temaInicial = input<string | null>(null);
  readonly cerrado = output<void>();
  /** El diálogo ya está abierto (su código cargó): desde aquí el feed pausa la cuenta atrás y los atajos. */
  readonly abierto = output<void>();

  protected readonly periodos = PERIODOS;
  protected readonly temas = TAP_TOPICS.filter(t => temaDeRanking(t.id));
  protected readonly periodo = signal<TRankingPeriodo>('semana');
  protected readonly tema = signal<TRankingTema | null>(null);
  protected readonly vista = signal<TVista>({ tipo: 'cargando' });
  protected readonly ahora = signal(Date.now());
  protected readonly alias = this.service.alias;
  protected readonly conSesion = computed(() => !!this.session?.isAuthenticated());
  /** Cierre del periodo a la vista: el `hasta` del servidor si llegó; si no, el cálculo local (hora de Colombia). */
  private readonly hasta = computed(() => fechaMs(this.datos()?.hasta));
  protected readonly cuenta = computed(() => cuentaRegresiva(this.periodo(), this.ahora(), this.hasta()));
  protected readonly xpMax = xpDeTap(5, 5);

  protected readonly datos = computed(() => { const v = this.vista(); return v.tipo === 'datos' ? v.r : null; });
  protected readonly fijada = computed(() => { const r = this.datos(); return r ? filaFijada(r) : null; });
  protected readonly resumen = computed(() => {
    const r = this.datos();
    if (!r?.yo) return null;
    const semana = r.periodo === 'semana' || this.periodo() === 'semana';
    return {
      puesto: frasePuesto(r.yo.puesto, r.jugadores, semana ? ' esta semana' : ' hoy'),
      percentil: frasePercentil(r.yo.percentil, r.jugadores, semana ? 'semana' : 'hoy'),
      distancia: fraseDistancia(r),
      xp: numero(r.yo.xp),
    };
  });

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dlg');
  private readonly cache = new Map<string, IRanking>();
  private sub: Subscription | null = null;
  /** Cierre para el que ya se recargó (evita recargar en bucle si el servidor aún no pasó de periodo). */
  private recargadoPara: number | null = null;
  /** `cerrado` ya se emitió (cerrar() y el evento close del diálogo no avisan dos veces). */
  private cierreAvisado = false;

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const d = this.dialog()?.nativeElement;
      if (d && !d.open) d.showModal?.();
      this.abierto.emit();
      this.cargar();
      const reloj = setInterval(() => this.tic(), 15_000);
      destroy.onDestroy(() => clearInterval(reloj));
    }, { injector: this.injector });
    destroy.onDestroy(() => this.sub?.unsubscribe());
  }

  ngOnInit(): void {
    this.tema.set(temaDeRanking(this.temaInicial() ?? ''));
  }

  /** Avanza el reloj; si el periodo a la vista cerró con la hoja abierta, se pide el ranking del periodo nuevo. */
  protected tic(now = Date.now()): void {
    this.ahora.set(now);
    const hasta = this.hasta();
    if (hasta === null || now < hasta || this.recargadoPara === hasta) return;
    this.recargadoPara = hasta;
    this.cache.clear();
    this.cargar();
  }

  protected numero(n: number): string { return numero(n); }
  protected etiqueta(puesto: number, jugadores: number): string { return etiquetaPuesto(puesto, jugadores); }

  protected elegirPeriodo(p: TRankingPeriodo, enfocar = false): void {
    if (this.periodo() !== p) { this.periodo.set(p); this.cargar(); }
    if (enfocar) afterNextRender(() => this.dialog()?.nativeElement.querySelector<HTMLElement>(`#rk-tab-${p}`)?.focus(), { injector: this.injector });
  }

  /** Teclado de pestañas (patrón ARIA): ← → cambian, Inicio y Fin van a los extremos. */
  protected teclaPestanas(event: KeyboardEvent): void {
    const i = PERIODOS.findIndex(p => p.id === this.periodo()), n = PERIODOS.length;
    const destino = event.key === 'ArrowRight' ? (i + 1) % n : event.key === 'ArrowLeft' ? (i - 1 + n) % n
      : event.key === 'Home' ? 0 : event.key === 'End' ? n - 1 : -1;
    if (destino < 0) return;
    event.preventDefault();
    this.elegirPeriodo(PERIODOS[destino].id, true);
  }

  protected elegirTema(id: string | null): void {
    const tema = id ? temaDeRanking(id) : null;
    if (this.tema() === tema) return;
    this.tema.set(tema);
    this.cargar();
  }

  /**
   * Cierra y avisa al feed en el mismo momento: no depende de que el evento `close` del <dialog> llegue (en algunos navegadores
   * llega en otra tarea). Si después llega, no se avisa dos veces.
   */
  protected cerrar(): void {
    const d = this.dialog()?.nativeElement;
    if (d?.open) d.close();
    this.avisarCierre();
  }

  /** El diálogo se cerró por su cuenta (Esc o clic fuera). */
  protected alCerrar(): void { this.avisarCierre(); }

  private avisarCierre(): void {
    if (this.cierreAvisado) return;
    this.cierreAvisado = true;
    this.cerrado.emit();
  }

  protected cargar(): void {
    this.sub?.unsubscribe();
    const clave = `${this.periodo()}|${this.tema() ?? 'todos'}`, guardado = this.cache.get(clave);
    this.vista.set(guardado ? this.vistaDe(guardado) : { tipo: 'cargando' });
    this.sub = this.service.ranking(this.periodo(), this.tema()).subscribe({
      next: r => { this.cache.set(clave, r); this.vista.set(this.vistaDe(r)); },
      error: error => {
        if (guardado) return;                                       // ya se ve lo último que llegó
        this.vista.set(rankingNoDisponible(error) ? { tipo: 'preparando' } : { tipo: 'error', error });
      },
    });
  }

  protected trackFila(f: IRankingFila): string { return `${f.puesto}|${f.alias}`; }

  private vistaDe(r: IRanking): TVista {
    return r.top.length === 0 && !r.yo ? { tipo: 'vacio' } : { tipo: 'datos', r };
  }
}

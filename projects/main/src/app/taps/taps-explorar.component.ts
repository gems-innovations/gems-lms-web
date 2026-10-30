import { Location, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TapsEstadisticasService } from './taps-estadisticas.service';
import { TapPreviaDirective, TapsPreviasService } from './taps-explorar.previas';
import { TapsSocialService } from './taps-social.service';
import { ITapSocial, cifraCompacta } from './taps.social';
import { TapAccesoComponent } from './tap-acceso.component';
import { colecciones } from './taps.coleccion';
import { HOOK_TAP_IDS, TAPS, TAP_TOPICS } from './taps.data';
import { TAPS_DESDE } from './taps.desde';
import {
  IContexto, RIEL_MAX, TVista, VISTAS, categoriasDe, construirItems, esNuevo, esVista, explorar, hayVistas, masNuevos, masVistos, progresoDe,
  seguirJugando, subtemasDe, sugerencias,
} from './taps.explorar';
import { INTEREST_KEY, emptyInterest, parseInterest } from './taps.interest';
import { PARTIDAS_KEY, SESION_KEY, emptySesion, parseRuns, parseSesion } from './taps.sesion';

/** Cuántos Taps se pintan de una vez en la lista (el resto, con «Mostrar más»). */
const PAGINA = 24;
/** Tiempo sin escribir antes de reflejar la búsqueda en la URL (Safari limita las llamadas a replaceState). */
const URL_MS = 400;

const CATALOGO = construirItems(TAPS, TAP_TOPICS, TAPS_DESDE);
const IDS = new Set(CATALOGO.map(i => i.tap.id));

/** Bloques de la ilustración de Minecraft: 8×8 casillas con un patrón fijo (sin azar, para que el HTML sea estable). */
const bloque = (color: (x: number, y: number, r: number) => string) =>
  Array.from({ length: 64 }, (_, i) => ({ x: (i % 8) * 8, y: Math.floor(i / 8) * 8, c: color(i % 8, Math.floor(i / 8), (i * 37 + 11) % 7) }));
const BLOQUE_CESPED = bloque((_, y, r) => (y < 2 ? (r < 3 ? '#5fbf3a' : '#4a9a2d') : y === 2 && r < 3 ? '#4a9a2d' : r < 2 ? '#6f4520' : r < 5 ? '#8b5a2b' : '#9c6b3a'));
const BLOQUE_DIAMANTE = bloque((x, y, r) => ([[2, 2], [3, 2], [5, 5], [6, 5], [2, 6]].some(([a, b]) => a === x && b === y) ? '#4de1ff' : r < 2 ? '#6b6b6b' : r < 5 ? '#808080' : '#939393'));

/**
 * Explorar (/taps/explorar): buscar y recorrer todo el catálogo de Taps. Se resuelve entera en el navegador (la lista sale del
 * banco que ya viaja con la app; las vistas, de GET /public/taps/estadisticas, y el progreso, de localStorage): el HTML no
 * lleva nada del API. La lógica de búsqueda, filtros y orden vive en taps.explorar.ts (pura y con pruebas).
 * Estado en la URL: ?q=<texto>&tema=<categoría>&sub=<subtema>&orden=<vista> para poder enlazar una vista.
 */
@Component({
  selector: 'gems-taps-explorar',
  imports: [RouterLink, NgTemplateOutlet, TapPreviaDirective, TapAccesoComponent],
  providers: [TapsPreviasService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './taps-explorar.component.html',
  styleUrls: ['./taps-explorar.component.scss', './taps-explorar.tarjetas.scss', './taps-explorar.card.scss'],
})
export class TapsExplorarComponent {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly estadisticas = inject(TapsEstadisticasService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly social = inject(TapsSocialService);
  protected readonly cifra = cifraCompacta;
  private urlTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly categorias = categoriasDe(CATALOGO);
  protected readonly vistasDef = VISTAS;
  protected readonly pixelesCesped = BLOQUE_CESPED;
  protected readonly pixelesDiamante = BLOQUE_DIAMANTE;
  protected readonly minecraft = this.categorias.find(c => c.tema.id === 'minecraft') ?? null;
  protected readonly ideas = sugerencias(colecciones(TAPS));
  protected readonly buscador = viewChild<ElementRef<HTMLInputElement>>('q');

  protected readonly consulta = signal('');
  protected readonly categoria = signal<string | null>(null);
  protected readonly subtema = signal<string | null>(null);
  protected readonly vista = signal<TVista>('todos');
  protected readonly limite = signal(PAGINA);
  /** Lo guardado en este navegador y las vistas del API; vacío hasta que el navegador termina de pintar. */
  protected readonly ctx = signal<IContexto>({ now: Date.now(), interest: emptyInterest(), sesion: emptySesion(), partidas: {}, vistas: null });
  /** cargando: pidiendo las vistas · listo: llegaron · sin: el API no respondió o aún no hay datos. */
  protected readonly estadoVistas = signal<'cargando' | 'listo' | 'sin'>('cargando');

  protected readonly resultado = computed(() => explorar(CATALOGO, { categoria: this.categoria(), subtema: this.subtema(), consulta: this.consulta(), vista: this.vista() }, this.ctx()));
  protected readonly visibles = computed(() => this.resultado().resultados.slice(0, this.limite()));
  protected readonly restantes = computed(() => Math.max(0, this.resultado().resultados.length - this.limite()));
  /** Sin búsqueda, categoría ni vista: la portada de Explorar (Minecraft y rieles). */
  protected readonly portada = computed(() => !this.consulta().trim() && !this.categoria() && this.vista() === 'todos');
  protected readonly subtemas = computed(() => { const c = this.categoria(); return c ? subtemasDe(CATALOGO, c) : []; });
  protected readonly temaActual = computed(() => this.categorias.find(c => c.tema.id === this.categoria())?.tema ?? null);
  protected readonly progresos = computed(() => new Map(CATALOGO.map(i => [i.tap.id, progresoDe(i, this.ctx())])));
  protected readonly nuevos = computed(() => new Set(CATALOGO.filter(i => esNuevo(i, this.ctx().now)).map(i => i.tap.id)));

  protected readonly rielSeguir = computed(() => seguirJugando(CATALOGO, this.ctx()).slice(0, RIEL_MAX));
  /** Solo hay riel de lo más visto cuando el API respondió con vistas reales: nunca se inventa. */
  protected readonly rielVistos = computed(() => hayVistas(this.ctx().vistas, CATALOGO) ? masVistos(CATALOGO, this.ctx().vistas).slice(0, RIEL_MAX) : []);
  protected readonly rielNuevos = computed(() => masNuevos(CATALOGO).slice(0, RIEL_MAX));

  /** Vistas del Tap: las del API social o, sin él, las de las estadísticas (30 días). 0 = no se muestra (nunca se inventa). */
  protected vistasDe(id: string): number { return this.social.datos()[id]?.vistas ?? this.ctx().vistas?.[id] ?? 0; }
  /** Cifras de me gusta, solo si el API social respondió: sin él no hay corazón (ningún botón muerto). */
  protected gustaDe(id: string): ITapSocial | null { return this.social.disponible() === true ? this.social.datos()[id] ?? null : null; }
  /** Sin sesión, el corazón abre la hoja de acceso (vuelve a esta misma vista de Explorar al entrar). */
  protected readonly acceso = signal<string | null>(null);
  protected gustar(id: string): void { if (!this.social.alternar(id)) this.acceso.set(this.location.path() || '/taps/explorar'); }

  protected readonly titulo = computed(() => {
    const q = this.consulta().trim(), t = this.temaActual();
    if (q) return `Resultados para «${q}»`;
    const sub = this.subtemas().find(s => s.id === this.subtema());
    if (t) return sub ? `${t.name}: ${sub.nombre}` : t.name;
    return VISTAS.find(v => v.id === this.vista())?.nombre ?? 'Todos los Taps';
  });
  /** Frase para el contador (región en vivo). */
  protected readonly cuenta = computed(() => {
    const n = this.resultado().resultados.length;
    return n === 0 ? 'Ningún Tap' : n === 1 ? '1 Tap' : `${n} Taps`;
  });

  constructor() {
    this.leerUrl();
    effect(() => {
      // Lee los cuatro estados para reflejarlos en la URL (con retraso, sin tocar el historial).
      const q = this.consulta().trim(), tema = this.categoria(), sub = this.subtema(), orden = this.vista();
      if (!this.browser) return;
      if (this.urlTimer) clearTimeout(this.urlTimer);
      this.urlTimer = setTimeout(() => {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (tema) p.set('tema', tema);
        if (sub) p.set('sub', sub);
        if (orden !== 'todos') p.set('orden', orden);
        this.location.replaceState(this.location.path().split('?')[0], p.toString());
      }, URL_MS);
    });
    this.destroyRef.onDestroy(() => { if (this.urlTimer) clearTimeout(this.urlTimer); });
    // cifras sociales de lo que se ve (rieles y lista); el servicio junta los pedidos y no repite ids
    effect(() => this.social.pedir([...this.rielSeguir(), ...this.rielVistos(), ...this.rielNuevos(), ...this.visibles().map(r => r.item)].map(i => i.tap.id)));
    if (!this.browser) return;
    afterNextRender(() => {
      const now = Date.now();
      const interest = parseInterest(this.leer(INTEREST_KEY), now);
      this.ctx.update(c => ({
        ...c, now, interest, sesion: parseSesion(this.leer(SESION_KEY)), partidas: parseRuns(this.leer(PARTIDAS_KEY), now, IDS),
        hookDone: HOOK_TAP_IDS.some(id => !!interest.done[id]),
      }));
      void this.estadisticas.vistas(30).then(vistas => {
        const ok = hayVistas(vistas, CATALOGO);
        this.ctx.update(c => ({ ...c, vistas: ok ? vistas : null }));
        this.estadoVistas.set(ok ? 'listo' : 'sin');
      });
    });
  }

  private leerUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    this.consulta.set((q.get('q') ?? '').slice(0, 80));
    const tema = q.get('tema');
    if (tema && this.categorias.some(c => c.tema.id === tema)) {
      this.categoria.set(tema);
      const sub = q.get('sub');
      if (sub && subtemasDe(CATALOGO, tema).some(s => s.id === sub)) this.subtema.set(sub);
    }
    const orden = q.get('orden');
    if (esVista(orden)) this.vista.set(orden);
  }

  private leer(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  protected buscar(texto: string): void { this.consulta.set(texto.slice(0, 80)); this.limite.set(PAGINA); }
  protected limpiarBusqueda(): void { this.buscar(''); this.buscador()?.nativeElement.focus(); }
  protected usarIdea(idea: string): void { this.buscar(idea); this.buscador()?.nativeElement.focus(); }
  protected elegirCategoria(id: string | null): void {
    this.categoria.set(this.categoria() === id ? null : id);
    this.subtema.set(null);
    this.limite.set(PAGINA);
  }
  protected elegirSubtema(id: string | null): void { this.subtema.set(this.subtema() === id ? null : id); this.limite.set(PAGINA); }
  protected elegirVista(v: TVista): void { this.vista.set(v); this.limite.set(PAGINA); }
  protected quitarFiltros(): void {
    this.consulta.set(''); this.categoria.set(null); this.subtema.set(null); this.vista.set('todos'); this.limite.set(PAGINA);
  }
  protected masResultados(): void { this.limite.update(n => n + PAGINA); }

  /** Flechas de los rieles (en escritorio no hay gesto para deslizar): un tramo de casi su ancho, sin animar si se pidió menos movimiento. */
  protected desplazar(riel: HTMLElement, dir: 1 | -1): void {
    const reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    riel.scrollBy({ left: dir * Math.max(riel.clientWidth * 0.85, 200), behavior: reducido ? 'auto' : 'smooth' });
  }

  /** «/» lleva el foco al buscador (como en la mayoría de los sitios), salvo que ya se esté escribiendo. */
  @HostListener('document:keydown', ['$event'])
  protected onTecla(e: KeyboardEvent): void {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    this.buscador()?.nativeElement.focus();
  }
}

import { DOCUMENT, Location, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostAttributeToken, HostListener, Injector, PLATFORM_ID, REQUEST, computed,
  effect, inject, signal, untracked, viewChild, viewChildren,
} from '@angular/core';
import { LoadingGate, SkeletonComponent } from 'shared/loading';
import { AppStatusService } from '../app-status.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService, TAnalyticsEvent } from '../analytics.service';
import { TEventPath, eventSlug } from '../analytics-taxonomy';
import { AdvanceClock, TAP_RHYTHM, advanceDelay, browserClockHost } from './taps.clock';
import { loadTapsEngine, tapsThemeUrl } from './taps-engine.loader';
import { HOOK_TAP_IDS, TAP_DISPLAY_FONTS, TAP_TOPICS, TAPS, findTap } from './taps.data';
import { choose, feedTopics, isGoodScore, next, optionLayout, orderFeed, resultFor, startRun, streak, topicOf } from './taps.logic';
import { canvasToBlob, drawShareCard, loadImage, paintThemeCharacter, shareText, shareUrl } from './taps.share';
import { TapResultComponent } from './tap-result.component';
import { TapsBarComponent } from './taps-bar.component';
import { TapRailComponent } from './tap-rail.component';
import { TapPanelComponent } from './tap-panel.component';
import { IMenuTopic, TapsMenuComponent } from './taps-menu.component';
import { TapsRankingComponent } from './taps-ranking.component';
import { TapsRankingService } from './taps-ranking.service';
import { IPartidaRespuesta } from './taps.ranking';
import {
  INTEREST_KEY, IInterest, TInterestSignal, addSignal, blockTopic, emptyInterest, isBlocked, markCompleted, parseInterest, personalize,
  unblockTopic, yourTopics, topicProgress, dayKey,
} from './taps.interest';
import { keyAction, typingTarget } from './taps.keys';
import { panelCards, panelState } from './taps.panel';
import { WheelGate } from './taps.wheel';
import { TapsSonidoService } from './taps-sonido.service';
import { ITap, ITapRun, ITapVisual, ITapsStage } from './taps.types';
import { visualSide } from './taps.escena';
import { fraseActual } from './taps.frases';
import {
  ISesionGuardada, PARTIDAS_KEY, SESION_KEY, TPartidaGuardada, emptySesion, freshHead, greeting, hasProgress, parseRuns, parseSesion,
  rematchText, sessionBucket, sessionGoal, sessionSummary, sessionTapsBucket, storeRun,
} from './taps.sesion';
import { ITemaAvance, TapSesionHojaComponent } from './tap-sesion.component';

const SOUND_KEY = 'gems-taps-sound';
const VOZ_KEY = 'gems-taps-voz';
const TEACH_KEY = 'gems-taps-ensenar';
const KEYS_KEY = 'gems-taps-atajos';
const MENU_KEY = 'gems-taps-menu';
const PULSE_KEY = 'gems-taps-pulso';
/** Seguridad extra: si el 3D no llega en este tiempo el póster (capa ligera) se queda todo el Tap. El motor ya lo hace a los 4 s. */
type TStageMode = 'loading' | 'poster' | '3d' | 'light' | 'none';
/** Cookie (solo para /taps, sin datos personales): el servidor ya no abre con el Tap de gancho a quien lo jugó. */
const HOOK_COOKIE = 'gems_taps_gancho';
const SHAPES = ['triángulo', 'rombo', 'círculo', 'cuadrado'];

type TSound = 'pending' | 'on' | 'off';
interface IPreAnswer { id: string; k: number; t: number }

/**
 * Feed vertical de Taps: un Tap a pantalla completa, desliza para el siguiente. Cada Tap es un quiz que juegas con un
 * personaje en vivo (motor en public/taps-engine). Responder es libre y sin registro.
 *
 * Ritmo (experiencia-ux.md §5.1): la respuesta se marca al instante; tras un acierto avanza solo a los 1,4 s y tras un
 * error deja leer la explicación 3,5 s. Mantener presionado pausa, tocar adelanta.
 *
 * El primer pintado es solo DOM/CSS y viene del servidor. Antes de que Angular hidrate, un script mínimo de index.html
 * marca la respuesta de la primera pregunta (colores y vibración); al hidratar, el toque se repite (event replay) y este
 * componente sigue desde ahí. El escenario 3D se carga después y UN solo escenario se mueve al Tap que está a la vista.
 */
@Component({
  selector: 'gems-taps',
  imports: [TapResultComponent, TapsBarComponent, TapRailComponent, TapPanelComponent, TapsMenuComponent, TapsRankingComponent, SkeletonComponent, TapSesionHojaComponent, NgTemplateOutlet],
  templateUrl: './taps-feed.component.html',
  styleUrls: ['./taps-feed.component.scss', './taps-feed.opciones.scss', './taps-feed.escritorio.scss', './taps-feed.escena.scss', './taps-feed.portada.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TapsSonidoService],
})
export class TapsFeedComponent {
  private readonly platform = inject(PLATFORM_ID);
  private readonly analytics = inject(AnalyticsService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly status = inject(AppStatusService);
  /** Rankings: envío de cada partida terminada y alias del jugador (solo en el navegador). */
  protected readonly ranking = inject(TapsRankingService);
  private readonly isBrowser = isPlatformBrowser(this.platform);
  /** Efectos (sintetizados por código) y voz de los personajes: taps-engine/audio y taps-engine/voz, cargados bajo demanda. */
  private readonly audio = inject(TapsSonidoService);

  private readonly snapshot = inject(ActivatedRoute).snapshot;
  private readonly query = this.snapshot.queryParamMap;
  /** Tap pedido por el enlace: `/t/<id>` (el que se comparte, prerenderizado con su tarjeta) o el antiguo `?t=<id>`. */
  private readonly askedId = this.snapshot.paramMap.get('id') ?? this.query.get('t');
  /** Se entró por `/t/<id>`: la URL sigue en ese formato al pasar de Tap (misma ruta, Atrás no recrea el feed). */
  private readonly sharedRoute = this.snapshot.paramMap.has('id');
  /** Quien ya jugó el Tap de gancho (cookie): servidor y navegador leen lo mismo, así el orden coincide al hidratar. */
  private readonly hookDone = this.readHookCookie();
  /**
   * `<gems-taps modo="portada">`: incrustado en la portada («/»). Pinta UN solo Tap (el de gancho, o el siguiente sin jugar)
   * dentro de una tarjeta; no toca la URL ni intercepta rueda o flechas (la página sigue desplazándose), y «Siguiente»,
   * «Más de este tema» y el selector de temas continúan en el feed completo (/taps), que retoma lo jugado.
   */
  protected readonly portada = inject(new HostAttributeToken('modo'), { optional: true }) === 'portada';
  /** Portada: el orden completo del feed, del que sale el Tap que sigue (`nextTap`). */
  private following: ITap[] = [];

  protected readonly topic = signal<string | null>(this.query.get('tema'));
  /** Orden deseado: `?t=<id>` (enlace compartido) pone ese Tap primero; `?tema=<id>` pone primero los de esa categoría. */
  private readonly wanted = this.onlyFirstInPortada(orderFeed(TAPS, { first: findTap(this.askedId)?.id, topic: this.topic(), hookDone: this.hookDone }));
  /**
   * Orden con el que se pinta primero. Si el HTML ya viene del servidor (SSR o prerender), se hidrata con el MISMO orden
   * que trae (un HTML prerenderizado no conoce `?t=` ni la cookie): cambiar el orden antes de hidratar rompería la
   * hidratación. Tras hidratar se pasa al orden deseado si la persona aún no respondió (`applyWantedOrder`).
   */
  protected readonly taps = signal<ITap[]>(this.serverOrder() ?? this.wanted);
  protected readonly topics = feedTopics(TAPS, TAP_TOPICS);
  protected readonly runs = signal<Record<string, ITapRun>>(Object.fromEntries(TAPS.map(t => [t.id, startRun(t)])));
  protected readonly activeId = signal(this.taps()[0].id);
  /** Sonido: arranca en silencio con el aviso «Toca para sonido»; el primer toque en una opción lo enciende (salvo que la persona lo haya apagado). */
  protected readonly sound = signal<TSound>('pending');
  /** Voz del personaje (lee la pregunta): apagada por defecto y se recuerda. `null` = aún no se sabe; `'none'` = sin voz utilizable. */
  protected readonly voice = signal<'on' | 'off' | 'none' | null>(null);
  /** Estado del escenario: cargando → poster (capa ligera ya visible, el 3D aún no) → 3d | light (ligero) | none (sin tema ni motor: el quiz sigue en DOM sobre el degradado). */
  protected readonly stageMode = signal<TStageMode>('loading');
  /** Esqueleto del personaje: tras 300 ms sin escenario y al menos 500 ms (reglas de carga de GEMS). */
  protected readonly skeleton = signal(false);
  protected readonly stageAttr = computed(() => (this.stageMode() === 'loading' && this.skeleton() ? 'skeleton' : this.stageMode()));
  protected readonly online = this.status.online;
  /** ≥ 768 px: armazón de escritorio (menú, riel y panel). Por debajo es el móvil de siempre. */
  protected readonly wide = signal(false);
  protected readonly shortcuts = signal(true);
  protected readonly focusMode = signal(false);
  /** El menú está en el estado contrario al de su ancho (contraído en ≥ 1280, abierto en 1024-1279). */
  protected readonly menuInverted = signal(false);
  protected readonly pulseNext = signal(false);
  protected readonly legendOpen = signal(false);
  protected readonly interest = signal<IInterest>(emptyInterest());
  protected readonly notice = signal<{ tapId: string; text: string; download?: string; undo?: boolean } | null>(null);
  /** Cuenta atrás visible tras responder: duración (ms) y si está en pausa (mantener presionado). */
  protected readonly wait = signal<{ tapId: string; ms: number; key: number } | null>(null);
  protected readonly waitPaused = signal(false);
  /** Enseñar a deslizar (máximo 2 veces en la vida): el siguiente Tap asoma y la flecha rebota. */
  protected readonly teach = signal(false);
  protected readonly sheetOpen = signal(false);
  protected readonly live = signal(false);
  /** Hoja del ranking abierta (se carga diferida la primera vez). */
  protected readonly rankingOpen = signal(false);

  private readonly feed = viewChild.required<ElementRef<HTMLElement>>('feed');
  private readonly sections = viewChildren<ElementRef<HTMLElement>>('section');
  private readonly slots = viewChildren<ElementRef<HTMLElement>>('slot');
  private readonly bar = viewChild.required(TapsBarComponent);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly activeTap = computed(() => this.taps().find(t => t.id === this.activeId()) ?? this.taps()[0]);
  /**
   * Ids de los Taps con contenido en el DOM: el anterior, el actual y el siguiente (experiencia-ux.md, DOM ligero). Los demás
   * conservan su marco (altura, fondo y casilla del escenario) para que el scroll y el motor sigan igual, sin sus preguntas.
   * Servidor y navegador parten del primer Tap, así que la hidratación coincide.
   */
  protected readonly mounted = computed(() => {
    const list = this.taps(), i = Math.max(0, list.findIndex(t => t.id === this.activeId()));
    return new Set(list.slice(Math.max(0, i - 1), i + 2).map(t => t.id));
  });
  protected readonly topicName = computed(() => this.topics.find(t => t.topic.id === this.topic())?.topic.name ?? 'Para ti');
  protected readonly activeIndexSig = computed(() => Math.max(0, this.taps().findIndex(t => t.id === this.activeId())));
  protected readonly menuTopics = computed<IMenuTopic[]>(() => yourTopics(TAPS, this.interest()).flatMap(id => {
    const t = this.topics.find(x => x.topic.id === id)?.topic;
    return t ? [{ id, name: t.name, color: t.color, ...topicProgress(TAPS, this.interest(), id) }] : [];
  }));
  protected readonly panelStateSig = computed(() => panelState(this.runs()[this.activeId()]));
  protected readonly panelCardsList = computed(() => {
    const tap = this.activeTap(), taps = this.taps();
    return panelCards({
      tap, run: this.runs()[tap.id], next: taps[taps.indexOf(tap) + 1] ?? null, interest: this.interest(), now: Date.now(),
      topicName: this.topicLabel(tap), topicColor: this.topicColor(tap), partida: this.partidaLista(tap.id),
    }, TAPS);
  });
  protected readonly activeBlocked = computed(() => isBlocked(this.interest(), topicOf(this.activeTap()), Date.now()));
  // ───────────── sesión: racha, meta del día y avance (taps.sesion.ts) ─────────────
  /** Racha y meta de hoy. En el servidor y antes de hidratar el interés está vacío: la barra muestra la marca (igual en ambos). */
  /** Reloj de la sesión: se renueva al volver a la pestaña, al cambiar de Tap y al terminar uno (pasada la medianoche cambia el día). */
  private readonly ahora = signal(0);
  protected readonly resumen = computed(() => sessionSummary(this.interest(), this.ahora() || Date.now()));
  protected readonly barResumen = computed(() => (hasProgress(this.resumen()) ? this.resumen() : null));
  /** Avance de cada tema con Taps («Minecraft 5 de 23»). */
  protected readonly avances = computed(() => new Map(this.topics.filter(t => !t.soon).map(t => {
    const p = topicProgress(TAPS, this.interest(), t.topic.id);
    return [t.topic.id, { nombre: t.topic.name, hechos: p.done, total: p.total, color: t.topic.color } as ITemaAvance];
  })));
  protected readonly avancesLista = computed(() => [...this.avances().values()]);
  /** «Tu día en Taps» (lo abre la marca en el celular). */
  protected readonly hojaDia = signal(false);
  /** Tap cuyo resultado cumplió la meta del día: solo ahí se celebra. */
  protected readonly metaTapId = signal<string | null>(null);

  private stage: ITapsStage | null = null;
  /** Cuándo empezó cada partida (para la duración que se envía al ranking). */
  private readonly tapStart = new Map<string, number>();
  /** Control que abrió el ranking: el foco vuelve ahí al cerrarlo. */
  private rankingOpener: HTMLElement | null = null;
  /** El diálogo del ranking llegó a abrirse (su código cargó). */
  private rankingShown = false;
  private readonly wheel = new WheelGate();
  private gate: LoadingGate | null = null;
  private readonly prefetched = new Set<string>();
  /** Escenarios cuyo 3D aún no decidió si llega (póster visible). */
  private readonly pending3d = new Set<ITapsStage>();
  private readonly stages = new Map<string, ITapsStage>();
  private activeIndex = -1;
  private token = 0;
  private waitKey = 0;
  private seen = new Set<string>();
  private questionShownAt = 0;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private held = false;
  private teachShown = false;
  private readonly shareFiles = new Map<string, File>();
  /** Enlace de descarga de la imagen (blob:) del aviso actual: se libera al reemplazarlo y al salir del feed. */
  private downloadUrl: string | null = null;
  private readonly clock = new AdvanceClock(browserClockHost, () => this.advance());
  private clockTap: ITap | null = null;
  private completedThisSession = 0;
  private firstTouchCounted = false;
  private stageErrorCounted = false;
  /** Ya se agregó una entrada al historial al dejar el primer Tap (Atrás vuelve a él una vez y luego sale). */
  private pushed = false;
  /** Tocar el objeto que explica pausa la cuenta atrás; se reanuda sola tras un rato sin tocarlo. */
  private visualTimer: ReturnType<typeof setTimeout> | null = null;
  /** Lo guardado de la sesión (última visita, meta celebrada, puntajes) y las partidas a medias (48 h). */
  private sesion: ISesionGuardada = emptySesion();
  private savedRuns: Record<string, TPartidaGuardada> = {};
  /** Semilla de las frases de esta carga de página (0 en el servidor, donde no se pinta ninguna frase). */
  private semilla = 0;
  /** Cuántas veces se repitió cada Tap en esta sesión (cambia las frases de la revancha). */
  private readonly partidas = new Map<string, number>();
  private sessionStart = 0;
  private sessionCounted = false;
  /** Mientras está abierto el menú de compartir la pestaña puede ocultarse: eso no cierra la sesión. */
  private sharing = false;
  /** Frase que pintó el script previo a hidratar para la primera respuesta (se mantiene al hidratar). */
  private preWord: { tapId: string; text: string } | null = null;

  constructor() {
    const html = this.document.documentElement;
    html.classList.add('taps-page');                               // sin fuentes de marca que compitan con el JS del juego
    this.destroyRef.onDestroy(() => {
      html.classList.remove('taps-page');
      html.removeAttribute('data-taps-live');
      html.removeAttribute('data-glass');
      this.clock.cancel();
      this.clearHold();
      this.clearVisualTimer();
      this.revokeDownload();
      this.stages.forEach(stage => stage.destroy());
      this.stages.clear();
      this.stage = null;
      this.gate?.dispose();
      this.audio.destruir();
    });
    // Vuelve la red: se reintenta solo lo que falló (el tema del escenario), sin recargar la página.
    effect(() => {
      const on = this.status.online();
      untracked(() => { if (on && this.live() && this.stageMode() === 'none') this.retryStage(); });
    });
    if (!this.isBrowser) return;
    afterNextRender(() => {
      html.setAttribute('data-taps-live', '');                    // desde aquí responde Angular (el script previo se retira)
      performance.mark?.('taps-interactive');
      this.live.set(true);
      this.sound.set(this.readStorage(SOUND_KEY) === 'off' ? 'off' : this.readStorage(SOUND_KEY) === 'on' ? 'on' : 'pending');
      this.startAudio();
      this.interest.set(parseInterest(this.readStorage(INTEREST_KEY), Date.now()));
      this.sesion = parseSesion(this.readStorage(SESION_KEY));
      this.semilla = Math.floor(Math.random() * 1e9);
      this.sessionStart = performance.now();
      this.shortcuts.set(this.readStorage(KEYS_KEY) !== 'off');
      this.menuInverted.set(this.readStorage(MENU_KEY) === 'inv');
      this.watchViewport();
      this.gate = new LoadingGate(visible => this.skeleton.set(visible), 300, 500);
      this.gate.set(this.stageMode() === 'loading');
      const reordered = this.applyWantedOrder();
      this.restoreRuns();
      this.document.addEventListener('visibilitychange', this.onVisibility);
      const onPageHide = () => this.countSession();               // cerrar la pestaña o irse a otro sitio
      addEventListener('pagehide', onPageHide);
      this.destroyRef.onDestroy(() => { this.document.removeEventListener('visibilitychange', this.onVisibility); removeEventListener('pagehide', onPageHide); this.countSession(); });
      // Atrás del navegador (popstate): vuelve al Tap que dice la URL en vez de salir del feed.
      const sub = this.location.subscribe(() => this.onPopState());
      this.destroyRef.onDestroy(() => sub.unsubscribe());
      const asked = this.askedId;
      if (asked !== null && !findTap(asked)) {
        this.notice.set({ tapId: this.taps()[0].id, text: 'Este Tap se retiró. Te dejamos uno parecido.' });
      } else {
        this.welcome();
      }
      // Con el orden nuevo ya pintado se empieza a observar qué Tap está a la vista.
      const start = () => { if (reordered) this.feed().nativeElement.scrollTo({ top: 0 }); this.watchSections(); void this.activate(0); };
      if (reordered) afterNextRender(start, { injector: this.injector }); else start();
    });
  }

  /** Orden de las secciones que pintó el servidor (null si no hay HTML del servidor o no coincide con los datos). */
  private serverOrder(): ITap[] | null {
    if (!this.isBrowser) return null;
    const ids = Array.from(this.document.querySelectorAll<HTMLElement>('main.taps > .tap[data-tap]')).map(el => el.dataset['tap']);
    const list = ids.map(id => TAPS.find(t => t.id === id)).filter((t): t is ITap => !!t);
    return list.length === TAPS.length && ids.length === TAPS.length ? list : null;
  }

  /**
   * Tras hidratar: pasa al orden deseado (enlace `?t=`, tema, gancho ya jugado) si nadie respondió todavía.
   * Regreso sin repeticiones: lo jugado en los últimos 14 días no ocupa la cabeza del feed (salvo el Tap pedido por enlace).
   */
  private applyWantedOrder(): boolean {
    const now = Date.now(), fixed = findTap(this.askedId) ? 1 : 0;
    // «Para ti» aprende de lo que se jugó; con un tema elegido el orden se respeta y solo se refresca la cabeza.
    // En la portada, un solo Tap: el primero que esta persona aún no completó (portadaPick).
    const base = this.topic() === null ? personalize(this.wanted, fixed, this.interest(), now) : this.wanted;
    const target = this.portada ? this.portadaPick() : freshHead(base, this.interest(), now, 2, fixed, this.topic());
    const current = this.taps().map(t => t.id).join(), wanted = target.map(t => t.id).join();
    const answered = Object.values(this.runs()).some(r => r.answers.length > 0) || !!(globalThis as { __tapsPre?: unknown }).__tapsPre;
    if (current === wanted || answered) return false;
    this.taps.set(target);
    this.activeId.set(target[0].id);
    this.activeIndex = -1;
    return true;
  }

  // ───────────── portada (modo="portada") ─────────────
  private onlyFirstInPortada(list: ITap[]): ITap[] {
    if (!this.portada) return list;
    this.following = list;
    return list.slice(0, 1);
  }

  /** Portada, ya en el navegador: «Para ti» con lo aprendido y, primero, un Tap que esta persona aún no completó. */
  private portadaPick(): ITap[] {
    const done = this.interest().done;
    const hookDone = this.hookDone || HOOK_TAP_IDS.some(id => id in done);
    this.following = personalize(orderFeed(TAPS, { hookDone }), 2, this.interest(), Date.now());
    const first = this.following.find(t => !(t.id in done)) ?? this.following[0];
    this.following = [first, ...this.following.filter(t => t !== first)];
    return [first];
  }

  /** Portada: seguir jugando es pasar al feed completo, que retoma lo jugado (sessionStorage) y abre en ese Tap o tema. */
  private toFeed(queryParams: { t?: string; tema?: string | null }): void {
    void this.router.navigate(['/taps'], { queryParams });
  }

  /** Portada: las teclas (1-4, Espacio, M) solo juegan mientras la tarjeta se ve; quien bajó a leer no responde sin querer. */
  private portadaOnScreen(): boolean {
    const box = this.host.nativeElement.getBoundingClientRect();
    return box.bottom > innerHeight * .4 && box.top < innerHeight * .6;
  }

  // ───────────── vista ─────────────
  protected run(tap: ITap): ITapRun { return this.runs()[tap.id]; }
  protected layout(tap: ITap): string { return optionLayout(tap.questions[this.run(tap).index]?.options ?? []); }
  protected nextTap(tap: ITap): ITap | null {
    const list = this.portada ? this.following : this.taps();
    return list[list.findIndex(t => t.id === tap.id) + 1] ?? null;
  }
  protected streakOf(tap: ITap): number { return streak(this.run(tap)); }
  protected shape(k: number): string { return SHAPES[k] ?? ''; }
  protected letter(k: number): string { return 'ABCD'[k] ?? String(k + 1); }
  /** Frase de la reacción: del personaje del Tap, con semilla (sesión + Tap + partida + pregunta) y sin repetir la anterior. */
  protected word(tap: ITap): string {
    const semilla = `${this.semilla}|${tap.id}|${this.partidas.get(tap.id) ?? 0}`;
    // La primera respuesta dada antes de hidratar ya mostró «¡Exacto!» o «Casi...» (script de index.html): se conserva.
    const primera = this.preWord?.tapId === tap.id && (this.partidas.get(tap.id) ?? 0) === 0 ? this.preWord.text : undefined;
    return fraseActual(this.run(tap).answers, { host: tap.scene.host, theme: tap.theme, semilla, primera });
  }
  protected temaDe(tap: ITap): ITemaAvance | null { return this.avances().get(topicOf(tap)) ?? null; }
  protected topicOf(tap: ITap): string { return topicOf(tap); }
  protected topicColor(tap: ITap): string { return this.topics.find(t => t.topic.id === topicOf(tap))?.topic.color ?? '#8b93a7'; }
  protected displayFont(tap: ITap): string | null { return TAP_DISPLAY_FONTS[tap.theme] ?? null; }
  protected topicLabel(tap: ITap): string { return this.topics.find(t => t.topic.id === topicOf(tap))?.topic.name ?? tap.kicker; }
  /** Objeto para explicar de la pregunta a la vista: solo tras fallar (junto a la explicación) y con escenario (el motor lo dibuja). */
  protected visualOf(tap: ITap, run: ITapRun): ITapVisual | null {
    if (run.finished || run.chosen === null) return null;
    const q = tap.questions[run.index];
    if (!q?.visual || run.chosen === q.answer) return null;
    const mode = this.stageMode();
    return mode === '3d' || mode === 'light' || mode === 'poster' ? q.visual : null;
  }
  protected visualSide(tap: ITap): 'izq' | 'der' { return visualSide(tap.scene); }
  /** Teclado o lector de pantalla (clic sin puntero): repite la animación del objeto. Con puntero ya la maneja el motor. */
  protected replayVisual(event: MouseEvent): void {
    if (event.detail !== 0) return;
    this.stage?.replayVisual?.();
    this.onVisualTouch();                                          // como al tocarlo: la cuenta atrás espera mientras se mira
  }

  /** «Toca tu respuesta»: solo en la primera pregunta del Tap de gancho, hasta el primer toque. */
  protected showTouchHint(tap: ITap): boolean { const run = this.run(tap); return !!tap.hook && run.index === 0 && run.chosen === null && !run.finished; }

  // ───────────── responder y avanzar ─────────────
  protected choose(tap: ITap, option: number): void {
    if (tap.id !== this.activeId() && this.live()) return;
    if (this.questionShownAt && performance.now() - this.questionShownAt < TAP_RHYTHM.guardMs) return;   // el toque de «adelantar» no responde
    const { run, correct } = choose(this.run(tap), tap, option);
    if (correct === null) return;
    const pre = this.takePreAnswer(tap, option);
    if (pre) this.preWord = { tapId: tap.id, text: correct ? '¡Exacto!' : 'Casi...' };
    // Inicio de la partida para el ranking: si se respondió antes de hidratar, la pregunta se veía desde que cargó la página.
    if (pre) this.tapStart.set(tap.id, Math.round(performance.timeOrigin));
    else if (this.run(tap).answers.length === 0 && !this.tapStart.has(tap.id)) this.tapStart.set(tap.id, Date.now());
    this.setRun(tap, run);
    this.notice.set(null);
    this.track('taps-responder', `taps/responder/${eventSlug(tap.id)}/${run.answers.length}`);
    this.countFirstTouch(pre);
    if (this.sound() !== 'off') this.audio.desbloquear();          // dentro del gesto: el navegador solo deja sonar así
    if (this.sound() === 'pending') { this.sound.set('on'); this.stage?.setMuted(false); this.audio.silenciar(false); }   // el primer toque enciende el sonido
    this.audio.callar();
    this.answerSound(tap, run, correct);
    if (!pre) this.vibrate(correct);
    if (tap.id === this.activeId()) this.stage?.react(correct ? 'celebrate' : 'hurt', { say: false });
    const ms = advanceDelay(correct, pre ? performance.now() - pre.t : 0);
    this.clockTap = tap;
    this.clock.start(ms);
    this.waitPaused.set(false);
    this.wait.set({ tapId: tap.id, ms, key: ++this.waitKey });
    afterNextRender(() => {                                        // pantallas bajas: que se vea cómo seguir
      const section = this.sections()[this.taps().indexOf(tap)]?.nativeElement;
      const go = section?.querySelector<HTMLElement>('.tap__go');
      this.reveal(section, go);
      this.mountVisual(tap, section);
      if (this.wide()) go?.focus({ preventScroll: true });          // escritorio: Enter o Espacio adelantan sin código especial
    }, { injector: this.injector });
  }

  /** Pide al motor el objeto que explica la pregunta (si la vista lo pintó). Si el tema no lo tiene, el hueco se oculta. */
  private mountVisual(tap: ITap, section: HTMLElement | undefined): void {
    const el = section?.querySelector<HTMLElement>('.tap__visual');
    const spec = this.visualOf(tap, this.run(tap));
    if (!el || !spec || !this.stage?.visual || tap.id !== this.activeId()) return;
    void this.stage.visual(spec, el, { side: this.visualSide(tap) }).then(label => {
      if (!label) { el.hidden = true; return; }
      // el lienzo va dentro del botón (hijos de presentación): la descripción del objeto va en el nombre accesible del botón
      el.setAttribute('aria-label', `Explicación con un objeto: ${label.trim()} Pulsa para verla otra vez.`);
    }, () => { el.hidden = true; });
  }

  /** El objeto se tocó o se arrastró: la cuenta atrás espera mientras se explora y sigue sola 2,5 s después. */
  private onVisualTouch(): void {
    if (!this.clock.active) return;
    this.clock.pause();
    this.waitPaused.set(true);
    this.clearVisualTimer();
    this.visualTimer = setTimeout(() => {
      this.visualTimer = null;
      if (!this.held && !this.sheetOpen() && !this.document.hidden) { this.clock.resume(); this.waitPaused.set(false); }
    }, 2500);
  }

  private clearVisualTimer(): void { if (this.visualTimer) clearTimeout(this.visualTimer); this.visualTimer = null; }

  /** Adelantar con el botón «Seguir» (teclado y lector de pantalla). */
  protected skip(): void { this.clock.flush(); }

  protected restart(tap: ITap): void {
    this.track(null, `taps/repetir/${eventSlug(tap.id)}`);
    this.signal(tap, 'repeat');
    this.partidas.set(tap.id, (this.partidas.get(tap.id) ?? 0) + 1);
    this.setRun(tap, startRun(tap));
    this.ranking.olvidar(tap.id);
    this.tapStart.set(tap.id, Date.now());
    this.questionShownAt = performance.now();
    this.audio.tocar('toque', { tema: tap.theme });
    this.stage?.say('');
    this.stage?.react('ask');
    this.readQuestion(tap);
    this.focusLater(tap, '.tap__q');
  }

  protected goNext(tap: ITap): void {
    if (this.portada) { this.track('taps-siguiente', 'taps/siguiente'); this.toFeed({ t: this.nextTap(tap)?.id }); return; }
    const nextSection = this.sections()[this.taps().indexOf(tap) + 1]?.nativeElement;
    nextSection?.scrollIntoView({ behavior: this.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  /** «Más de este tema»: el siguiente Tap sin terminar de la misma categoría; si no hay, el siguiente del feed. */
  protected moreOf(tap: ITap): void {
    if (this.portada) { this.toFeed({ tema: topicOf(tap) }); return; }
    const list = this.taps(), from = list.indexOf(tap);
    const target = list.find((t, i) => i > from && topicOf(t) === topicOf(tap) && !this.run(t).finished)
      ?? list.find((t, i) => i !== from && topicOf(t) === topicOf(tap) && !this.run(t).finished);
    if (!target) { this.openTopics(); return; }
    this.sections()[list.indexOf(target)]?.nativeElement.scrollIntoView({ behavior: this.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  private advance(): void {
    const tap = this.clockTap;
    this.clockTap = null;
    this.wait.set(null);
    this.clearVisualTimer();
    this.stage?.clearVisual?.();
    if (!tap) return;
    const run = next(this.run(tap), tap);
    if (run === this.run(tap)) return;
    this.setRun(tap, run);
    if (run.finished) {
      this.track('taps-completar', `taps/completar/${eventSlug(tap.id)}`);
      this.completedThisSession++;
      this.updateInterest(i => markCompleted(i, tap, Date.now()));
      this.ahora.set(Date.now());
      this.onSessionTap(tap, run);
      this.reorderTail();
      if ([1, 2, 3, 4, 6, 10].includes(this.completedThisSession)) this.track(null, `taps/hito/${this.completedThisSession}`);
      this.onFinished(tap, run);
      this.focusLater(tap, '.res__title');
    } else {
      this.questionShownAt = performance.now();
      if (tap.id === this.activeId()) { this.stage?.react('ask', { say: false }); this.readQuestion(tap); }
      if (tap.questions[run.index]?.visual) void this.stage?.preloadVisuals?.();
      this.focusLater(tap, '.tap__q');
      if (run.index === 2) this.preloadAhead(this.activeIndex);   // llega a la pregunta 3: se adelanta el escenario de los siguientes
    }
  }

  private onFinished(tap: ITap, run: ITapRun): void {
    if (tap.id === this.activeId()) {
      this.celebrateResult(tap, run);
      this.audio.tocar('resultado', { tema: tap.theme, puntaje: run.score / tap.questions.length });
    }
    this.writeHookCookie();
    this.sendToRanking(tap, run);
    if (!this.teachShown && this.nextTap(tap)) {
      const count = Number(this.readStorage(TEACH_KEY) ?? 0) || 0;
      if (count < 2) { this.teach.set(true); this.teachShown = true; this.writeStorage(TEACH_KEY, String(count + 1)); }
      const pulses = Number(this.readStorage(PULSE_KEY) ?? 0) || 0;
      if (this.wide() && pulses < 2 && tap.id === this.activeId()) { this.pulseNext.set(true); this.writeStorage(PULSE_KEY, String(pulses + 1)); }
    }
    this.prepareShareCard(tap, run);
  }

  /**
   * La partida terminada va al ranking en segundo plano: el juego no la espera y si falla no se avisa (la tarjeta no sale).
   * Sin un inicio conocido (partida retomada a medias tras recargar) no se envía: una duración inventada no sirve al servidor.
   */
  private sendToRanking(tap: ITap, run: ITapRun): void {
    const started = this.tapStart.get(tap.id);
    this.tapStart.delete(tap.id);
    if (!started) return;
    this.ranking.enviarPartida({
      tapId: tap.id, topic: topicOf(tap), aciertos: run.score, total: tap.questions.length, duracionMs: Date.now() - started,
    });
  }

  /** Respuesta real del API a la última partida de ese Tap (null mientras llega o si no llegó). */
  protected partidaLista(tapId: string): IPartidaRespuesta | null {
    const p = this.ranking.partida(tapId);
    return p?.estado === 'listo' ? p.datos : null;
  }

  // ───────────── ranking ─────────────
  /** Abre la hoja del ranking (barra en móvil; menú, panel o resultado en escritorio). Mientras está abierta, la cuenta atrás espera. */
  protected openRanking(): void {
    if (this.rankingOpen()) return;
    const active = this.document.activeElement;
    this.rankingOpener = active instanceof HTMLElement && active !== this.document.body ? active : null;
    this.track(null, 'taps/ranking/abrir');
    this.rankingOpen.set(true);
  }

  /** El diálogo ya se ve: mientras esté abierto, la cuenta atrás espera y los atajos no actúan. */
  protected onRankingShown(): void {
    this.rankingShown = true;
    this.sheetOpen.set(true);
    this.clock.pause();
    this.audio.callar();                                            // la voz no sigue leyendo la pregunta debajo del ranking
  }

  protected closeRanking(): void {
    if (!this.rankingOpen()) return;
    this.rankingOpen.set(false);
    if (this.rankingShown) {
      this.rankingShown = false;
      this.sheetOpen.set(false);
      if (!this.held && !this.document.hidden) this.clock.resume();
    }
    const opener = this.rankingOpener;
    this.rankingOpener = null;
    if (opener?.isConnected) afterNextRender(() => opener.focus({ preventScroll: true }), { injector: this.injector });
  }

  /** Acciones del panel: «Jugar el siguiente» o «Ver ranking». */
  protected onPanelGo(action: 'next' | 'ranking'): void {
    if (action === 'ranking') this.openRanking(); else this.step(1);
  }

  // ───────────── gestos: mantener presionado pausa, tocar adelanta ─────────────
  protected onPress(event: PointerEvent): void {
    if (!this.clock.active || this.isControl(event.target)) return;
    this.clearHold();
    this.holdTimer = setTimeout(() => { this.held = true; this.clock.pause(); this.waitPaused.set(true); }, TAP_RHYTHM.holdMs);
  }

  protected onRelease(event: PointerEvent): void {
    this.clearHold();
    if (this.held) { this.held = false; this.clock.resume(); this.waitPaused.set(false); return; }
    if (this.clock.active && !this.isControl(event.target)) this.clock.skip();
  }

  protected onCancel(): void {
    this.clearHold();
    if (this.held) { this.held = false; this.clock.resume(); this.waitPaused.set(false); }
  }

  private clearHold(): void { if (this.holdTimer) clearTimeout(this.holdTimer); this.holdTimer = null; }
  /** Botones y enlaces que no son opciones (riel, barra, «Seguir»): no adelantan ni pausan. */
  private isControl(target: EventTarget | null): boolean {
    const el = target as Element | null;
    return !!el?.closest?.('a, button:not(.tap__opt), dialog');
  }

  private readonly onVisibility = () => {
    if (this.document.hidden) { this.clock.pause(); this.audio.pausar(); }
    else { this.audio.reanudar(); if (!this.held && !this.sheetOpen()) this.clock.resume(); }
    if (this.document.hidden && !this.sharing) this.countSession();
    if (!this.document.hidden) this.ahora.set(Date.now());
  };

  // ───────────── sesión: regreso, meta del día y medición ─────────────
  /**
   * Al abrir: el Tap de un enlace ya terminado se ofrece como revancha; quien vuelve tras 20 h recibe un saludo breve con
   * su racha (sin culpa si se cortó). Luego se anota esta visita.
   */
  private welcome(): void {
    if (this.portada) return;
    const now = Date.now(), first = this.taps()[0], asked = findTap(this.askedId);
    const rematch = asked && asked.id === first.id ? rematchText(asked, this.interest(), this.sesion) : null;
    const hello = rematch ? null : greeting(this.interest(), this.sesion, now);
    if (rematch || hello) this.notice.set({ tapId: first.id, text: (rematch ?? hello)! });
    if (hello) this.track(null, 'taps/regreso/saludo');
    this.saveSesion({ ...this.sesion, ultima: now });
  }

  /** Un Tap terminado: puntaje para la revancha y, si con él se llega a 3 hoy, una sola celebración en el día. */
  private onSessionTap(tap: ITap, run: ITapRun): void {
    const now = Date.now(), today = dayKey(now), goal = sessionGoal(this.interest(), now);
    const celebrate = goal.cumplida && this.sesion.celebrada !== today;
    if (celebrate) { this.metaTapId.set(tap.id); this.track(null, 'taps/meta-dia/cumplida'); }
    this.saveSesion({ ultima: now, celebrada: celebrate ? today : this.sesion.celebrada, puntajes: { ...this.sesion.puntajes, [tap.id]: run.score } });
  }

  private saveSesion(next: ISesionGuardada): void {
    this.sesion = next;
    this.writeStorage(SESION_KEY, JSON.stringify(next));
  }

  /**
   * `taps/sesion/<duración>` y `taps/sesion-taps/<n>`: una vez por sesión, al ocultar la pestaña o al salir del feed (mejora 13).
   * El menú de compartir no cuenta como salida. Respeta `?interno=1` (AnalyticsService no envía nada del equipo).
   */
  private countSession(): void {
    if (this.portada) return;
    if (this.sessionCounted || !this.live()) return;
    this.sessionCounted = true;
    this.track(null, `taps/sesion/${sessionBucket(performance.now() - this.sessionStart)}`);
    this.track(null, `taps/sesion-taps/${sessionTapsBucket(this.completedThisSession)}`);
  }

  /** La marca de la barra (celular) abre «Tu día en Taps»: no saca del juego. Mientras está abierta, la cuenta atrás espera. */
  protected openDay(): void {
    if (this.portada) return;
    if (this.hojaDia()) return;
    this.track(null, 'taps/dia/abrir');
    this.hojaDia.set(true);
    this.sheetOpen.set(true);
    this.clock.pause();
  }

  protected closeDay(): void {
    if (!this.hojaDia()) return;
    this.hojaDia.set(false);
    this.sheetOpen.set(false);
    if (!this.held && !this.document.hidden) this.clock.resume();
  }

  // ───────────── sonido ─────────────
  protected toggleSound(): void {
    const on = this.sound() !== 'on';
    this.sound.set(on ? 'on' : 'off');
    this.stage?.setMuted(!on);
    this.writeStorage(SOUND_KEY, on ? 'on' : 'off');
    if (on) this.audio.desbloquear();
    this.audio.silenciar(!on);
    if (on) this.audio.tocar('toque', { tema: this.activeTap().theme });
  }

  /** «Voz»: el personaje lee la pregunta en voz alta. Encenderla también enciende el sonido (sin sonido no hay voz). */
  protected toggleVoice(): void {
    const now = this.voice();
    if (now !== 'on' && now !== 'off') return;
    const on = now !== 'on';
    this.voice.set(on ? 'on' : 'off');
    this.writeStorage(VOZ_KEY, on ? 'on' : 'off');
    this.audio.activarVoz(on);
    this.syncStageVoice();
    if (on && this.sound() !== 'on') this.toggleSound();
    if (on) this.readQuestion(this.activeTap());                // dentro del gesto: iOS solo deja hablar así la primera vez
    this.track(null, on ? 'taps/voz/encender' : 'taps/voz/apagar');
  }

  /** Tras hidratar: módulo de sonido en reposo, desbloqueo con el primer gesto y la voz si la persona la dejó encendida. */
  private startAudio(): void {
    this.audio.silenciar(this.sound() !== 'on');
    this.audio.escucharGestos(() => this.sound() !== 'off');
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    const go = () => {
      void this.audio.precargar().then(() => this.audio.precalentar(this.activeTap().theme));
      void this.audio.prepararVoz().then(ok => {
        // En la portada la voz arranca apagada aunque se haya dejado encendida en /taps: solo habla si la activan aquí.
        const on = ok && !this.portada && this.readStorage(VOZ_KEY) === 'on';
        this.voice.set(ok ? (on ? 'on' : 'off') : 'none');
        this.audio.activarVoz(on);
        this.syncStageVoice();
      });
    };
    if (idle) idle(go, { timeout: 3000 }); else setTimeout(go, 1500);
  }

  /** Conecta la voz a los escenarios solo si está encendida: con la voz apagada el motor ni la conoce. */
  private syncStageVoice(): void {
    const voz = this.voice() === 'on' ? this.audio.motorVoz : null;
    this.stages.forEach(stage => stage.setVoz?.(voz));
  }

  /** Sonido de la respuesta (a los ~80 ms del toque, experiencia-ux.md §5.1): acierto, racha desde 3 seguidas o fallo. */
  private answerSound(tap: ITap, run: ITapRun, correct: boolean): void {
    const level = correct ? streak(run) : 0;
    if (!correct) this.audio.tocar('fallo', { tema: tap.theme });
    else if (level >= 3) this.audio.tocar('racha', { tema: tap.theme, nivel: level });
    else this.audio.tocar('acierto', { tema: tap.theme });
  }

  /**
   * Con la voz encendida el personaje dice la pregunta (solo voz: el texto ya está en la tarjeta y es el subtítulo). No dice
   * «correcto»/«incorrecto» ni la explicación: eso lo anuncia el aria-live y un lector de pantalla lo oiría dos veces.
   */
  private readQuestion(tap: ITap): void {
    // Sin un gesto previo en la página no se habla: el navegador lo bloquearía (y sería audio sin pedirlo).
    if (this.voice() !== 'on' || this.sound() !== 'on' || tap.id !== this.activeId() || !this.audio.huboGesto()) return;
    const run = this.run(tap), q = tap.questions[run.index];
    if (run.finished || !q || run.chosen !== null) return;
    if (this.stage?.setVoz) this.stage.say(q.q, { globo: false });
    else this.audio.hablar(q.q, tap.scene.host);
  }

  // ───────────── temas ─────────────
  protected openTopics(): void { this.bar().open(); }

  /** Mientras se elige tema, la cuenta atrás espera. */
  protected onSheet(open: boolean): void {
    this.sheetOpen.set(open);
    if (open) this.track(null, 'taps/tema/abrir');
    if (open) this.clock.pause(); else if (!this.held) this.clock.resume();
  }

  /** Elige categoría: el feed vuelve arriba con esos Taps primero y la URL queda enlazable (`/taps?tema=minecraft`). */
  protected selectTopic(id: string | null): void {
    this.track(null, `taps/tema/elegir/${id ? eventSlug(id) : 'para-ti'}`);
    this.audio.tocar('toque', { tema: this.activeTap().theme });
    if (this.portada) { this.toFeed({ tema: id }); return; }
    this.clock.flush();
    this.topic.set(id);
    const ordered = orderFeed(TAPS, { topic: id, hookDone: this.hookDone || this.anyFinished() });
    this.taps.set(ordered);
    this.activeId.set(ordered[0].id);                              // el nuevo primer Tap ya tiene contenido al volver arriba
    void this.router.navigate([], { queryParams: { tema: id, t: null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.activeIndex = -1;
    afterNextRender(() => { this.feed().nativeElement.scrollTo({ top: 0 }); void this.activate(0); }, { injector: this.injector });
  }

  // ───────────── compartir ─────────────
  /** «Retar a un amigo»: imagen 9:16 + texto + enlace al mismo Tap. Si no se puede compartir, copia y ofrece la imagen. */
  protected async challenge(tap: ITap): Promise<void> {
    this.track('taps-compartir', `taps/compartir/${eventSlug(tap.id)}`);
    this.signal(tap, 'share');
    const run = this.run(tap), url = shareUrl(location.origin, tap.id), file = this.shareFiles.get(tap.id);
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    this.sharing = true;
    try {
      if (file && nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Taps de GEMS LMS', text: shareText(tap, run, url) });
        this.track(null, 'taps/compartir-ok/nativo');
        return;
      }
      if (nav.share) { await nav.share({ title: 'Taps de GEMS LMS', text: shareText(tap, run), url }); this.track(null, 'taps/compartir-ok/nativo'); return; }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;      // la persona cerró el menú
    } finally { this.sharing = false; }
    await this.copy(tap, shareText(tap, run, url), url, file);
  }

  /** Compartir desde el riel (a mitad del Tap): solo el enlace, sin resultado. */
  protected async shareTap(tap: ITap): Promise<void> {
    this.track('taps-compartir', `taps/compartir/${eventSlug(tap.id)}`);
    this.signal(tap, 'share');
    const url = shareUrl(location.origin, tap.id), text = `Juega este Tap de GEMS LMS: ${tap.title}. ¿Cuántas sacas de ${tap.questions.length}?`;
    this.sharing = true;
    try {
      if (navigator.share) { await navigator.share({ title: 'Taps de GEMS LMS', text, url }); this.track(null, 'taps/compartir-ok/nativo'); return; }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
    } finally { this.sharing = false; }
    await this.copy(tap, `${text}\n${url}`, url);
  }

  /** Sin menú de compartir: copia el texto y ofrece la imagen para descargar; si tampoco hay portapapeles, muestra el enlace. */
  private async copy(tap: ITap, text: string, url: string, file?: File): Promise<void> {
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; this.track(null, 'taps/compartir-ok/copiado'); } catch { /* sin portapapeles: se muestra el enlace */ }
    this.revokeDownload();
    const download = file ? URL.createObjectURL(file) : undefined;
    this.downloadUrl = download ?? null;
    this.notice.set({ tapId: tap.id, text: copied ? 'Copiado. Pégalo en WhatsApp o donde quieras.' : `Copia y envía este enlace: ${url}`, download });
  }

  /** La imagen se prepara al llegar al resultado (en reposo): así el toque en «Retar» abre el menú al instante (Safari exige el gesto). */
  private prepareShareCard(tap: ITap, run: ITapRun): void {
    const work = async () => {
      const [character, logo] = await Promise.all([
        paintThemeCharacter(tapsThemeUrl(tap.theme), tap.scene.host),
        loadImage('/logo-144.png').catch(() => null),
      ]);
      const canvas = drawShareCard({
        tapTitle: tap.title, title: resultFor(tap, run.score).title, score: run.score, total: tap.questions.length,
        answers: run.answers, backdrop: tap.backdrop, character, logo,
      });
      const blob = await canvasToBlob(canvas);
      if (blob) this.shareFiles.set(tap.id, new File([blob], `gems-taps-${tap.id}.png`, { type: 'image/png' }));
    };
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    const go = () => void work().catch(() => undefined);
    if (idle) idle(go, { timeout: 1500 }); else setTimeout(go, 300);
  }

  /**
   * Atajos (escritorio.md §6.2). 1-4 (o A-D) eligen opción; ↑ ↓ J K cambian de Tap; Espacio y Enter adelantan; M sonido, R retar,
   * T temas, F modo enfoque, [ menú, ? atajos, Esc cierra. Los de un carácter se pueden apagar (WCAG 2.1.4) y nunca se activan
   * al escribir o dentro de un diálogo. Con el foco en el panel, ↑ ↓ desplazan el panel.
   */
  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (this.sheetOpen() || event.defaultPrevented || (this.portada && !this.portadaOnScreen())) return;
    const action = keyAction(event, this.shortcuts());
    const target = event.target as Element | null;
    if (!action || typingTarget(target)) return;
    const tap = this.activeTap(), run = this.run(tap), desktop = this.wide();
    const onControl = !!target?.closest?.('button, a, [role="menuitem"]');
    switch (action.kind) {
      case 'option': if (!run.finished) this.choose(tap, action.index); break;
      case 'step':
        if (!desktop || target?.closest?.('gems-tap-panel, gems-taps-menu, .rail__menu')) return;   // ahí ↑ ↓ son del propio control
        event.preventDefault(); this.step(action.dir); break;
      case 'continue':
        if (onControl || !this.clock.active) return;
        event.preventDefault(); this.skip(); break;
      case 'sound': this.toggleSound(); break;
      case 'challenge': if (desktop) this.shareActive(); break;
      case 'topics': if (desktop) this.openTopics(); break;
      case 'focus': if (desktop) this.focusMode.update(v => !v); break;
      case 'menu': if (desktop) this.toggleMenu(); break;
      case 'help': if (desktop) this.legendOpen.update(v => !v); break;
      case 'escape': if (this.portada) break; if (this.legendOpen()) this.legendOpen.set(false); else if (this.focusMode()) this.focusMode.set(false); else if (this.menuInverted() && this.host.nativeElement.clientWidth < 1280) this.toggleMenu(); break;
    }
  }

  /** Cambia de Tap con la rueda, las flechas o el teclado: lleva la sección vecina a la vista (el snap la deja exacta). */
  protected step(dir: 1 | -1): void {
    const index = this.activeIndexSig() + dir;
    if (index < 0 || index >= this.taps().length) return;
    this.pulseNext.set(false);
    this.sections()[index]?.nativeElement.scrollIntoView({ behavior: this.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  /** Retar desde el riel o con R: tras el resultado, tarjeta con puntaje; a mitad del Tap, solo el enlace. */
  protected shareActive(): void {
    const tap = this.activeTap();
    void (this.run(tap).finished ? this.challenge(tap) : this.shareTap(tap));
  }

  protected toggleShortcuts(): void {
    const on = !this.shortcuts();
    this.shortcuts.set(on);
    this.writeStorage(KEYS_KEY, on ? 'on' : 'off');
  }

  protected toggleMenu(): void {
    this.menuInverted.update(v => !v);
    this.writeStorage(MENU_KEY, this.menuInverted() ? 'inv' : 'std');
  }

  /** «Tus temas»: pone o quita el filtro de ese tema. */
  protected toggleTopicFilter(id: string): void { this.selectTopic(this.topic() === id ? null : id); }

  /** El puntero sobre el panel o el foco dentro pausan la cuenta atrás del feedback («En pausa mientras lees»). */
  protected holdPanel(on: boolean): void {
    if (!this.wide() || !this.clock.active) return;
    if (on) { this.clock.pause(); this.waitPaused.set(true); }
    else if (!this.held && !this.sheetOpen() && !this.document.hidden) { this.clock.resume(); this.waitPaused.set(false); }
  }

  /** «No me interesa este tema»: no sale en «Para ti» durante 30 días (se puede deshacer desde el mismo menú). */
  protected notInterested(tap: ITap): void {
    const topic = topicOf(tap);
    this.updateInterest(i => blockTopic(i, topic, Date.now()));
    this.track(null, `taps/no-me-interesa/${eventSlug(topic)}`);
    if (this.topic() === topic) this.selectTopic(null); else this.reorderTail();
    this.notice.set({ tapId: tap.id, text: `Listo: no verás ${this.topicLabel(tap)} en «Para ti» por 30 días.`, undo: true });
  }

  /** «Deshacer» del aviso: vuelve a mostrar el tema y quita el aviso. */
  protected undoNotInterested(): void {
    this.unblockActive();
    this.notice.set(null);
  }

  protected unblockActive(): void {
    const tap = this.activeTap();
    this.updateInterest(i => unblockTopic(i, topicOf(tap)));
    this.reorderTail();
  }

  /** Escritorio y tablet: mide el ancho una vez y lo sigue; la rueda se intercepta solo ahí (en táctil queda el snap nativo). */
  private watchViewport(): void {
    if (this.portada) return;                                        // en la portada la tarjeta es «móvil» en todo ancho y la rueda es de la página
    const query = matchMedia('(min-width: 768px)');
    const update = () => this.wide.set(query.matches);
    update();
    query.addEventListener('change', update);
    const onWheel = (e: WheelEvent) => {
      if (!this.wide() || e.ctrlKey || this.sheetOpen() || !(e.target instanceof Element)) return;
      if (e.target.closest('gems-tap-panel, gems-taps-menu, dialog')) return;
      const inner = e.target.closest('.tap__panel');                  // panel inferior con scroll propio (pantallas bajas)
      if (inner && inner.scrollHeight > inner.clientHeight + 1) return;
      e.preventDefault();
      const dir = this.wheel.push({ deltaY: e.deltaY, deltaX: e.deltaX, deltaMode: e.deltaMode }, performance.now(), innerHeight);
      if (dir) this.step(dir);
    };
    this.host.nativeElement.addEventListener('wheel', onWheel, { passive: false });
    this.destroyRef.onDestroy(() => { query.removeEventListener('change', update); this.host.nativeElement.removeEventListener('wheel', onWheel); });
  }

  // ───────────── señales de interés (solo en este navegador) ─────────────
  private updateInterest(change: (i: IInterest) => IInterest): void {
    this.interest.update(change);
    this.writeStorage(INTEREST_KEY, JSON.stringify(this.interest()));
  }

  private signal(tap: ITap, kind: TInterestSignal): void { this.updateInterest(i => addSignal(i, topicOf(tap), kind)); }

  /** Reordena lo que viene después del Tap a la vista y el que asoma (esos dos no cambian de pronto). Con un tema elegido no se toca. */
  private reorderTail(): void {
    if (this.topic() !== null || !this.isBrowser) return;
    const next = personalize(this.taps(), this.activeIndexSig() + 2, this.interest(), Date.now());
    if (next.some((t, i) => t.id !== this.taps()[i].id)) this.taps.set(next);
  }

  private setRun(tap: ITap, run: ITapRun): void {
    this.runs.update(all => ({ ...all, [tap.id]: run }));
    if (!this.isBrowser) return;
    // localStorage con 48 h de vigencia por partida (taps.sesion.ts): un Tap a medias se retoma también al volver otro día.
    const { saved, raw } = storeRun(this.savedRuns, run, Date.now());
    this.savedRuns = saved;
    this.writeStorage(PARTIDAS_KEY, raw);
  }

  private celebrateResult(tap: ITap, run: ITapRun): void {
    const good = isGoodScore(tap, run.score);
    this.stage?.say('');                                       // el título ya está en la tarjeta: sin globo encima de la barra
    this.stage?.react(good ? 'win' : 'lose', { say: false });
  }

  private focusLater(tap: ITap, selector: string): void {
    afterNextRender(() => {
      if (this.portada && !this.portadaOnScreen()) return;        // portada: quien bajó a leer no pierde su lugar por el foco
      const section = this.sections()[this.taps().indexOf(tap)]?.nativeElement;
      const el = section?.querySelector<HTMLElement>(selector);
      el?.focus({ preventScroll: true });
      this.reveal(section, el);
    }, { injector: this.injector });
  }

  /** En pantallas bajas el panel tiene scroll: deja a la vista el elemento (sin mover el feed). */
  private reveal(section: HTMLElement | undefined, el: HTMLElement | null | undefined): void {
    const panel = section?.querySelector<HTMLElement>('.tap__panel');
    if (!panel || !el || panel.scrollHeight <= panel.clientHeight + 1) return;
    const box = panel.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.bottom > box.bottom) panel.scrollTop += r.bottom - box.bottom + 8;
    else if (r.top < box.top) panel.scrollTop -= box.top - r.top + 8;
  }

  private vibrate(correct: boolean): void {
    try { if ('vibrate' in navigator) navigator.vibrate(correct ? 15 : [30, 40, 30]); } catch { /* sin vibración */ }
  }

  /** Respuesta dada antes de hidratar (script de index.html): se descuenta su tiempo y se limpian sus marcas. */
  private takePreAnswer(tap: ITap, option: number): IPreAnswer | null {
    const w = globalThis as { __tapsPre?: IPreAnswer };
    const pre = w.__tapsPre;
    const section = this.sections()[this.taps().indexOf(tap)]?.nativeElement;
    if (section?.hasAttribute('data-pre')) {
      section.removeAttribute('data-pre');
      section.querySelectorAll('.pre-ok, .pre-bad').forEach(el => el.classList.remove('pre-ok', 'pre-bad'));
    }
    if (!pre || pre.id !== tap.id || pre.k !== option) return null;
    delete w.__tapsPre;
    return pre;
  }

  // ───────────── feed: qué Tap está a la vista ─────────────
  private watchSections(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < .6) continue;
        const index = this.sections().findIndex(s => s.nativeElement === entry.target);
        if (index >= 0) void this.activate(index);
      }
    }, { root: this.feed().nativeElement, threshold: [.6] });
    this.sections().forEach(s => observer.observe(s.nativeElement));
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** El Tap `index` quedó a la vista: mueve el escenario ahí, cuenta la visita y deja listo el siguiente. */
  private async activate(index: number): Promise<void> {
    if (index === this.activeIndex) return;
    const previous = this.activeIndex, tap = this.taps()[index], token = ++this.token;
    if (this.clockTap && this.clockTap.id !== tap.id) this.clock.flush();   // se fue con la respuesta a la vista: queda en la siguiente pregunta
    const left = previous >= 0 ? this.taps().find(t => t.id === this.activeId()) : undefined;
    if (left && left.id !== tap.id) {                                   // se fue a mitad de un Tap tras fallar: el tema pierde 1 punto
      const r = this.run(left);
      if (!r.finished && r.answers.length > 0 && r.answers[r.answers.length - 1] === false) this.signal(left, 'leave-after-error');
    }
    this.activeIndex = index;
    this.activeId.set(tap.id);
    this.ahora.set(Date.now());
    if (previous >= 0) { this.audio.callar(); this.audio.tocar('deslizar', { tema: tap.theme }); }
    if (this.run(tap).answers.length === 0 && !this.tapStart.has(tap.id)) this.tapStart.set(tap.id, Date.now());
    if (this.notice()?.tapId !== tap.id) this.notice.set(null);
    this.syncUrl(tap, previous);
    if (!this.seen.has(tap.id)) { this.seen.add(tap.id); this.track('taps-ver', `taps/ver/${eventSlug(tap.id)}`); }
    if (previous >= 0 && index > previous) this.track('taps-siguiente', 'taps/siguiente');
    try {
      const stage = await this.ensureStage(tap);
      if (token !== this.token || !stage) return;
      stage.attachTo(this.slots()[index].nativeElement);
      stage.resume();
      await stage.setScene(tap.scene);
      if (token !== this.token) return;
      const run = this.run(tap);
      if (run.finished) this.celebrateResult(tap, run); else { stage.say(''); stage.react('ask', { say: false }); this.readQuestion(tap); }
      this.audio.precalentar(tap.theme);
      if (tap.questions.some(q => q.visual)) void stage.preloadVisuals?.();
      this.preloadAhead(index);
    } catch {
      // Sin tema ni motor el Tap se juega sobre su degradado (--bg-top/--bg-bottom), sin personaje y sin aviso: es el mínimo garantizado.
      if (token === this.token) this.setStageMode('none');
      this.stageError('error/motor');
    }
  }

  /**
   * La URL dice qué Tap se ve (`?t=<id>`): recargar o copiar el enlace lleva a ese Tap. Al dejar el primero se agrega UNA
   * entrada al historial, así Atrás vuelve una vez al Tap con el que se entró y la siguiente vez sale (no atrapa).
   */
  private syncUrl(tap: ITap, previous: number): void {
    if (!this.live() || this.portada) return;
    const [path, search = ''] = this.location.path().split('?');
    const params = new URLSearchParams(search);
    let next: string;
    if (this.sharedRoute) {
      if (path === `/t/${tap.id}`) return;
      next = `/t/${encodeURIComponent(tap.id)}`;
    } else {
      if (params.get('t') === tap.id) return;
      params.set('t', tap.id);
      next = '/taps';
    }
    const query = this.sharedRoute ? search : params.toString();
    if (previous >= 0 && !this.pushed) { this.pushed = true; this.location.go(next, query); }
    else this.location.replaceState(next, query);
  }

  private onPopState(): void {
    if (this.portada) return;
    this.pushed = false;
    const [path, search = ''] = this.location.path().split('?');
    const id = this.sharedRoute ? this.safeDecode(path.replace(/^\/t\//, '')) : new URLSearchParams(search).get('t');
    const index = this.taps().findIndex(t => t.id === id);
    if (index < 0) return;
    this.sections()[index]?.nativeElement.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  /** `decodeURIComponent` lanza con un `%` mal formado (p. ej. `/t/%E0%A4%A`): se queda con el texto tal cual. */
  private safeDecode(value: string): string {
    try { return decodeURIComponent(value); } catch { return value; }
  }

  /**
   * Un escenario por tema (videojuego), creado al primer Tap de ese tema y reutilizado en todos los siguientes: el feed
   * alterna Minecraft (3D) y estudio (2D), y recrear el motor en cada deslizada sería lento. Solo el del Tap a la vista
   * dibuja; el otro queda en pausa (a lo sumo hay dos).
   */
  private async ensureStage(tap: ITap): Promise<ITapsStage | null> {
    const known = this.stages.get(tap.theme);
    if (known) return this.switchStage(known);
    const { create } = await loadTapsEngine();
    if (this.stages.has(tap.theme)) return this.switchStage(this.stages.get(tap.theme)!);   // otro activate lo creó mientras cargaba el motor
    // Modo ligero o ahorro de datos: póster fijo, sin pedir el motor 3D.
    const stage = create(this.slots()[this.activeIndex].nativeElement, { theme: tapsThemeUrl(tap.theme), mode: this.lightOnly() ? 'light' : 'auto', audio: this.audio.motorAudio });
    stage.setVoz?.(this.voice() === 'on' ? this.audio.motorVoz : null);
    this.stages.set(tap.theme, stage);
    this.stage?.pause();
    this.stage = stage;
    this.pending3d.add(stage);
    stage.setMuted(this.sound() !== 'on');
    stage.on('mode', data => {
      if (stage !== this.stage) return;
      this.setStageMode(data.mode === '3d' ? '3d' : 'light');
      performance.mark?.('taps-stage-' + data.mode, { detail: { reason: data.reason ?? null } });
      if (data.mode === 'light') {
        this.glassOff();                                             // modo ligero: botones sin blur
        this.stageError(/webgl/i.test(data.reason ?? '') ? 'error/webgl' : 'error/modo-ligero');
        this.track(null, `taps/poster-solo/${this.posterReason(data.reason)}`);
      }
    });
    stage.on('degrade', () => this.glassOff());
    stage.on('visual', () => { if (stage === this.stage) this.onVisualTouch(); });                     // el 3D va justo: el blur sobre el canvas cuesta fps
    // La promesa del 3D puede rechazar si el tema falla: siempre se atiende, o sería un error sin capturar.
    const ready3d = stage.ready3d.then(mode => { this.pending3d.delete(stage); if (stage === this.stage) this.setStageMode(mode); }, () => undefined);
    try {
      await stage.ready;
    } catch (error) {
      // theme.json no llegó (red, 500, JSON inválido): se retira ese escenario y el Tap sigue sobre su degradado.
      // El siguiente Tap del mismo tema vuelve a intentarlo.
      this.pending3d.delete(stage);
      this.stages.delete(tap.theme);
      if (this.stage === stage) this.stage = null;
      stage.destroy();
      throw error;
    }
    performance.mark?.('taps-poster');                              // la capa ligera (póster) ya se ve; el 3D se prepara detrás
    if (this.pending3d.has(stage)) this.setStageMode('poster'); else this.setStageMode(stage.mode);
    void ready3d;
    return stage;
  }

  private switchStage(stage: ITapsStage): ITapsStage {
    if (this.stage && this.stage !== stage) this.stage.pause();
    this.stage = stage;
    this.setStageMode(stage.mode === '3d' ? '3d' : this.pending3d.has(stage) ? 'poster' : 'light');
    return stage;
  }

  /** Cambia el estado del escenario y avisa al LoadingGate: el esqueleto solo vive mientras no hay nada que mostrar. */
  private setStageMode(mode: TStageMode): void {
    this.stageMode.set(mode);
    this.gate?.set(mode === 'loading');
  }

  /** Por qué el escenario se quedó en póster: lento, ligero, webgl u otro (analítica, sin datos personales). */
  private posterReason(reason: string | undefined): string {
    return /tard/i.test(reason ?? '') ? 'lento' : /webgl/i.test(reason ?? '') ? 'webgl' : /ligero|dispositivo|rendimiento/i.test(reason ?? '') ? 'ligero' : 'otro';
  }

  /** Ahorro de datos o 2G: no se pide el motor 3D ni se precarga nada de más. */
  private lightOnly(): boolean {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ''));
  }

  /** Vuelve a pedir el escenario del Tap a la vista (volvió la red o se pasó a otro Tap del mismo tema). */
  private retryStage(): void {
    if (this.activeIndex < 0) return;
    const index = this.activeIndex;
    this.activeIndex = -1;
    this.setStageMode('loading');
    void this.activate(index);
  }

  /**
   * Precarga en reposo de los 2 Taps siguientes (experiencia-ux.md §7.1): si su tema ya tiene escenario se prepara su escena; si
   * es otro tema, solo se pide su `theme.json` (el motor del otro tema no). Nunca con ahorro de datos, 2G o modo ligero.
   */
  private preloadAhead(index: number): void {
    if (this.lightOnly()) return;
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    for (const offset of [1, 2]) {
      const upcoming = this.taps()[index + offset];
      if (!upcoming) continue;
      const target = this.stages.get(upcoming.theme);
      const run = () => {
        if (target) void target.preload(upcoming.scene).catch(() => undefined);
        else this.prefetchTheme(upcoming.theme);
      };
      if (idle) idle(run, { timeout: 4000 }); else setTimeout(run, 2500);
    }
  }

  private prefetchTheme(theme: string): void {
    if (this.prefetched.has(theme) || !this.status.online()) return;
    this.prefetched.add(theme);
    fetch(tapsThemeUrl(theme), { priority: 'low' } as RequestInit).catch(() => this.prefetched.delete(theme));
  }

  // ───────────── estado guardado ─────────────
  /**
   * Se retoma cada Tap donde iba: en la misma pestaña y, durante 48 h, al volver otro día (localStorage, con try/catch).
   * El Tap de un enlace que ya se terminó no abre en su resultado: se ofrece de nuevo con «¿Revancha?».
   */
  private restoreRuns(): void {
    const now = Date.now(), ids = new Set(TAPS.map(t => t.id));
    this.savedRuns = parseRuns(this.readStorage(PARTIDAS_KEY), now, ids);
    try {                                                            // formato anterior (solo esta pestaña): se aprovecha y se retira
      const old = sessionStorage.getItem(PARTIDAS_KEY);
      if (old) { this.savedRuns = { ...parseRuns(old, now, ids), ...this.savedRuns }; sessionStorage.removeItem(PARTIDAS_KEY); }
    } catch { /* sin sessionStorage */ }
    if ((globalThis as { __tapsPre?: unknown }).__tapsPre) return;
    const asked = findTap(this.askedId)?.id;
    const valid = Object.fromEntries(Object.entries(this.savedRuns)
      .filter(([id, r]) => !(id === asked && r.finished))
      .map(([id, { t: _t, ...r }]) => [id, r.finished || r.chosen === null ? r : next(r, TAPS.find(x => x.id === id)!)] as [string, ITapRun]));
    // Una respuesta dada antes de hidratar manda sobre lo guardado.
    const current = this.runs();
    this.runs.set({ ...current, ...Object.fromEntries(Object.entries(valid).filter(([id]) => current[id].answers.length === 0)) });
  }

  /**
   * Medición (producto/retencion/plan-retencion.md): la taxonomía con detalle en el path y, mientras conviven, el nombre
   * antiguo del evento (`taps-ver`, `taps-compartir`…) para no cortar las series que ya existen.
   */
  private track(legacy: TAnalyticsEvent | null, path: TEventPath): void {
    // Portada: su propio prefijo (`portada/tap/ver/<id>`, `portada/tap/responder/...`) para no inflar el embudo de /taps.
    if (this.portada) { this.analytics.event(path.startsWith('taps/') ? `portada/tap/${path.slice('taps/'.length)}` : path); return; }
    if (legacy) this.analytics.event(legacy);
    this.analytics.event(path);
  }

  /** `taps/primer-toque/<tramo>`: primera respuesta de la sesión, contada desde que la pregunta responde (taps-interactive). */
  private countFirstTouch(pre: IPreAnswer | null): void {
    if (this.firstTouchCounted) return;
    this.firstTouchCounted = true;
    const start = performance.getEntriesByName?.('taps-interactive')[0]?.startTime ?? 0;
    const ms = (pre ? pre.t : performance.now()) - start;
    this.track(null, `taps/primer-toque/${ms < 3000 ? '0-3s' : ms < 10000 ? '3-10s' : '10s+'}`);
  }

  /** El escenario cayó a modo ligero o el motor no cargó (el quiz sigue): se cuenta una vez por sesión. */
  private stageError(path: TEventPath): void {
    if (this.stageErrorCounted) return;
    this.stageErrorCounted = true;
    this.track(null, path);
  }

  private revokeDownload(): void { if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl); this.downloadUrl = null; }

  private glassOff(): void { this.document.documentElement.setAttribute('data-glass', 'off'); }

  private anyFinished(): boolean { return Object.values(this.runs()).some(r => r.finished); }

  private readHookCookie(): boolean {
    const cookie = this.isBrowser ? this.document.cookie : this.request?.headers.get('cookie') ?? '';
    return new RegExp(`(?:^|;\\s*)${HOOK_COOKIE}=1`).test(cookie ?? '');
  }

  private writeHookCookie(): void {
    try { this.document.cookie = `${HOOK_COOKIE}=1; Max-Age=31536000; Path=/taps; SameSite=Lax`; } catch { /* sin cookies: el gancho se repite */ }
  }

  private readStorage(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private writeStorage(key: string, value: string, session = false): void {
    try { (session ? sessionStorage : localStorage).setItem(key, value); } catch { /* preferencia solo para esta sesión */ }
  }

  private reducedMotion(): boolean { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
}

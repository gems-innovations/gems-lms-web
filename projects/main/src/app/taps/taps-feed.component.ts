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
  INTEREST_KEY, IInterest, NOVELTY_MS, TInterestSignal, addSignal, blockTopic, emptyInterest, isBlocked, markCompleted, parseInterest, personalize,
  unblockTopic, yourTopics, topicProgress, dayKey,
} from './taps.interest';
import { keyAction, typingTarget } from './taps.keys';
import { panelCards, panelState } from './taps.panel';
import { WheelGate } from './taps.wheel';
import { TapsSonidoService } from './taps-sonido.service';
import { TapsMusicaService } from './taps-musica.service';
import { ITap, ITapEscena, ITapRun, ITapVisual, ITapsStage } from './taps.types';
import { planoSeed, questionEscena, visualSide } from './taps.escena';
import { fraseActual } from './taps.frases';
import {
  IPausaSesion, ISesionGuardada, PARTIDAS_KEY, PAUSA_KEY, SESION_KEY, TPartidaGuardada, emptySesion, freshHead, greeting, hasProgress, nuevaPausa,
  parsePausa, parseRuns, parseSesion, pauseSummary, reanudarPausa, registrarActividad, rematchText, sessionBucket, sessionGoal, sessionSummary,
  sessionTapsBucket, shouldSuggestPause, storeRun,
} from './taps.sesion';
import { ITemaAvance, TapSesionHojaComponent } from './tap-sesion.component';
import { IRetoGuardado, IRetoVista, RETO_KEY, dailyTap, fechaColombia, parseReto, retoLabel, retoScore, retoShareText, retoUrl } from './taps.reto';
import {
  COLECCION_KEY, IAvanceColeccion, IColeccionGuardada, TGrado, avanceColeccion, coleccionDe, colecciones, emptyColecciones, insigniasGanadas,
  parseColecciones, registrarPuntaje, sembrarInsignias,
} from './taps.coleccion';
import { IRetoResultado } from './tap-result.component';
import { TapPausaComponent } from './tap-pausa.component';

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

/** Sonido general (efectos, música y voz): encendido por defecto; 'off' solo si la persona lo apagó (se recuerda). */
export type TSound = 'on' | 'off';
/** Antes de hidratar no se sabe lo guardado: el altavoz se pinta neutro (sin ondas ni tachado) y no dice si está activo. */
export type TSoundEstado = TSound | null;
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
  imports: [TapResultComponent, TapsBarComponent, TapRailComponent, TapPanelComponent, TapsMenuComponent, TapsRankingComponent, SkeletonComponent, TapSesionHojaComponent, TapPausaComponent, NgTemplateOutlet],
  templateUrl: './taps-feed.component.html',
  styleUrls: ['./taps-feed.component.scss', './taps-feed.opciones.scss', './taps-feed.escritorio.scss', './taps-feed.escena.scss', './taps-feed.portada.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TapsSonidoService, TapsMusicaService],
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
  /** Música de fondo (taps-engine/audio/musica.js + public/taps-musica): encendida por defecto en /taps y en la portada; se apaga en «Tu día» o el menú. */
  protected readonly musica = inject(TapsMusicaService);

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
  /**
   * `<gems-taps modo="portada" tema="minecraft">`: la portada de una institución con landing propia abre con los Taps de
   * su tema (Knowledge Craft → Minecraft) y «Siguiente» sigue en ese orden. Sin el atributo, «Para ti».
   */
  private readonly portadaTopic = this.portada ? inject(new HostAttributeToken('tema'), { optional: true }) : null;
  /** Portada: el orden completo del feed, del que sale el Tap que sigue (`nextTap`). */
  private following: ITap[] = [];

  protected readonly topic = signal<string | null>(this.query.get('tema') ?? this.portadaTopic);
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
  /**
   * Sonido general (el altavoz de la barra y la tecla M): encendido por defecto, sin aviso previo. El navegador no deja sonar
   * nada antes de un gesto, así que el primer toque, clic o tecla en la página arranca efectos y música (con fundido). Si la
   * persona lo apagó, sigue apagado (clave sin versionar: antes solo se escribía al tocar el botón, así que 'off' siempre es
   * una decisión suya; el «pendiente» anterior era la ausencia de clave y ahora cae en el nuevo defecto).
   */
  protected readonly sound = signal<TSoundEstado>(null);
  /** Instante (performance.now) en que el feed empezó a responder: un clic anterior (repetido al hidratar) no enciende. */
  private vivoDesde = Infinity;
  /** Lo que muestran los controles de música y voz: con el silencio general activo, ninguna suena, así que se ven apagadas. */
  protected readonly musicaEfectiva = computed(() => this.musica.encendida() && this.sound() === 'on');
  protected readonly vozEfectiva = computed(() => { const v = this.voice(); return v === 'on' && this.sound() !== 'on' ? 'off' : v; });
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
  /** La hoja «Tu día» se abrió para ver las colecciones (desde el resultado, el fin del feed o el menú). */
  protected readonly hojaFoco = signal<'colecciones' | null>(null);

  // ───────────── reto del día (taps.reto.ts, mejora 4) ─────────────
  /** `/hoy`: alias del reto del día para los Shorts. El reto va primero aunque sea la primera visita. */
  protected readonly retoRoute = this.snapshot.data['reto'] === true;
  /**
   * /hoy: el HTML (prerender) y el primer pintado traen una portada del reto sin opciones («Reto del día», cargando), con el
   * mismo armazón. Al hidratar se sabe la fecha de Colombia, el reto pasa al frente y recién ahí se puede jugar y se mide.
   */
  protected readonly retoListo = signal(false);
  /** Fecha de Colombia; null en el servidor y antes de hidratar (el HTML prerenderizado no sabe qué día se abre). */
  private readonly fechaHoy = signal<string | null>(null);
  protected readonly reto = computed(() => { const f = this.fechaHoy(); return f ? dailyTap(TAPS, f) : null; });
  protected readonly retoId = computed(() => (this.portada ? null : this.reto()?.tap.id ?? null));
  /** El intento que cuenta (el primero del día). */
  private readonly retoGuardado = signal<IRetoGuardado | null>(null);
  protected readonly retoVista = computed<IRetoVista | null>(() => {
    const r = this.reto(), g = this.retoGuardado();
    if (!r || this.portada) return null;
    const temaNombre = this.topics.find(t => t.topic.id === r.tema)?.topic.name ?? r.tema;
    return { numero: r.numero, tapId: r.tap.id, temaNombre, hecho: g ? { score: retoScore(g), total: r.tap.questions.length, answers: g.answers } : null };
  });
  /** Partida (número de repetición) con la que se jugó el intento oficial en esta carga; -1 si fue en otra visita. */
  private retoPartida = -1;
  private retoVisto = false;

  // ───────────── colecciones (taps.coleccion.ts, mejora 5) ─────────────
  private readonly cols = colecciones(TAPS);
  private readonly colGuardada = signal<IColeccionGuardada>(emptyColecciones());
  protected readonly avancesCol = computed<IAvanceColeccion[]>(() => this.cols.map(c => avanceColeccion(c, TAPS, this.colGuardada().mejores, this.interest().done)));
  /** Insignia ganada (o subida) con el último Tap terminado. */
  protected readonly colNueva = signal<{ tapId: string; grado: TGrado } | null>(null);
  /** Insignias por tema para la hoja «Elige un tema». */
  protected readonly insigniasTema = computed(() => {
    const out: Record<string, { ganadas: number; total: number }> = {};
    for (const a of this.avancesCol()) {
      const t = out[a.col.tema] ?? { ganadas: 0, total: 0 };
      out[a.col.tema] = { ganadas: t.ganadas + (a.grado ? 1 : 0), total: t.total + 1 };
    }
    return out;
  });

  // ───────────── pausa sana (mejora 11) ─────────────
  protected readonly pausaAbierta = signal(false);
  protected readonly pausaTexto = signal('');
  private pausa: IPausaSesion = nuevaPausa(0);
  private pausaTimer: ReturnType<typeof setTimeout> | null = null;

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
  /** Último uso de cada escenario (para retirar el 3D en pausa más antiguo). */
  private readonly stageUse = new Map<ITapsStage, number>();
  /** Capa ligera de espera (sin 3D ni sonido) en un Tap vecino: al deslizar ya se ve su fondo y su personaje. */
  private readonly anticipos = new Map<string, ITapsStage>();
  /** Foto fija que deja el escenario al irse de un Tap: el Tap que sale (o al que se vuelve) no queda vacío. Por id de Tap. */
  private readonly huellas = new Map<string, HTMLElement>();
  /** Escenarios creados en pausa por la precarga que aún no se vieron (su espera del 3D empieza al verse). */
  private readonly precargados = new Set<ITapsStage>();
  /** Tareas en reposo pendientes (se cancelan al salir del feed). */
  private readonly reposos = new Set<() => void>();
  /** El 3D ya tuvo que bajar calidad en este equipo: no se precarga otro WebGL. */
  private degradado = false;
  /** Hacia dónde desliza (1 abajo, -1 arriba): se prepara primero el Tap de ese lado. */
  private direction = 1;
  private activeIndex = -1;
  private stageClock = 0;
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
      if (this.pausaTimer) clearTimeout(this.pausaTimer);
      this.revokeDownload();
      this.safeObserver?.disconnect();
      this.stages.forEach(stage => stage.destroy());
      this.stages.clear();
      this.reposos.forEach(cancel => cancel());
      this.reposos.clear();
      this.vaciarCapas();
      this.stageUse.clear();
      this.stage = null;
      this.gate?.dispose();
      this.audio.destruir();
    });
    // Cambió la lista de Taps (orden, filtro): las fotos fijas y capas de espera se retiran (van por id, pero su ranura cambia).
    effect(() => {
      this.taps();
      untracked(() => this.vaciarCapas());
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
      this.vivoDesde = performance.now();
      this.sound.set(this.readStorage(SOUND_KEY) === 'off' ? 'off' : 'on');
      this.stage?.setMuted(this.sound() !== 'on');
      this.startAudio();
      this.musica.iniciar();
      this.interest.set(parseInterest(this.readStorage(INTEREST_KEY), Date.now()));
      this.sesion = parseSesion(this.readStorage(SESION_KEY));
      this.loadColecciones();
      this.refreshReto();
      if (!this.portada) {
        this.pausa = parsePausa(this.readSession(PAUSA_KEY), Date.now());
        this.savePausa();
      }
      if (this.retoRoute) this.track(null, 'taps/reto-dia/llegada-hoy');
      this.semilla = Math.floor(Math.random() * 1e9);
      this.sessionStart = performance.now();
      this.shortcuts.set(this.readStorage(KEYS_KEY) !== 'off');
      this.menuInverted.set(this.readStorage(MENU_KEY) === 'inv');
      this.watchViewport();
      this.gate = new LoadingGate(visible => this.skeleton.set(visible), 300, 500);
      this.gate.set(this.stageMode() === 'loading');
      const reordered = this.applyWantedOrder();
      if (this.retoRoute) this.retoListo.set(true);
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
      if (reordered || this.retoRoute) afterNextRender(start, { injector: this.injector }); else start();
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
    const target = this.portada ? this.portadaPick() : this.placeReto(freshHead(base, this.interest(), now, 2, fixed, this.topic()), fixed, now);
    const current = this.taps().map(t => t.id).join(), wanted = target.map(t => t.id).join();
    const answered = Object.values(this.runs()).some(r => r.answers.length > 0) || !!(globalThis as { __tapsPre?: unknown }).__tapsPre;
    if (current === wanted || answered) return false;
    this.taps.set(target);
    this.activeId.set(target[0].id);
    this.activeIndex = -1;
    return true;
  }

  /**
   * El reto del día entra como primer Tap del día (tras el del enlace, si lo hay) para quien ya jugó antes y aún no lo hizo
   * hoy. Quien llega por primera vez empieza por el Tap de gancho (fácil a propósito) y encuentra el reto en «Tu día», en el
   * resultado y al final del feed. Con un tema elegido solo entra si es de ese tema. Si lo jugó hace menos de 14 días (en
   * otro reto o en el feed) no ocupa la cabeza: la regla de novedad manda. En `/hoy` va primero siempre.
   */
  private placeReto(list: ITap[], fixed: number, now: number): ITap[] {
    const r = this.reto(), tap = r ? list.find(t => t.id === r.tap.id) : undefined;
    if (!tap) return list;
    if (this.retoRoute) return [tap, ...list.filter(t => t !== tap)];
    const interest = this.interest();
    const returning = Object.keys(interest.done).length > 0;
    const recent = (interest.done[tap.id] ?? 0) > now - NOVELTY_MS;
    const topicOk = this.topic() === null || topicOf(tap) === this.topic();
    if (!returning || this.retoGuardado() || recent || !topicOk || list.indexOf(tap) < fixed) return list;
    const rest = list.filter(t => t !== tap);
    rest.splice(fixed, 0, tap);
    return rest;
  }

  /** Fecha de Colombia de ahora: el reto del día y su intento guardado (cambian a la medianoche de Colombia). */
  private refreshReto(): void {
    const fecha = fechaColombia(Date.now());
    if (fecha === this.fechaHoy()) return;
    this.fechaHoy.set(fecha);
    this.retoGuardado.set(parseReto(this.readStorage(RETO_KEY), fecha));
    this.retoPartida = -1;
  }

  /** ¿Es el reto de hoy? (nunca en la portada). */
  private isReto(tap: ITap): boolean { return this.retoId() === tap.id; }

  /** El reto visto desde el resultado del Tap del reto: su número, el intento oficial y si esta partida es una repetición. */
  protected retoResultado(tap: ITap): IRetoResultado | null {
    const r = this.reto(), g = this.retoGuardado();
    if (!r || !this.isReto(tap)) return null;
    return {
      numero: r.numero, oficial: g ? { score: retoScore(g), total: tap.questions.length } : null,
      repeticion: !!g && this.retoPartida !== (this.partidas.get(tap.id) ?? 0),
    };
  }

  /**
   * «Jugar el reto de hoy» (hoja «Tu día», fin del feed, menú de escritorio): el reto pasa a ser el siguiente Tap y el feed
   * se desliza hasta él (sin recorrer los de en medio). En la portada, el feed completo abre en el reto.
   */
  protected goToReto(origen: string): void {
    const r = this.reto();
    if (!r) return;
    this.track(null, `taps/reto-dia/abrir/${origen}`);
    if (this.hojaDia()) this.closeDay();
    if (this.portada) { this.toFeed({ t: r.tap.id }); return; }
    const list = this.taps(), active = this.activeTap(), tap = list.find(t => t.id === r.tap.id);
    if (!tap || tap === active) { if (tap) this.focusLater(tap, this.run(tap).finished ? '.res__title' : '.tap__q'); return; }
    const reordered = list.filter(t => t !== tap), at = reordered.indexOf(active) + 1;
    reordered.splice(at, 0, tap);
    this.taps.set(reordered);
    this.activeIndex = at - 1;
    afterNextRender(() => {
      this.sections()[at]?.nativeElement.scrollIntoView({ behavior: this.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }, { injector: this.injector });
  }

  /** El reto terminado: el primer intento del día queda como el oficial; los siguientes no lo cambian. */
  private registerReto(tap: ITap, run: ITapRun): void {
    const r = this.reto();
    if (!r || !this.isReto(tap)) return;
    if (this.retoGuardado()) { this.track(null, 'taps/reto-dia/repetir'); return; }
    const g: IRetoGuardado = { fecha: r.fecha, numero: r.numero, tapId: tap.id, answers: run.answers };
    this.retoGuardado.set(g);
    this.retoPartida = this.partidas.get(tap.id) ?? 0;
    this.writeStorage(RETO_KEY, JSON.stringify(g));
    this.track(null, 'taps/reto-dia/completar');
  }

  /** «Retar a un amigo con el reto» desde la hoja «Tu día»: comparte el intento oficial (sin respuestas). */
  protected shareReto(): void {
    const r = this.reto(), g = this.retoGuardado();
    if (!r || !g) return;
    this.closeDay();
    void this.challenge(r.tap);
  }

  // ───────────── colecciones ─────────────
  /** Mejor puntaje guardado por Tap; lo jugado antes de las colecciones se toma de «Ya lo jugaste: 3/5» (taps.sesion). */
  private loadColecciones(): void {
    const g = parseColecciones(this.readStorage(COLECCION_KEY));
    const done = this.interest().done, semilla: Record<string, number> = {};
    for (const [id, p] of Object.entries(this.sesion.puntajes)) if (done[id] && g.mejores[id] === undefined) semilla[id] = p;
    // Lo que ya merece insignia queda anotado como ganado: no se vuelve a celebrar al terminar el próximo Tap.
    this.colGuardada.set(sembrarInsignias({ ...g, mejores: { ...semilla, ...g.mejores } }, this.cols, TAPS, done));
  }

  /** La colección del Tap en el resultado (null en el servidor: el resultado solo existe en el navegador). */
  protected coleccionDeTap(tap: ITap): IAvanceColeccion | null {
    if (!this.live()) return null;
    const col = coleccionDe(this.cols, tap.id);
    return col ? this.avancesCol().find(a => a.col.id === col.id) ?? null : null;
  }

  private registerColeccion(tap: ITap, run: ITapRun): void {
    const { guardada, nueva } = registrarPuntaje(this.colGuardada(), tap, run.score, this.cols, TAPS, this.interest().done);
    this.colGuardada.set(guardada);
    this.writeStorage(COLECCION_KEY, JSON.stringify(guardada));
    this.colNueva.set(nueva ? { tapId: tap.id, grado: nueva.grado } : null);
    if (nueva) this.track(null, `taps/coleccion/${eventSlug(nueva.col.id)}/${nueva.grado}`);
  }

  /** El siguiente Tap con la pregunta que lo abre (adelanto en el resultado, sin la respuesta). */
  protected siguienteDe(tap: ITap): { title: string; q: string; color: string } | null {
    const up = this.nextTap(tap);
    if (!up) return null;
    const r = this.runs()[up.id];
    return { title: up.title, q: up.questions[r && !r.finished ? r.index : 0]?.q ?? up.questions[0].q, color: this.topicColor(up) };
  }

  /** Fila de la colección en el resultado: la hoja «Tu día» en sus colecciones (en la portada, el feed completo). */
  protected verColecciones(tap: ITap): void {
    if (this.portada) { this.track(null, 'taps/coleccion/abrir/resultado'); this.toFeed({}); return; }
    this.openDay('colecciones', this.nextTap(tap) ? 'resultado' : 'fin');
  }

  // ───────────── fin del feed ─────────────
  protected finTemas(): void { this.track(null, 'taps/fin-feed/temas'); this.openTopics(); }
  protected finCursos(): void { this.track(null, 'taps/fin-feed/cursos'); }
  protected finReto(): void { this.track(null, 'taps/fin-feed/reto'); this.goToReto('fin'); }
  /** «Revancha: a 1 de…» (el «casi» honesto del resultado). */
  protected revancha(tap: ITap): void { this.track(null, `taps/revancha/${eventSlug(tap.id)}`); this.restart(tap); }

  // ───────────── pausa sana ─────────────
  private savePausa(): void { this.writeStorage(PAUSA_KEY, JSON.stringify(this.pausa), true); }

  /**
   * Tiempo activo de la sesión (pestaña visible + interacción): responder, pasar de Tap y terminar uno. 30 min o más sin
   * actividad, o un día nuevo, la reinician (taps.sesion.ts).
   */
  private actividad(tapTerminado = false): void {
    if (this.portada || !this.live()) return;
    this.pausa = registrarActividad(this.pausa, Date.now(), tapTerminado);
    this.savePausa();
  }

  /**
   * En un momento natural (al terminar un Tap o al pasar a otro), tras 30 min de juego activo: el personaje sugiere un descanso.
   * Una vez por sesión de la pestaña; nunca en la portada. Llega un instante después para no tapar el título recién ganado.
   */
  private checkPause(): void {
    if (this.portada || !shouldSuggestPause(this.pausa)) return;
    this.pausa = { ...this.pausa, sugerida: true };
    this.savePausa();
    const open = () => {
      this.pausaTimer = null;
      if (this.sheetOpen()) { this.pausaTimer = setTimeout(open, 3000); return; }   // otra hoja abierta: espera a que se cierre
      const r = this.resumen();
      this.pausaTexto.set(pauseSummary(r.meta.hechos, insigniasGanadas(this.avancesCol()), r.racha));
      this.pausaAbierta.set(true);
      this.sheetOpen.set(true);
      this.clock.pause();
      this.audio.callar();
      this.musica.pausar('pausa-sana');
      this.stage?.say('¿Un descanso?', { ms: 3500, voz: false });
      this.track(null, 'taps/pausa/sugerida');
    };
    this.pausaTimer = setTimeout(open, 1200);
  }

  protected onPausaDescanso(): void { this.track(null, 'taps/pausa/aceptada'); }

  protected closePausa(descanso: boolean): void {
    if (!this.pausaAbierta()) return;
    this.pausaAbierta.set(false);
    this.sheetOpen.set(false);
    this.musica.reanudar('pausa-sana');
    if (!descanso) this.track(null, 'taps/pausa/seguir');
    if (!this.held && !this.document.hidden) this.clock.resume();
  }

  // ───────────── portada (modo="portada") ─────────────
  private onlyFirstInPortada(list: ITap[]): ITap[] {
    if (!this.portada) return list;
    this.following = list;
    return list.slice(0, 1);
  }

  /**
   * Portada, ya en el navegador: «Para ti» con lo aprendido (o, con `tema`, los de ese tema primero) y, primero, un Tap que
   * esta persona aún no completó.
   */
  private portadaPick(): ITap[] {
    const done = this.interest().done;
    const hookDone = this.hookDone || HOOK_TAP_IDS.some(id => id in done);
    const ordered = orderFeed(TAPS, { hookDone, topic: this.portadaTopic });
    this.following = this.portadaTopic ? ordered : personalize(ordered, 2, this.interest(), Date.now());
    const first = this.following.find(t => !(t.id in done)) ?? this.following[0];
    this.following = [first, ...this.following.filter(t => t !== first)];
    return [first];
  }

  /**
   * Portada: seguir jugando es pasar al feed completo, que retoma lo jugado (sessionStorage) y abre en ese Tap o tema. El
   * audio pasa al feed nuevo (taps-audio-relevo.ts): la música que suena no se corta ni vuelve a empezar.
   */
  private toFeed(queryParams: { t?: string; tema?: string | null }): void {
    this.audio.relevarAlSalir();
    this.musica.relevarAlSalir();
    void this.router.navigate(['/taps'], { queryParams }).then(ok => {
      if (ok) return;
      this.audio.relevarAlSalir(false);                            // no se navegó: el audio sigue siendo de este feed
      this.musica.relevarAlSalir(false);
    }, () => { this.audio.relevarAlSalir(false); this.musica.relevarAlSalir(false); });
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
  /** Escena de la pregunta a la vista (código, operación, serie, objeto o diagrama): la dibuja el motor en `.tap__escena`. */
  protected escenaOf(tap: ITap, run: ITapRun): ITapEscena | null {
    const mode = this.stageMode();
    return questionEscena(tap, run, mode === '3d' || mode === 'light' || mode === 'poster', !!this.visualOf(tap, run));
  }
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
    this.actividad();
    if (this.sound() === 'on') this.audio.desbloquear();           // dentro del gesto: el navegador solo deja sonar así
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
    this.stage.clearEscena?.();                                    // tras fallar, el objeto que explica ocupa el sitio de la escena
    void this.stage.visual(spec, el, { side: this.visualSide(tap) }).then(label => {
      if (!label) { el.hidden = true; return; }
      // el lienzo va dentro del botón (hijos de presentación): la descripción del objeto va en el nombre accesible del botón
      el.setAttribute('aria-label', `Explicación con un objeto: ${label.trim()} Pulsa para verla otra vez.`);
    }, () => { el.hidden = true; });
  }

  /**
   * Pregunta nueva a la vista (o el resultado): pequeño cambio de plano de cámara (modo cine, determinista por Tap y pregunta)
   * y, si la pregunta trae escena, la pide al motor cuando la vista ya pintó su hueco.
   */
  private showQuestionScene(tap: ITap): void {
    const stage = this.stage;
    if (!stage || tap.id !== this.activeId()) return;
    const run = this.run(tap);
    stage.plano?.(run.finished ? 0 : run.index, planoSeed(tap.id));
    stage.clearEscena?.();
    this.watchSafeArea(this.activeIndex);
    if (!run.finished && tap.questions[run.index]?.escena) afterNextRender(() => this.mountEscena(tap), { injector: this.injector });
  }

  private mountEscena(tap: ITap): void {
    const section = this.sections()[this.taps().indexOf(tap)]?.nativeElement;
    const el = section?.querySelector<HTMLElement>('.tap__escena');
    const spec = this.escenaOf(tap, this.run(tap));
    if (!el || !spec || !this.stage?.escena || tap.id !== this.activeId()) return;
    el.hidden = false;
    void this.stage.escena(spec, el, { side: 'izq' }).then(label => { if (!label) el.hidden = true; }, () => { el.hidden = true; });
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
    this.musica.alTap(tap);                                        // la canción del resultado no sigue sobre la pregunta
    this.stage?.say('');
    this.stage?.react('ask');
    this.readQuestion(tap);
    this.showQuestionScene(tap);
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
    this.showQuestionScene(tap);
    if (run.finished) {
      const rachaAntes = this.resumen().racha;
      this.track('taps-completar', `taps/completar/${eventSlug(tap.id)}`);
      this.completedThisSession++;
      this.updateInterest(i => markCompleted(i, tap, Date.now()));
      this.ahora.set(Date.now());
      this.onSessionTap(tap, run);
      this.registerColeccion(tap, run);
      this.refreshReto();                                             // pasada la medianoche cuenta el reto del día nuevo
      this.registerReto(tap, run);
      this.actividad(true);
      this.checkPause();
      this.reorderTail();
      if ([1, 2, 3, 4, 6, 10].includes(this.completedThisSession)) this.track(null, `taps/hito/${this.completedThisSession}`);
      this.onFinished(tap, run, rachaAntes);
      this.focusLater(tap, '.res__title');
    } else {
      this.questionShownAt = performance.now();
      if (tap.id === this.activeId()) { this.stage?.react('ask', { say: false }); this.readQuestion(tap); }
      if (tap.questions[run.index]?.visual) void this.stage?.preloadVisuals?.();
      this.focusLater(tap, '.tap__q');
      if (run.index === 2) this.preloadAhead(this.activeIndex);   // llega a la pregunta 3: se adelanta el escenario de los siguientes
    }
  }

  private onFinished(tap: ITap, run: ITapRun, rachaAntes = this.resumen().racha): void {
    if (tap.id === this.activeId()) {
      this.celebrateResult(tap, run);
      this.audio.tocar('resultado', { tema: tap.theme, puntaje: run.score / tap.questions.length });
      // Canción con letra solo aquí (5/5 o racha nueva), nunca sobre una pregunta; si no, la instrumental de premios.
      this.musica.alResultado({ perfecto: run.score === tap.questions.length, racha: this.resumen().racha > rachaAntes });
      // Portada: «Siguiente» lleva a /taps y su primer Tap cambia de pista. Se baja ya; si no, al cortar la canción quedaban
      // segundos de silencio en 4G mientras llegaba (en /taps lo hace preloadAhead).
      const siguiente = this.portada ? this.nextTap(tap) : null;
      if (siguiente) this.musica.anticipar(siguiente);
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
    if (this.document.hidden) { this.clock.pause(); this.audio.pausar(); this.actividad(); }
    else {
      if (!this.portada && this.live()) { this.pausa = reanudarPausa(this.pausa, Date.now()); this.savePausa(); }   // lo oculto no cuenta
      this.audio.reanudar();
      if (!this.held && !this.sheetOpen()) this.clock.resume();
    }
    if (this.document.hidden && !this.sharing) this.countSession();
    if (!this.document.hidden) { this.ahora.set(Date.now()); this.refreshReto(); }
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
  protected openDay(foco: 'colecciones' | null = null, origen = 'barra'): void {
    if (this.portada) return;
    if (this.hojaDia()) return;
    this.track(null, foco ? `taps/coleccion/abrir/${origen}` : 'taps/dia/abrir');
    if (foco && origen === 'fin') this.track(null, 'taps/fin-feed/colecciones');
    this.hojaFoco.set(foco);
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
  /**
   * Silencio general (altavoz de la barra, tecla M o «Sonido» en «Tu día»): calla o devuelve TODO (efectos, música y voz)
   * sin tocar las preferencias de música y voz, que vuelven tal como estaban. Mide `taps/sonido/<on|off>/<origen>`.
   */
  protected toggleSound(origen: 'barra' | 'tecla' | 'dia' = 'barra', t?: number): void {
    // Un clic sobre el altavoz neutro, antes de hidratar (Angular lo repite al hidratar), nunca termina encendiendo: quien
    // lo tocó sin saber el estado probablemente quería silencio.
    const aCiegas = this.sound() === null || (t !== undefined && t < this.vivoDesde);
    const on = aCiegas ? false : this.sound() !== 'on';
    this.setSound(on);
    this.track(null, `taps/sonido/${on ? 'on' : 'off'}/${origen}`);
  }

  private setSound(on: boolean): void {
    this.sound.set(on ? 'on' : 'off');
    this.stage?.setMuted(!on);
    this.writeStorage(SOUND_KEY, on ? 'on' : 'off');
    if (on) this.audio.desbloquear();
    this.audio.silenciar(!on);
    if (on) this.audio.tocar('toque', { tema: this.activeTap().theme });
  }

  /**
   * «Música de fondo» (hoja «Tu día» en el celular, menú en escritorio): encendida por defecto y se recuerda si la apagan.
   * Encenderla con el sonido general apagado también lo enciende (quien pide música quiere oírla). Dentro del gesto:
   * desbloquea el audio en ese toque.
   */
  protected toggleMusica(): void {
    // Con el silencio general activo el interruptor se ve apagado aunque la preferencia sea «encendida»: tocarlo la hace
    // sonar (enciende el sonido) en vez de apagarla.
    if (this.sound() !== 'on' && this.musica.encendida()) {
      this.setSound(true);
      this.musicaDe(this.activeTap());
      this.track(null, 'taps/musica/on');
      return;
    }
    const on = this.musica.alternar();
    if (on && this.sound() !== 'on') this.setSound(true);
    if (on) this.musicaDe(this.activeTap());
    this.track(null, on ? 'taps/musica/on' : 'taps/musica/off');
  }

  /** La pista del Tap a la vista: la de su mundo o, si ya se terminó (se volvió a su resultado), la instrumental de premios. */
  private musicaDe(tap: ITap): void {
    if (this.run(tap).finished) this.musica.alResultado({ perfecto: false, racha: false }); else this.musica.alTap(tap);
  }

  /** «Voz»: el personaje lee la pregunta en voz alta. Encenderla también enciende el sonido (sin sonido no hay voz). */
  protected toggleVoice(): void {
    const now = this.voice();
    if (now !== 'on' && now !== 'off') return;
    // Igual que la música: en silencio general la voz se ve apagada; tocarla la hace sonar sin cambiar la preferencia.
    if (now === 'on' && this.sound() !== 'on') {
      this.setSound(true);
      this.readQuestion(this.activeTap());
      this.track(null, 'taps/voz/encender');
      return;
    }
    const on = now !== 'on';
    this.voice.set(on ? 'on' : 'off');
    this.writeStorage(VOZ_KEY, on ? 'on' : 'off');
    this.audio.activarVoz(on);
    this.syncStageVoice();
    if (on && this.sound() !== 'on') this.setSound(true);
    if (on) this.readQuestion(this.activeTap());                // dentro del gesto: iOS solo deja hablar así la primera vez
    this.track(null, on ? 'taps/voz/encender' : 'taps/voz/apagar');
  }

  /**
   * Tras hidratar: módulo de sonido en reposo, desbloqueo con el primer gesto y la voz si la persona la dejó encendida.
   * En /taps cualquier gesto real (toque, clic, tecla; deslizar no cuenta para el navegador) arranca efectos y música en ese
   * momento. En la portada no: allí el audio (efectos y música) se desbloquea solo al responder (choose), porque un toque en
   * otra parte de la página (un enlace, el menú) no es jugar.
   * En reposo se deja lista la música del Tap a la vista (bajada y decodificada, sin sonar): el primer gesto la arranca ya.
   */
  /**
   * Primera señal de que la persona va a jugar: toca la tarjeta (pointerdown/touchstart), la tiene a la vista 2 s o desplaza.
   * Entonces se decodifica la música ya bajada (antes solo se bajaron los bytes): quien abre y se va no gasta CPU ni memoria.
   */
  private vigilarIntencion(): void {
    const host = this.host.nativeElement;
    const opts = { capture: true, passive: true } as const;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let obs: IntersectionObserver | null = null;
    const quitar = () => {
      if (timer) clearTimeout(timer);
      obs?.disconnect();
      host.removeEventListener('pointerdown', ya, opts);
      host.removeEventListener('touchstart', ya, opts);
      removeEventListener('scroll', ya, opts);
    };
    function ya(this: unknown) { quitar(); musica.intencion(); }
    const musica = this.musica;
    if (typeof IntersectionObserver !== 'undefined') {
      obs = new IntersectionObserver(([e]) => {
        if (timer) { clearTimeout(timer); timer = null; }
        if (e?.isIntersecting) timer = setTimeout(ya, 2000);
      }, { threshold: 0.01 });
      obs.observe(host);
    }
    host.addEventListener('pointerdown', ya, opts);
    host.addEventListener('touchstart', ya, opts);
    addEventListener('scroll', ya, opts);                         // en captura: también el desplazamiento del feed
    this.destroyRef.onDestroy(quitar);
  }

  private startAudio(): void {
    this.audio.silenciar(this.sound() !== 'on');
    if (!this.portada) this.audio.escucharGestos(() => this.sound() === 'on');
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    const go = () => {
      void this.audio.precargar().then(() => {
        const tap = this.activeTap();
        this.audio.precalentar(tap.theme);
        if (this.sound() === 'on' && !this.run(tap).finished) { this.musica.precargar(tap); this.vigilarIntencion(); }
      });
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
    // Reto del día: tarjeta tipo Wordle con el número y el intento oficial (el primero), sin el título del Tap ni respuestas,
    // y el enlace a /hoy (tarjeta neutra), no a /t/<id> (su vista previa trae la primera pregunta).
    const r = this.isReto(tap) ? this.retoVista() : null, oficial = r?.hecho;
    const url = r ? retoUrl(location.origin) : shareUrl(location.origin, tap.id), file = this.shareFiles.get(tap.id);
    if (r) this.track(null, 'taps/reto-dia/compartir');
    const text = (withUrl?: string) => (r && oficial
      ? retoShareText(r.numero, r.temaNombre, oficial.answers, oficial.total, withUrl)
      : shareText(tap, this.run(tap), withUrl));
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    this.sharing = true;
    try {
      if (file && nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Taps de GEMS LMS', text: text(url) });
        this.track(null, 'taps/compartir-ok/nativo');
        return;
      }
      if (nav.share) { await nav.share({ title: 'Taps de GEMS LMS', text: text(), url }); this.track(null, 'taps/compartir-ok/nativo'); return; }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;      // la persona cerró el menú
    } finally { this.sharing = false; }
    await this.copy(tap, text(url), url, file);
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
      // El reto comparte su intento oficial (el primero del día) con el número del reto en lugar del nombre del Tap.
      const oficial = this.isReto(tap) ? this.retoVista() : null;
      const answers = oficial?.hecho?.answers ?? run.answers, score = answers.filter(Boolean).length;
      const canvas = drawShareCard({
        tapTitle: oficial ? retoLabel(oficial.numero) : tap.title, title: resultFor(tap, score).title, score, total: tap.questions.length,
        answers, backdrop: tap.backdrop, character, logo,
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
      case 'sound': this.toggleSound('tecla'); break;
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

  // ───────────── zona segura del escenario (motor v11) ─────────────
  private safeObserver: ResizeObserver | null = null;
  private safeEl: HTMLElement | null = null;

  /**
   * El personaje se dibuja en lo que queda a la vista: entre la barra (con el progreso) y la tarjeta de la pregunta, que en el
   * celular ocupa la mitad de abajo. Esa zona es justo `.tap__world` (flex: 1 entre los pasos y el panel): se mide respecto
   * del escenario y se le pasa al motor, y otra vez cada vez que cambia de alto (pregunta más larga, explicación, resultado).
   * Donde el panel no tapa al personaje, el motor no cambia nada.
   */
  private watchSafeArea(index: number): void {
    const section = this.sections()[index]?.nativeElement;
    const world = section?.querySelector<HTMLElement>('.tap__world') ?? null;
    if (!world) {                                                     // Tap sin montar: nada que observar y el escenario entero a la vista
      this.safeObserver?.disconnect();
      this.safeEl = null;
      this.stage?.setSafeArea?.(null);
      return;
    }
    if (typeof ResizeObserver !== 'undefined' && this.safeEl !== world) {
      this.safeObserver ??= new ResizeObserver(() => this.syncSafeArea());
      this.safeObserver.disconnect();
      this.safeObserver.observe(world);
    }
    this.safeEl = world;
    this.syncSafeArea();
  }

  private syncSafeArea(): void {
    const stage = this.stage, world = this.safeEl, slot = this.slots()[this.activeIndex]?.nativeElement;
    if (!stage?.setSafeArea || !world?.isConnected || !slot) return;
    const s = slot.getBoundingClientRect(), w = world.getBoundingClientRect();
    if (s.height < 1 || w.height < 1) return;
    stage.setSafeArea({ top: Math.max(0, Math.round(w.top - s.top)), bottom: Math.max(0, Math.round(s.bottom - w.bottom)) });
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
    if (previous >= 0) this.direction = index < previous ? -1 : 1;
    this.activeIndex = index;
    this.activeId.set(tap.id);
    this.ahora.set(Date.now());
    this.refreshReto();                                               // pasada la medianoche de Colombia, el reto cambia
    if (previous >= 0) { this.audio.callar(); this.audio.tocar('deslizar', { tema: tap.theme }); }
    this.musicaDe(tap);
    if (this.run(tap).answers.length === 0 && !this.tapStart.has(tap.id)) this.tapStart.set(tap.id, Date.now());
    if (this.notice()?.tapId !== tap.id) this.notice.set(null);
    this.syncUrl(tap, previous);
    if (!this.seen.has(tap.id)) { this.seen.add(tap.id); this.track('taps-ver', `taps/ver/${eventSlug(tap.id)}`); }
    if (previous >= 0 && index > previous) this.track('taps-siguiente', 'taps/siguiente');
    if (this.isReto(tap) && !this.retoVisto) { this.retoVisto = true; this.track(null, 'taps/reto-dia/ver'); }
    if (previous >= 0) this.actividad();
    if (previous >= 0 && this.run(tap).answers.length === 0) this.checkPause();   // pasar a un Tap nuevo también es un buen momento
    try {
      const stage = await this.ensureStage(tap);
      if (token !== this.token || !stage) return;
      const slot = this.slots()[index].nativeElement, root = stage.root;
      // Llega desde otro Tap: deja su foto fija allá y, si aquí ya se ve algo (foto o capa de espera), entra con un fundido
      // cuando su escena ya está puesta, en vez de aparecer de golpe sobre el degradado.
      const llega = !!root && root.parentElement !== slot, tapado = llega && (this.huellas.has(tap.id) || this.anticipos.has(tap.id));
      if (llega) this.dejarHuella(stage);
      if (tapado) root!.style.opacity = '0';
      stage.attachTo(slot);
      this.watchSafeArea(index);
      stage.resume();
      try { await stage.setScene(tap.scene); } finally { this.mostrar(stage, index, tapado && token === this.token); }
      if (token !== this.token) return;
      const run = this.run(tap);
      if (run.finished) this.celebrateResult(tap, run); else { stage.say(''); stage.react('ask', { say: false }); this.readQuestion(tap); }
      this.showQuestionScene(tap);
      this.audio.precalentar(tap.theme);
      if (tap.questions.some(q => q.visual)) void stage.preloadVisuals?.();
      if (tap.questions.some(q => q.escena)) void stage.preloadEscenas?.();
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
    if (this.retoRoute && previous < 0) return;                     // /hoy se queda mientras se ve el reto con el que se entró
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
    const id = this.sharedRoute ? this.safeDecode(path.replace(/^\/t\//, ''))
      : path === '/hoy' ? this.reto()?.tap.id ?? null : new URLSearchParams(search).get('t');
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
   * alterna Minecraft (3D), estudio (2D) y aventura (3D glTF), y recrear el motor en cada deslizada sería lento. Solo el del
   * Tap a la vista dibuja; los demás quedan en pausa. Como mucho se mantiene UN escenario WebGL en pausa además del activo:
   * al crear uno nuevo (o cuando su 3D resulta ser WebGL) se destruye el WebGL en pausa más antiguo, para no tener a la vez
   * dos contextos WebGL y dos copias de three/skinview3d en memoria. Volver a ese tema lo crea de nuevo.
   */
  private async ensureStage(tap: ITap): Promise<ITapsStage | null> {
    const known = this.stages.get(tap.theme);
    if (known) return this.switchStage(known);
    const { create } = await loadTapsEngine();
    if (this.stages.has(tap.theme)) return this.switchStage(this.stages.get(tap.theme)!);   // otro activate (o la precarga) lo creó mientras cargaba el motor
    // Modo ligero o ahorro de datos: póster fijo, sin pedir el motor 3D.
    const stage = create(this.slots()[this.activeIndex].nativeElement, { theme: tapsThemeUrl(tap.theme), mode: this.lightOnly() ? 'light' : 'auto', audio: this.audio.motorAudio });
    this.stage?.pause();
    this.stage = stage;
    this.retireWebglStages(stage, 1);
    this.wireStage(tap, stage);
    try {
      await stage.ready;
    } catch (error) {
      // theme.json no llegó (red, 500, JSON inválido): se retira ese escenario y el Tap sigue sobre su degradado.
      // El siguiente Tap del mismo tema vuelve a intentarlo.
      this.dropStage(tap.theme, stage);
      throw error;
    }
    performance.mark?.('taps-poster');                              // la capa ligera (póster) ya se ve; el 3D se prepara detrás
    if (this.stage === stage) this.setStageMode(this.pending3d.has(stage) ? 'poster' : stage.mode);
    return stage;
  }

  private dropStage(theme: string, stage: ITapsStage): void {
    this.pending3d.delete(stage);
    this.precargados.delete(stage);
    if (this.stages.get(theme) === stage) this.stages.delete(theme);
    this.stageUse.delete(stage);
    if (this.stage === stage) this.stage = null;
    try { stage.destroy(); } catch { /* ya destruido */ }
  }

  /** Registra un escenario nuevo (activo o precargado) y atiende su modo y su 3D. */
  private wireStage(tap: ITap, stage: ITapsStage): void {
    stage.setVoz?.(this.voice() === 'on' ? this.audio.motorVoz : null);
    this.stages.set(tap.theme, stage);
    this.stageUse.set(stage, ++this.stageClock);
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
    stage.on('degrade', () => { this.degradado = true; this.glassOff(); });
    stage.on('visual', () => { if (stage === this.stage) this.onVisualTouch(); });                     // el 3D va justo: el blur sobre el canvas cuesta fps
    // Un escenario en pausa que pierde su contexto WebGL (el sistema recupera memoria) se retira; deja su foto fija.
    stage.root?.addEventListener('webglcontextlost', () => {
      if (stage === this.stage || this.stages.get(tap.theme) !== stage) return;
      this.dejarHuella(stage);
      this.dropStage(tap.theme, stage);
    }, true);
    // La promesa del 3D puede rechazar si el tema falla: siempre se atiende, o sería un error sin capturar.
    void stage.ready3d.then(mode => {
      this.pending3d.delete(stage);
      if (stage === this.stage) this.setStageMode(mode);
      // Tope: el activo + UN WebGL en pausa. Antes se dejaban 0 en pausa y el tema recién dejado se destruía y se recreaba
      // al volver (otra vez la capa ligera y el salto al 3D). Uno precargado deja otro en pausa solo si el activo no es WebGL.
      if (mode === '3d' && stage.stats().canvas === 'webgl') this.retireWebglStages(stage, stage === this.stage || !this.esWebgl(this.stage) ? 1 : 0);
    }, () => undefined);
  }

  private switchStage(stage: ITapsStage): ITapsStage {
    if (this.stage && this.stage !== stage) this.stage.pause();
    this.stage = stage;
    this.stageUse.set(stage, ++this.stageClock);
    // el precargado se creó en silencio y sin espera del 3D: al verse recibe el sonido, la voz y sus 4 s de espera
    stage.setMuted(this.sound() !== 'on');
    stage.setVoz?.(this.voice() === 'on' ? this.audio.motorVoz : null);
    if (this.precargados.delete(stage) && this.pending3d.has(stage)) stage.setSlow?.(4000);
    this.setStageMode(stage.mode === '3d' ? '3d' : this.pending3d.has(stage) ? 'poster' : 'light');
    return stage;
  }

  /** Cuenta como WebGL: 3D que no es 2D, o uno que aún no decidió su modo. */
  private esWebgl(s: ITapsStage | null): boolean {
    return !!s && s.stats().canvas !== '2d' && (s.mode === '3d' || this.pending3d.has(s));
  }

  /**
   * Destruye los escenarios WebGL en pausa menos usados hasta dejar `keep` (sin contar `current` ni el activo): se conserva el
   * del Tap recién dejado (el más reciente). Uno que aún no decidió su modo cuenta como WebGL salvo que sea 2D.
   */
  private retireWebglStages(current: ITapsStage, keep: number): void {
    const paused = [...this.stages.entries()]
      .filter(([, s]) => s !== current && s !== this.stage && this.esWebgl(s))
      .sort((a, b) => (this.stageUse.get(a[1]) ?? 0) - (this.stageUse.get(b[1]) ?? 0));
    for (const [theme, s] of paused.slice(0, Math.max(0, paused.length - keep))) {
      this.dejarHuella(s);                                            // su Tap no queda vacío si se vuelve a él
      this.dropStage(theme, s);
    }
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

  /** Tarea en reposo con prioridad baja, cancelable (al salir del feed se cancelan las pendientes). */
  private enReposo(fn: () => void, timeout: number): void {
    const g = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let cancel: () => void;
    const run = () => { this.reposos.delete(cancel); fn(); };
    if (g.requestIdleCallback) { const id = g.requestIdleCallback(run, { timeout }); cancel = () => g.cancelIdleCallback?.(id); }
    else { const id = setTimeout(run, Math.min(timeout, 2500)); cancel = () => clearTimeout(id); }
    this.reposos.add(cancel);
  }

  /**
   * Precarga en reposo de los Taps de al lado (experiencia-ux.md §7.1), hacia donde desliza. Todo se corta si cambia de Tap o
   * de dirección (token) o si deja de estar permitida (`precargaPermitida`).
   */
  private preloadAhead(index: number): void {
    this.limpiarVecinos(index);
    if (!this.precargaPermitida()) return;
    const token = this.token, dir = this.direction;
    this.enReposo(() => {
      if (token !== this.token || !this.precargaPermitida()) return;
      void this.prepararVecino(index + dir, true);
      void this.prepararVecino(index - dir, false);
    }, 900);
    for (const offset of [1, 2]) {
      const upcoming = this.taps()[index + offset * dir];
      if (!upcoming) continue;
      this.enReposo(() => {
        if (token !== this.token || !this.precargaPermitida()) return;
        const target = this.stages.get(upcoming.theme);
        if (target) void target.preload(upcoming.scene).catch(() => undefined);
        else this.prefetchTheme(upcoming.theme);
        if (offset === 1) this.musica.anticipar(upcoming);          // solo con la música encendida; sin decodificar
      }, 4000);
    }
  }

  /** Única regla de la precarga: sin ahorro de datos, 2G ni 3G, con red y con la pestaña a la vista. */
  private precargaPermitida(): boolean {
    if (this.lightOnly() || this.document.hidden || !this.status.online()) return false;
    const c = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    return !/(^|-)3g$/.test(c?.effectiveType ?? '');
  }

  /** Equipo justo (≤ 4 GB, calidad baja o ya degradó): la precarga nunca crea otro WebGL, solo la capa de espera. */
  private equipoJusto(): boolean {
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const st = this.stage?.stats();
    return this.degradado || (mem !== undefined && mem <= 4) || st?.tier === 'low' || st?.tier === 'light' || (st?.degraded ?? 0) > 0;
  }

  /**
   * Deja listo el Tap `i` antes de que llegue (adiós al «teletransporte»: antes su ranura quedaba vacía mientras se
   * deslizaba y el escenario aparecía de golpe al pasar el 60 %):
   * · si su tema ya tiene escenario en pausa, se lleva ya a su ranura con su escena puesta (el 3D se ve al deslizar);
   * · hacia adelante, si su tema no tiene escenario y cabe (2D, o ningún otro WebGL en pausa y equipo no justo), se crea
   *   ahí en pausa: tope de contextos intacto (el activo + uno);
   * · si no, una capa ligera de espera (DOM + CSS, sin 3D ni sonido) con su fondo y su personaje en el mismo encuadre.
   */
  private async prepararVecino(i: number, adelante: boolean): Promise<void> {
    const tap = this.taps()[i], slot = this.slots()[i]?.nativeElement;
    if (!tap || !slot || i === this.activeIndex) return;
    const token = this.token, own = this.stages.get(tap.theme);
    const sigue = () => token === this.token && this.precargaPermitida();
    if (own && (own === this.stage || (!adelante && own.root?.parentElement !== slot))) {
      if (!this.huellas.has(tap.id)) await this.crearAnticipo(tap, token);
      return;
    }
    if (own) {
      if (own.root && own.root.parentElement !== slot) { this.dejarHuella(own); own.attachTo(slot); }
      this.ponerArea(own, i);
      await own.setScene(tap.scene).catch(() => undefined);
      if (own.root?.parentElement === slot) this.quitarCapas(tap.id);
      return;
    }
    if (adelante && !this.huellas.has(tap.id)) {
      const sin3d = await this.temaSin3d(tap.theme);
      if (!sigue()) return;
      if (sin3d || (!this.equipoJusto() && ![...this.stages.values()].some(s => s !== this.stage && this.esWebgl(s)))) {
        const { create } = await loadTapsEngine();
        if (!sigue() || this.stages.has(tap.theme) || i === this.activeIndex) return;
        // en pausa y en silencio: el 3D se arma detrás sin dibujar en bucle; su espera de 4 s empieza al verse (switchStage)
        const stage = create(slot, { theme: tapsThemeUrl(tap.theme), mode: 'auto', audio: this.audio.motorAudio, slowMs: 0 });
        stage.pause('precarga');
        this.wireStage(tap, stage);
        stage.setMuted(true);
        this.precargados.add(stage);
        try { await stage.ready; } catch { this.dropStage(tap.theme, stage); return; }
        if (stage !== this.stages.get(tap.theme) || stage === this.stage) return;
        if (!sigue()) { if (this.precargados.has(stage)) this.dropStage(tap.theme, stage); return; }   // dejó de estar permitida: se cancela
        this.ponerArea(stage, i);
        await stage.setScene(tap.scene).catch(() => undefined);
        return;
      }
    }
    if (!this.huellas.has(tap.id)) await this.crearAnticipo(tap, token);
  }

  /** El tema dibuja con Canvas 2D (`canvas: '2d'`, sin WebGL): precargarlo no gasta un contexto WebGL. Lee su theme.json (en caché). */
  private temaSin3d(theme: string): Promise<boolean> {
    let p = this.temas2d.get(theme);
    if (!p) {
      p = fetch(tapsThemeUrl(theme), { priority: 'low' } as RequestInit).then(r => (r.ok ? r.json() : null)).then(t => t?.canvas === '2d', () => false);
      this.temas2d.set(theme, p);
    }
    return p;
  }
  private readonly temas2d = new Map<string, Promise<boolean>>();

  private ranura(id: string): HTMLElement | undefined {
    return this.slots()[this.taps().findIndex(t => t.id === id)]?.nativeElement;
  }

  private async crearAnticipo(tap: ITap, token: number): Promise<void> {
    const slot = this.ranura(tap.id), ocupada = () => !!slot?.querySelector('.te-stage, .te-huella');
    if (!slot || this.anticipos.has(tap.id) || ocupada()) return;
    const { create } = await loadTapsEngine();
    if (token !== this.token || !this.precargaPermitida() || this.anticipos.has(tap.id) || ocupada() || this.ranura(tap.id) !== slot) return;
    const a = create(slot, { theme: tapsThemeUrl(tap.theme), mode: 'light', audio: { play: () => undefined }, slowMs: 0 });
    this.marcarCapa(a.root, 'te-anticipo');
    this.anticipos.set(tap.id, a);
    try {
      await a.ready;
      if (this.anticipos.get(tap.id) !== a) return;
      this.ponerArea(a, this.taps().findIndex(t => t.id === tap.id));
      await a.setScene(tap.scene);
    } catch { if (this.anticipos.get(tap.id) === a) this.quitarAnticipo(tap.id); }
  }

  /** Foto o capa de espera: no es «el» escenario (clase te-huella, no te-stage), sin foco, sin ids ni lector de pantalla. */
  private marcarCapa(el: HTMLElement | undefined, extra: string): void {
    if (!el) return;
    el.classList.replace('te-stage', 'te-huella');
    el.classList.add(extra);
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    el.style.pointerEvents = 'none';
    el.removeAttribute('id');
    el.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  }

  /** Zona segura del Tap `i` (la misma que usa el activo), para que la capa de espera quede en el mismo encuadre. */
  private ponerArea(stage: ITapsStage, i: number): void {
    const slot = this.slots()[i]?.nativeElement, world = this.sections()[i]?.nativeElement.querySelector<HTMLElement>('.tap__world');
    if (!stage.setSafeArea || !slot || !world) return;
    const s = slot.getBoundingClientRect(), w = world.getBoundingClientRect();
    if (s.height < 1 || w.height < 1) return;
    stage.setSafeArea({ top: Math.max(0, Math.round(w.top - s.top)), bottom: Math.max(0, Math.round(s.bottom - w.bottom)) });
  }

  /**
   * Foto fija del escenario donde está ahora (copia del DOM + sus lienzos), antes de llevárselo a otro Tap o destruirlo.
   * Barata: un nodo y drawImage; el lienzo animado a ¼ de resolución (la mitad de ancho y de alto), sin red ni WebGL.
   */
  private dejarHuella(stage: ITapsStage): void {
    const root = stage.root, slot = root?.parentElement;
    if (!root || !slot) return;
    const tap = this.taps()[this.slots().findIndex(s => s.nativeElement === slot)];
    if (!tap) return;
    try {
      const foto = root.cloneNode(true) as HTMLElement;
      foto.querySelectorAll('.te-bubble, .te-fx').forEach(n => n.remove());
      const src = root.querySelectorAll('canvas'), dst = foto.querySelectorAll('canvas');
      src.forEach((c, k) => {
        const d = dst[k];
        if (!d || !c.width || !c.height) return;
        if (c.classList.contains('te-gl')) { d.width = Math.max(1, c.width >> 1); d.height = Math.max(1, c.height >> 1); }
        d.getContext('2d')?.drawImage(c, 0, 0, d.width, d.height);
      });
      this.marcarCapa(foto, 'te-foto');
      foto.style.removeProperty('opacity');
      this.huellas.get(tap.id)?.remove();
      this.quitarAnticipo(tap.id);
      slot.insertBefore(foto, root);
      this.huellas.set(tap.id, foto);
    } catch { /* sin foto: el Tap se ve sobre su degradado, como antes */ }
  }

  /** El escenario ya se ve en el Tap `index` (con fundido si había algo debajo): fuera la foto y la capa de espera. */
  private mostrar(stage: ITapsStage, index: number, fundido: boolean): void {
    const root = stage.root, slot = this.slots()[index]?.nativeElement, id = this.taps()[index]?.id;
    if (!root || !id) return;
    const aqui = root.parentElement === slot;
    root.style.removeProperty('opacity');
    if (!fundido || !aqui || this.reducedMotion() || typeof root.animate !== 'function') { if (aqui) this.quitarCapas(id); return; }
    this.acercarAnticipo(id, stage);
    const anim = root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    anim.finished.then(() => { if (root.parentElement === slot) this.quitarCapas(id); }, () => undefined);
  }

  /**
   * Mientras el escenario entra con su fundido, el personaje de la capa de espera viaja (desde los pies) a donde está el del
   * 3D y se desvanece: mismo sitio y mismo tamaño al terminar, sin dos personajes en lugares distintos.
   */
  private acercarAnticipo(id: string, stage: ITapsStage): void {
    const a = this.anticipos.get(id)?.root, luz = a?.querySelector<HTMLElement>('.te-light'), caja = stage.caja?.();
    if (!a || !luz || !caja || caja.modo !== '3d') return;
    const r = a.getBoundingClientRect(), b = luz.getBoundingClientRect();
    const s = (caja.pies - caja.top) / (b.height || 1), dx = caja.x - ((b.left + b.right) / 2 - r.left), dy = caja.pies - (b.bottom - r.top);
    if (![s, dx, dy].every(Number.isFinite) || s < .3 || s > 3) return;
    luz.style.transformOrigin = '50% 100%';
    luz.style.transition = 'transform 240ms ease-out, opacity 240ms ease-out';
    luz.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)})`;
    luz.style.opacity = '0';
  }

  private quitarCapas(id: string): void {
    this.huellas.get(id)?.remove();
    this.huellas.delete(id);
    this.quitarAnticipo(id);
  }

  private quitarAnticipo(id: string): void {
    const a = this.anticipos.get(id);
    if (!a) return;
    this.anticipos.delete(id);
    try { a.destroy(); } catch { /* ya destruido */ }
  }

  /** Retira todas las fotos y capas de espera (cambió la lista de Taps o se sale del feed). */
  private vaciarCapas(): void {
    for (const id of [...this.huellas.keys(), ...this.anticipos.keys()]) this.quitarCapas(id);
  }

  /** Solo se guardan fotos y capas de espera cerca del Tap a la vista (memoria acotada en el celular). */
  private limpiarVecinos(index: number): void {
    const taps = this.taps();
    for (const id of [...this.huellas.keys(), ...this.anticipos.keys()]) {
      const i = taps.findIndex(t => t.id === id);
      if (i < 0 || Math.abs(i - index) > 2) this.quitarCapas(id);
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

  private readSession(key: string): string | null {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }

  private writeStorage(key: string, value: string, session = false): void {
    try { (session ? sessionStorage : localStorage).setItem(key, value); } catch { /* preferencia solo para esta sesión */ }
  }

  private reducedMotion(): boolean { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
}

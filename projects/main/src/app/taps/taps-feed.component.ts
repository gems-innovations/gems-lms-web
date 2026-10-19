import { DOCUMENT, Location, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, Injector, PLATFORM_ID, REQUEST, computed,
  inject, signal, viewChild, viewChildren,
} from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService, TAnalyticsEvent } from '../analytics.service';
import { TEventPath, eventSlug } from '../analytics-taxonomy';
import { AdvanceClock, TAP_RHYTHM, advanceDelay, browserClockHost } from './taps.clock';
import { loadTapsEngine, tapsThemeUrl } from './taps-engine.loader';
import { TAP_DISPLAY_FONTS, TAP_TOPICS, TAPS } from './taps.data';
import { choose, feedTopics, isGoodScore, next, optionLayout, orderFeed, resultFor, startRun, streak, topicOf } from './taps.logic';
import { canvasToBlob, drawShareCard, loadImage, paintThemeCharacter, shareText, shareUrl } from './taps.share';
import { TapResultComponent } from './tap-result.component';
import { TapsBarComponent } from './taps-bar.component';
import { TapRailComponent } from './tap-rail.component';
import { ITap, ITapRun, ITapsStage } from './taps.types';

const SOUND_KEY = 'gems-taps-sound';
const TEACH_KEY = 'gems-taps-ensenar';
const RUNS_KEY = 'gems-taps-partidas';
/** Cookie (solo para /taps, sin datos personales): el servidor ya no abre con el Tap de gancho a quien lo jugó. */
const HOOK_COOKIE = 'gems_taps_gancho';
const DEFAULT_DESCRIPTION = 'GEMS LMS: aprendizaje, formación y seguimiento en un solo lugar.';
const DESCRIPTION = 'Taps de GEMS LMS: quizzes que juegas con un personaje en vivo. Responde, mira cómo reacciona y gana tu título. Gratis y sin registro.';
const SITE = 'https://lms.gemsinnovations.com';
const OK_WORDS = ['¡Exacto!', '¡Eso es!', '¡Crack!', '¡Fácil para ti!'];
const BAD_WORDS = ['Casi...', 'Uy, por poco', 'Esta era trampa'];
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
  imports: [TapResultComponent, TapsBarComponent, TapRailComponent],
  templateUrl: './taps-feed.component.html',
  styleUrl: './taps-feed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TapsFeedComponent {
  private readonly platform = inject(PLATFORM_ID);
  private readonly analytics = inject(AnalyticsService);
  private readonly injector = inject(Injector);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platform);

  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  /** Quien ya jugó el Tap de gancho (cookie): servidor y navegador leen lo mismo, así el orden coincide al hidratar. */
  private readonly hookDone = this.readHookCookie();

  protected readonly topic = signal<string | null>(this.query.get('tema'));
  /** Orden deseado: `?t=<id>` (enlace compartido) pone ese Tap primero; `?tema=<id>` pone primero los de esa categoría. */
  private readonly wanted = orderFeed(TAPS, { first: this.query.get('t'), topic: this.topic(), hookDone: this.hookDone });
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
  /** Estado del escenario: cargando → 3d | light (ligero) | none (el motor no cargó: el quiz sigue funcionando). */
  protected readonly stageMode = signal<'loading' | '3d' | 'light' | 'none'>('loading');
  protected readonly notice = signal<{ tapId: string; text: string; download?: string } | null>(null);
  /** Cuenta atrás visible tras responder: duración (ms) y si está en pausa (mantener presionado). */
  protected readonly wait = signal<{ tapId: string; ms: number; key: number } | null>(null);
  protected readonly waitPaused = signal(false);
  /** Enseñar a deslizar (máximo 2 veces en la vida): el siguiente Tap asoma y la flecha rebota. */
  protected readonly teach = signal(false);
  protected readonly sheetOpen = signal(false);
  protected readonly live = signal(false);

  private readonly feed = viewChild.required<ElementRef<HTMLElement>>('feed');
  private readonly sections = viewChildren<ElementRef<HTMLElement>>('section');
  private readonly slots = viewChildren<ElementRef<HTMLElement>>('slot');
  private readonly bar = viewChild.required(TapsBarComponent);

  protected readonly activeTap = computed(() => this.taps().find(t => t.id === this.activeId()) ?? this.taps()[0]);
  protected readonly topicName = computed(() => this.topics.find(t => t.topic.id === this.topic())?.topic.name ?? 'Para ti');

  private stage: ITapsStage | null = null;
  private stageTheme: string | null = null;
  private activeIndex = -1;
  private token = 0;
  private waitKey = 0;
  private seen = new Set<string>();
  private questionShownAt = 0;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private held = false;
  private teachShown = false;
  private readonly shareFiles = new Map<string, File>();
  private readonly clock = new AdvanceClock(browserClockHost, () => this.advance());
  private clockTap: ITap | null = null;
  private completedThisSession = 0;
  private firstTouchCounted = false;
  private stageErrorCounted = false;
  /** Ya se agregó una entrada al historial al dejar el primer Tap (Atrás vuelve a él una vez y luego sale). */
  private pushed = false;

  constructor() {
    const html = this.document.documentElement;
    html.classList.add('taps-page');                               // sin fuentes de marca que compitan con el JS del juego
    this.setMeta();
    this.destroyRef.onDestroy(() => {
      html.classList.remove('taps-page');
      html.removeAttribute('data-taps-live');
      html.removeAttribute('data-glass');
      this.clock.cancel();
      this.clearMeta();
      this.stage?.destroy();
      this.stage = null;
    });
    if (!this.isBrowser) return;
    afterNextRender(() => {
      html.setAttribute('data-taps-live', '');                    // desde aquí responde Angular (el script previo se retira)
      performance.mark?.('taps-interactive');
      this.live.set(true);
      this.sound.set(this.readStorage(SOUND_KEY) === 'off' ? 'off' : this.readStorage(SOUND_KEY) === 'on' ? 'on' : 'pending');
      const reordered = this.applyWantedOrder();
      this.restoreRuns();
      this.document.addEventListener('visibilitychange', this.onVisibility);
      this.destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', this.onVisibility));
      // Atrás del navegador (popstate): vuelve al Tap que dice la URL en vez de salir del feed.
      const sub = this.location.subscribe(() => this.onPopState());
      this.destroyRef.onDestroy(() => sub.unsubscribe());
      const asked = this.query.get('t');
      if (asked !== null && !TAPS.some(t => t.id === asked)) {
        this.notice.set({ tapId: this.taps()[0].id, text: 'Este Tap se retiró. Te dejamos uno parecido.' });
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

  /** Tras hidratar: pasa al orden deseado (enlace `?t=`, tema, gancho ya jugado) si nadie respondió todavía. */
  private applyWantedOrder(): boolean {
    const current = this.taps().map(t => t.id).join(), wanted = this.wanted.map(t => t.id).join();
    const answered = Object.values(this.runs()).some(r => r.answers.length > 0) || !!(globalThis as { __tapsPre?: unknown }).__tapsPre;
    if (current === wanted || answered) return false;
    this.taps.set(this.wanted);
    this.activeId.set(this.wanted[0].id);
    this.activeIndex = -1;
    return true;
  }

  // ───────────── vista ─────────────
  protected run(tap: ITap): ITapRun { return this.runs()[tap.id]; }
  protected layout(tap: ITap): string { return optionLayout(tap.questions[this.run(tap).index]?.options ?? []); }
  protected nextTap(tap: ITap): ITap | null { return this.taps()[this.taps().indexOf(tap) + 1] ?? null; }
  protected streakOf(tap: ITap): number { return streak(this.run(tap)); }
  protected shape(k: number): string { return SHAPES[k] ?? ''; }
  protected letter(k: number): string { return 'ABCD'[k] ?? String(k + 1); }
  protected word(tap: ITap): string {
    const run = this.run(tap), ok = run.answers[run.answers.length - 1];
    const list = ok ? OK_WORDS : BAD_WORDS;
    return list[run.index % list.length];
  }
  protected displayFont(tap: ITap): string | null { return TAP_DISPLAY_FONTS[tap.theme] ?? null; }
  protected topicLabel(tap: ITap): string { return this.topics.find(t => t.topic.id === topicOf(tap))?.topic.name ?? tap.kicker; }
  /** «Toca tu respuesta»: solo en la primera pregunta del Tap de gancho, hasta el primer toque. */
  protected showTouchHint(tap: ITap): boolean { const run = this.run(tap); return !!tap.hook && run.index === 0 && run.chosen === null && !run.finished; }

  // ───────────── responder y avanzar ─────────────
  protected choose(tap: ITap, option: number): void {
    if (tap.id !== this.activeId() && this.live()) return;
    if (this.questionShownAt && performance.now() - this.questionShownAt < TAP_RHYTHM.guardMs) return;   // el toque de «adelantar» no responde
    const { run, correct } = choose(this.run(tap), tap, option);
    if (correct === null) return;
    const pre = this.takePreAnswer(tap, option);
    this.setRun(tap, run);
    this.notice.set(null);
    this.track('taps-responder', `taps/responder/${eventSlug(tap.id)}/${run.answers.length}`);
    this.countFirstTouch(pre);
    if (this.sound() === 'pending') { this.sound.set('on'); this.stage?.setMuted(false); }   // el primer toque enciende el sonido
    if (!pre) this.vibrate(correct);
    if (tap.id === this.activeId()) this.stage?.react(correct ? 'celebrate' : 'hurt', { say: false });
    const ms = advanceDelay(correct, pre ? performance.now() - pre.t : 0);
    this.clockTap = tap;
    this.clock.start(ms);
    this.waitPaused.set(false);
    this.wait.set({ tapId: tap.id, ms, key: ++this.waitKey });
    afterNextRender(() => {                                        // pantallas bajas: que se vea cómo seguir
      const section = this.sections()[this.taps().indexOf(tap)]?.nativeElement;
      this.reveal(section, section?.querySelector<HTMLElement>('.tap__go'));
    }, { injector: this.injector });
  }

  /** Adelantar con el botón «Seguir» (teclado y lector de pantalla). */
  protected skip(): void { this.clock.flush(); }

  protected restart(tap: ITap): void {
    this.track(null, `taps/repetir/${eventSlug(tap.id)}`);
    this.setRun(tap, startRun(tap));
    this.questionShownAt = performance.now();
    this.stage?.say('');
    this.stage?.react('ask');
    this.focusLater(tap, '.tap__q');
  }

  protected goNext(tap: ITap): void {
    const nextSection = this.sections()[this.taps().indexOf(tap) + 1]?.nativeElement;
    nextSection?.scrollIntoView({ behavior: this.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  /** «Más de este tema»: el siguiente Tap sin terminar de la misma categoría; si no hay, el siguiente del feed. */
  protected moreOf(tap: ITap): void {
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
    if (!tap) return;
    const run = next(this.run(tap), tap);
    if (run === this.run(tap)) return;
    this.setRun(tap, run);
    if (run.finished) {
      this.track('taps-completar', `taps/completar/${eventSlug(tap.id)}`);
      this.completedThisSession++;
      if ([1, 2, 3, 4, 6, 10].includes(this.completedThisSession)) this.track(null, `taps/hito/${this.completedThisSession}`);
      this.onFinished(tap, run);
      this.focusLater(tap, '.res__title');
    } else {
      this.questionShownAt = performance.now();
      if (tap.id === this.activeId()) this.stage?.react('ask', { say: false });
      this.focusLater(tap, '.tap__q');
    }
  }

  private onFinished(tap: ITap, run: ITapRun): void {
    if (tap.id === this.activeId()) this.celebrateResult(tap, run);
    this.writeHookCookie();
    if (!this.teachShown && this.nextTap(tap)) {
      const count = Number(this.readStorage(TEACH_KEY) ?? 0) || 0;
      if (count < 2) { this.teach.set(true); this.teachShown = true; this.writeStorage(TEACH_KEY, String(count + 1)); }
    }
    this.prepareShareCard(tap, run);
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
    if (this.document.hidden) this.clock.pause();
    else if (!this.held && !this.sheetOpen()) this.clock.resume();
  };

  // ───────────── sonido ─────────────
  protected toggleSound(): void {
    const on = this.sound() !== 'on';
    this.sound.set(on ? 'on' : 'off');
    this.stage?.setMuted(!on);
    this.writeStorage(SOUND_KEY, on ? 'on' : 'off');
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
    this.clock.flush();
    this.topic.set(id);
    this.taps.set(orderFeed(TAPS, { topic: id, hookDone: this.hookDone || this.anyFinished() }));
    void this.router.navigate([], { queryParams: { tema: id, t: null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.activeIndex = -1;
    afterNextRender(() => { this.feed().nativeElement.scrollTo({ top: 0 }); void this.activate(0); }, { injector: this.injector });
  }

  // ───────────── compartir ─────────────
  /** «Retar a un amigo»: imagen 9:16 + texto + enlace al mismo Tap. Si no se puede compartir, copia y ofrece la imagen. */
  protected async challenge(tap: ITap): Promise<void> {
    this.track('taps-compartir', `taps/compartir/${eventSlug(tap.id)}`);
    const run = this.run(tap), url = shareUrl(location.origin, tap.id), file = this.shareFiles.get(tap.id);
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    try {
      if (file && nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Taps de GEMS LMS', text: shareText(tap, run, url) });
        this.track(null, 'taps/compartir-ok/nativo');
        return;
      }
      if (nav.share) { await nav.share({ title: 'Taps de GEMS LMS', text: shareText(tap, run), url }); this.track(null, 'taps/compartir-ok/nativo'); return; }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;      // la persona cerró el menú
    }
    await this.copy(tap, shareText(tap, run, url), url, file);
  }

  /** Compartir desde el riel (a mitad del Tap): solo el enlace, sin resultado. */
  protected async shareTap(tap: ITap): Promise<void> {
    this.track('taps-compartir', `taps/compartir/${eventSlug(tap.id)}`);
    const url = shareUrl(location.origin, tap.id), text = `Juega este Tap de GEMS LMS: ${tap.title}. ¿Cuántas sacas de ${tap.questions.length}?`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Taps de GEMS LMS', text, url }); this.track(null, 'taps/compartir-ok/nativo'); return; }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
    }
    await this.copy(tap, `${text}\n${url}`, url);
  }

  /** Sin menú de compartir: copia el texto y ofrece la imagen para descargar; si tampoco hay portapapeles, muestra el enlace. */
  private async copy(tap: ITap, text: string, url: string, file?: File): Promise<void> {
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; this.track(null, 'taps/compartir-ok/copiado'); } catch { /* sin portapapeles: se muestra el enlace */ }
    const download = file ? URL.createObjectURL(file) : undefined;
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

  /** Teclas 1-4 eligen opción en el Tap a la vista; Enter adelanta tras responder. */
  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || this.sheetOpen()) return;
    const tap = this.activeTap(), run = this.run(tap);
    if (/^[1-4]$/.test(event.key) && !run.finished) this.choose(tap, Number(event.key) - 1);
  }

  private setRun(tap: ITap, run: ITapRun): void {
    this.runs.update(all => ({ ...all, [tap.id]: run }));
    if (this.isBrowser) this.writeStorage(RUNS_KEY, JSON.stringify(this.runs()), true);
  }

  private celebrateResult(tap: ITap, run: ITapRun): void {
    const good = isGoodScore(tap, run.score);
    this.stage?.say('');                                       // el título ya está en la tarjeta: sin globo encima de la barra
    this.stage?.react(good ? 'win' : 'lose', { say: false });
  }

  private focusLater(tap: ITap, selector: string): void {
    afterNextRender(() => {
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
    this.activeIndex = index;
    this.activeId.set(tap.id);
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
      if (run.finished) this.celebrateResult(tap, run); else { stage.say(''); stage.react('ask', { say: false }); }
      this.preloadNext(index);
    } catch {
      this.stageMode.set('none');                              // sin escenario el quiz sigue funcionando en DOM
      this.stageError('error/motor');
    }
  }

  /**
   * La URL dice qué Tap se ve (`?t=<id>`): recargar o copiar el enlace lleva a ese Tap. Al dejar el primero se agrega UNA
   * entrada al historial, así Atrás vuelve una vez al Tap con el que se entró y la siguiente vez sale (no atrapa).
   */
  private syncUrl(tap: ITap, previous: number): void {
    if (!this.live()) return;
    const params = new URLSearchParams(this.location.path().split('?')[1] ?? '');
    if (params.get('t') === tap.id) return;
    params.set('t', tap.id);
    const query = params.toString();
    if (previous >= 0 && !this.pushed) { this.pushed = true; this.location.go('/taps', query); }
    else this.location.replaceState('/taps', query);
  }

  private onPopState(): void {
    this.pushed = false;
    const id = new URLSearchParams(this.location.path().split('?')[1] ?? '').get('t');
    const index = this.taps().findIndex(t => t.id === id);
    if (index < 0) return;
    this.sections()[index]?.nativeElement.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  /** Un solo escenario para todo el feed; si el Tap usa otro tema (otro videojuego) se reemplaza. */
  private async ensureStage(tap: ITap): Promise<ITapsStage | null> {
    if (this.stage && this.stageTheme === tap.theme) return this.stage;
    this.stage?.destroy();
    const { create } = await loadTapsEngine();
    const stage = create(this.slots()[this.activeIndex].nativeElement, { theme: tapsThemeUrl(tap.theme) });
    this.stage = stage;
    this.stageTheme = tap.theme;
    stage.setMuted(this.sound() !== 'on');
    stage.on('mode', data => {
      this.stageMode.set(data.mode ?? 'light');
      performance.mark?.('taps-stage-' + data.mode);
      if (data.mode === 'light') {
        this.glassOff();                                             // modo ligero: botones sin blur
        this.stageError(/webgl/i.test(data.reason ?? '') ? 'error/webgl' : 'error/modo-ligero');
      }
    });
    stage.on('degrade', () => this.glassOff());                     // el 3D va justo: el blur sobre el canvas cuesta fps
    await stage.ready;
    this.stageMode.set(stage.mode);
    void stage.ready3d.then(mode => this.stageMode.set(mode));
    return stage;
  }

  /** En reposo y solo del Tap siguiente (nunca los demás) para no gastar datos ni memoria. */
  private preloadNext(index: number): void {
    const upcoming = this.taps()[index + 1];
    if (!upcoming || upcoming.theme !== this.stageTheme) return;
    const run = () => void this.stage?.preload(upcoming.scene);
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (idle) idle(run, { timeout: 4000 }); else setTimeout(run, 2500);
  }

  // ───────────── estado guardado ─────────────
  /** Al volver a /taps en la misma pestaña (p. ej. tras tocar el logo) se retoma cada Tap donde iba. */
  private restoreRuns(): void {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RUNS_KEY) ?? 'null') as Record<string, ITapRun> | null;
      if (!saved || (globalThis as { __tapsPre?: unknown }).__tapsPre) return;
      const valid = Object.fromEntries(Object.entries(saved).filter(([id, r]) =>
        TAPS.some(t => t.id === id) && Array.isArray(r?.answers) && typeof r.index === 'number')
        // Si recargó con una respuesta a la vista, se sigue en la pregunta siguiente (esa ya contó).
        .map(([id, r]) => [id, r.finished || r.chosen === null ? r : next(r, TAPS.find(t => t.id === id)!)]));
      // Una respuesta dada antes de hidratar manda sobre lo guardado.
      const current = this.runs();
      this.runs.set({ ...current, ...Object.fromEntries(Object.entries(valid).filter(([id]) => current[id].answers.length === 0)) });
    } catch { /* sin sessionStorage se empieza de cero */ }
  }

  /**
   * Medición (producto/retencion/plan-retencion.md): la taxonomía con detalle en el path y, mientras conviven, el nombre
   * antiguo del evento (`taps-ver`, `taps-compartir`…) para no cortar las series que ya existen.
   */
  private track(legacy: TAnalyticsEvent | null, path: TEventPath): void {
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

  // ───────────── metadatos con la marca GEMS LMS ─────────────
  private setMeta(): void {
    const title = 'Taps de GEMS LMS: quizzes que juegas con un personaje en vivo';
    this.meta.updateTag({ name: 'description', content: DESCRIPTION });
    this.meta.updateTag({ property: 'og:site_name', content: 'GEMS LMS' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: DESCRIPTION });
    this.meta.updateTag({ property: 'og:url', content: `${SITE}/taps` });
    this.meta.updateTag({ property: 'og:image', content: `${SITE}/logo-512.png` });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
  }

  private clearMeta(): void {
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
    for (const p of ['og:site_name', 'og:type', 'og:title', 'og:description', 'og:url', 'og:image']) this.meta.removeTag(`property="${p}"`);
    this.meta.removeTag('name="twitter:card"');
  }
}

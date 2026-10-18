import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, Injector, PLATFORM_ID, computed,
  inject, signal, viewChild, viewChildren,
} from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from '../analytics.service';
import { loadTapsEngine, tapsThemeUrl } from './taps-engine.loader';
import { TAPS } from './taps.data';
import { choose, isGoodScore, next, orderTaps, resultFor, startRun } from './taps.logic';
import { ITap, ITapRun, ITapsStage } from './taps.types';

const SOUND_KEY = 'gems-taps-sound';
const DEFAULT_DESCRIPTION = 'GEMS LMS: aprendizaje, formación y seguimiento en un solo lugar.';

/**
 * Feed vertical de Taps: un Tap a pantalla completa, desliza hacia abajo para el siguiente. Cada Tap es un quiz que
 * juegas con un personaje en vivo (motor en public/taps-engine). Responder es libre y sin registro.
 *
 * El primer pintado es solo DOM/CSS (la pregunta se ve y se toca sin esperar al motor); el escenario se carga después,
 * en el navegador, y UN solo escenario se mueve al Tap que está a la vista.
 */
@Component({
  selector: 'gems-taps',
  imports: [RouterLink],
  templateUrl: './taps-feed.component.html',
  styleUrl: './taps-feed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TapsFeedComponent {
  private readonly platform = inject(PLATFORM_ID);
  private readonly analytics = inject(AnalyticsService);
  private readonly injector = inject(Injector);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platform);

  /** Si el enlace trae `?t=<id>` (compartido), ese Tap va primero. */
  protected readonly taps: ITap[] = orderTaps(TAPS, inject(ActivatedRoute).snapshot.queryParamMap.get('t'));
  protected readonly runs = signal<Record<string, ITapRun>>(Object.fromEntries(this.taps.map(t => [t.id, startRun(t)])));
  protected readonly activeId = signal(this.taps[0].id);
  protected readonly muted = signal(false);
  /** Estado del escenario: cargando → 3d | light (ligero) | none (el motor no cargó: el quiz sigue funcionando). */
  protected readonly stageMode = signal<'loading' | '3d' | 'light' | 'none'>('loading');
  protected readonly notice = signal<string | null>(null);

  private readonly feed = viewChild.required<ElementRef<HTMLElement>>('feed');
  private readonly sections = viewChildren<ElementRef<HTMLElement>>('section');
  private readonly slots = viewChildren<ElementRef<HTMLElement>>('slot');

  protected readonly activeTap = computed(() => this.taps.find(t => t.id === this.activeId()) ?? this.taps[0]);

  private stage: ITapsStage | null = null;
  private stageTheme: string | null = null;
  private activeIndex = -1;
  private token = 0;
  private seen = new Set<string>();

  constructor() {
    this.meta.updateTag({ name: 'description', content: 'Taps de GEMS: quizzes que juegas con un personaje en vivo. Responde, mira cómo reacciona y gana tu título. Gratis y sin registro.' });
    this.destroyRef.onDestroy(() => {
      this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
      this.stage?.destroy();
      this.stage = null;
    });
    if (!this.isBrowser) return;
    try { this.muted.set(localStorage.getItem(SOUND_KEY) === 'off'); } catch { /* sin almacenamiento el sonido queda activo */ }
    afterNextRender(() => {
      performance.mark?.('taps-interactive');                  // desde aquí la primera pregunta ya responde al toque
      this.watchSections();
      void this.activate(0);
    });
  }

  // ───────────── preguntas ─────────────
  protected run(tap: ITap): ITapRun { return this.runs()[tap.id]; }
  protected result(tap: ITap) { return resultFor(tap, this.run(tap).score); }
  protected letter(k: number): string { return String(k + 1); }
  protected isLast(tap: ITap): boolean { return this.run(tap).index >= tap.questions.length - 1; }
  protected hasNextTap(tap: ITap): boolean { return this.taps.indexOf(tap) < this.taps.length - 1; }

  protected choose(tap: ITap, option: number): void {
    const { run, correct } = choose(this.run(tap), tap, option);
    if (correct === null) return;
    this.setRun(tap, run);
    this.analytics.event('taps-responder');
    if (tap.id === this.activeId()) this.stage?.react(correct ? 'celebrate' : 'hurt');
    this.focusLater(tap, '.tap__next');
  }

  protected next(tap: ITap): void {
    const run = next(this.run(tap), tap);
    if (run === this.run(tap)) return;
    this.setRun(tap, run);
    if (run.finished) {
      this.analytics.event('taps-completar');
      this.celebrateResult(tap, run);
      this.focusLater(tap, '.tap__title');
    } else {
      this.stage?.react('ask');
      this.focusLater(tap, '.tap__q');
    }
  }

  protected restart(tap: ITap): void {
    this.setRun(tap, startRun(tap));
    this.stage?.say('');
    this.stage?.react('ask');
    this.focusLater(tap, '.tap__q');
  }

  protected goNext(tap: ITap): void {
    const nextSection = this.sections()[this.taps.indexOf(tap) + 1]?.nativeElement;
    nextSection?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  protected toggleSound(): void {
    const muted = !this.muted();
    this.muted.set(muted);
    this.stage?.setMuted(muted);
    try { localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on'); } catch { /* preferencia solo para esta sesión */ }
  }

  protected async share(tap: ITap): Promise<void> {
    const run = this.run(tap);
    const text = `Saqué «${this.result(tap).title}» en el Tap de ${tap.title} (${run.score} de ${tap.questions.length}). ¿Te animas?`;
    const url = `${location.origin}/taps?t=${tap.id}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Taps de GEMS', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      this.notice.set('Enlace copiado. Pégalo donde quieras.');
    } catch { /* el usuario canceló el menú de compartir */ }
  }

  /** Teclas 1-4 eligen opción en el Tap a la vista (el resto del teclado sigue su curso). */
  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || !/^[1-4]$/.test(event.key)) return;
    const tap = this.activeTap(), run = this.run(tap);
    if (!run.finished) this.choose(tap, Number(event.key) - 1);
  }

  private setRun(tap: ITap, run: ITapRun): void { this.runs.update(all => ({ ...all, [tap.id]: run })); }

  private celebrateResult(tap: ITap, run: ITapRun): void {
    const good = isGoodScore(tap, run.score);
    this.stage?.react(good ? 'win' : 'lose', { say: false });
    this.stage?.say(resultFor(tap, run.score).title, { hold: true, tone: good ? 'celebrate' : 'hurt' });
  }

  private focusLater(tap: ITap, selector: string): void {
    afterNextRender(() => {
      const section = this.sections()[this.taps.indexOf(tap)]?.nativeElement;
      section?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    }, { injector: this.injector });
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
    const previous = this.activeIndex, tap = this.taps[index], token = ++this.token;
    this.activeIndex = index;
    this.activeId.set(tap.id);
    if (!this.seen.has(tap.id)) { this.seen.add(tap.id); this.analytics.event('taps-ver'); }
    if (previous >= 0 && index > previous) this.analytics.event('taps-siguiente');
    try {
      const stage = await this.ensureStage(tap);
      if (token !== this.token || !stage) return;
      stage.attachTo(this.slots()[index].nativeElement);
      stage.resume();
      await stage.setScene(tap.scene);
      if (token !== this.token) return;
      const run = this.run(tap);
      if (run.finished) this.celebrateResult(tap, run); else { stage.say(''); stage.react('ask'); }
      this.preloadNext(index);
    } catch {
      this.stageMode.set('none');                              // sin escenario el quiz sigue funcionando en DOM
    }
  }

  /** Un solo escenario para todo el feed; si el Tap usa otro tema (otro videojuego) se reemplaza. */
  private async ensureStage(tap: ITap): Promise<ITapsStage | null> {
    if (this.stage && this.stageTheme === tap.theme) return this.stage;
    this.stage?.destroy();
    const { create } = await loadTapsEngine();
    const stage = create(this.slots()[this.activeIndex].nativeElement, { theme: tapsThemeUrl(tap.theme) });
    this.stage = stage;
    this.stageTheme = tap.theme;
    stage.setMuted(this.muted());
    stage.on('mode', data => { this.stageMode.set(data.mode ?? 'light'); performance.mark?.('taps-stage-' + data.mode); });
    await stage.ready;
    this.stageMode.set(stage.mode);
    void stage.ready3d.then(mode => this.stageMode.set(mode));
    return stage;
  }

  /** En reposo y solo del Tap siguiente (nunca los demás) para no gastar datos ni memoria. */
  private preloadNext(index: number): void {
    const upcoming = this.taps[index + 1];
    if (!upcoming || upcoming.theme !== this.stageTheme) return;
    const run = () => void this.stage?.preload(upcoming.scene);
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (idle) idle(run, { timeout: 4000 }); else setTimeout(run, 2500);
  }
}

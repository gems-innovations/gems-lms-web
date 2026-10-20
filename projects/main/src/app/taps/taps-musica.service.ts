import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { TapsSonidoService } from './taps-sonido.service';
import { ITap } from './taps.types';

/** Súbela cuando cambie taps-engine/audio/musica.js (la query evita que una caché vieja entregue el módulo anterior). */
export const TAPS_MUSICA_VERSION = '1';
export const TAPS_MUSICA_URL = `/taps-engine/audio/musica.js?v=${TAPS_MUSICA_VERSION}`;
/** Manifiesto de las pistas (scripts/procesar-musica-taps.mjs). nginx lo revalida siempre; el audio lleva hash en el nombre. */
export const TAPS_MUSICA_MANIFIESTO = '/taps-musica/musica.json';
export const MUSICA_KEY = 'gems-taps-musica';

/** De qué depende la pista de un Tap: su mundo (scene.world), su categoría (topic) y su motor (theme). */
export interface ITapMusica { mundo: string; tema: string; motor: string }
export const musicaDe = (tap: ITap): ITapMusica => ({ mundo: tap.scene.world, tema: tap.topic ?? tap.theme, motor: tap.theme });

/** Lo que usa este servicio de taps-engine/audio/musica.js (módulo ES servido aparte, fuera del bundle). */
interface IMusicaModulo { crearMusica(opciones: { manifiesto: string }): IMusica }
interface IMusica {
  conectar(ctx: AudioContext): void;
  encender(on: boolean): void;
  silenciar(muted: boolean): void;
  pausar(motivo?: string): void;
  reanudar(motivo?: string): void;
  alTap(info: ITapMusica): Promise<string | null>;
  alResultado(o: { perfecto?: boolean; racha?: boolean }): Promise<string | null>;
  anticipar(info: ITapMusica): Promise<void>;
  voz(hablando: boolean): void;
  efecto(): void;
  destruir(): void;
}

/**
 * Música de fondo del feed de Taps (instrumentales de Eleven Music en public/taps-musica). Fina a propósito: el reproductor
 * vive en public/taps-engine/audio/musica.js y se carga por URL (0 bytes en el bundle).
 *
 * · Apagada por defecto; la preferencia se recuerda (localStorage). En la portada arranca apagada siempre.
 * · Nada antes del primer gesto ni en el servidor: el módulo, el manifiesto y las pistas se piden solo con la música
 *   encendida y con el AudioContext compartido (que TapsSonidoService crea dentro de un gesto).
 * · Suena solo si el sonido general está activo (el botón de sonido y M la callan con todo lo demás).
 * · Una pista por mundo/tema con fundido cruzado al cambiar; canciones con letra solo al celebrar (5/5 o racha nueva) y la
 *   instrumental de premios en el resultado. Ducking con la voz y los efectos de respuesta; pausa con la pestaña oculta.
 */
@Injectable()
export class TapsMusicaService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly sonido = inject(TapsSonidoService);
  private readonly document = inject(DOCUMENT);
  private musica: IMusica | null = null;
  private carga: Promise<IMusica | null> | null = null;
  private ctx: AudioContext | null = null;
  private silencio = true;
  private destruido = false;
  private iniciado = false;
  /** Lo último que pidió el feed (pista de un Tap o la de resultado): se repite al terminar de cargar el reproductor. */
  private pedido: ((m: IMusica) => void) | null = null;
  private readonly pausas = new Set<string>();

  /** Preferencia de música (el control muestra este estado con aria-pressed). */
  readonly encendida = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.destruir());
  }

  /** Tras hidratar. `portada`: la música arranca apagada aunque se haya dejado encendida en /taps. */
  iniciar(portada: boolean): void {
    if (!this.browser || this.iniciado) return;
    this.iniciado = true;
    this.encendida.set(!portada && this.leer() === 'on');
    this.sonido.escuchar({
      contexto: ctx => { this.ctx = ctx; if (this.encendida()) void this.cargar(); else this.musica?.conectar(ctx); },
      silencio: m => { this.silencio = m; this.musica?.silenciar(m); },
      efecto: () => this.musica?.efecto(),
      voz: on => this.musica?.voz(on),
    });
    const alCambiar = () => (this.document.hidden ? this.pausar('oculta') : this.reanudar('oculta'));
    this.document.addEventListener('visibilitychange', alCambiar);
    this.quitar = () => this.document.removeEventListener('visibilitychange', alCambiar);
  }
  private quitar: (() => void) | null = null;

  /**
   * Enciende o apaga la música. Llamar DENTRO del gesto (clic en el control): desbloquea el audio en ese mismo toque.
   * Devuelve el estado nuevo.
   */
  alternar(): boolean {
    const on = !this.encendida();
    this.encendida.set(on);
    this.escribir(on ? 'on' : 'off');
    if (on) this.sonido.desbloquear();
    this.musica?.encender(on);
    if (on) void this.cargar();
    return on;
  }

  /** El Tap a la vista (o al volver a su pregunta tras «Otra vez»): su pista, con fundido cruzado si cambia. */
  alTap(tap: ITap, siguiente: ITap | null = null): void {
    const info = musicaDe(tap);
    this.pedido = m => void m.alTap(info);
    if (!this.musica) return;
    void this.musica.alTap(info);
    if (siguiente) this.anticipar(siguiente);
  }

  /** El Tap que viene (el feed lo prevé): baja su pista sin sonar. */
  anticipar(tap: ITap): void { void this.musica?.anticipar(musicaDe(tap)); }

  /** Pantalla de resultado: 5/5 o racha nueva → fragmento de una canción con letra; si no, la instrumental de premios. */
  alResultado(o: { perfecto: boolean; racha: boolean }): void {
    // Si el reproductor aún carga, al llegar suena la instrumental de premios (una canción tardía no se pone).
    this.pedido = m => void m.alResultado({});
    if (!this.musica || !this.encendida()) return;
    void this.musica.alResultado(o);
  }

  pausar(motivo: string): void { this.pausas.add(motivo); this.musica?.pausar(motivo); }
  reanudar(motivo: string): void { this.pausas.delete(motivo); this.musica?.reanudar(motivo); }

  /** Carga el reproductor (solo con la música encendida y tras un gesto: hay AudioContext). */
  private cargar(): Promise<IMusica | null> {
    if (!this.browser || this.destruido || !this.encendida()) return Promise.resolve(this.musica);
    const ctx = this.ctx ?? this.sonido.contexto();
    if (!ctx) return Promise.resolve(null);                      // aún sin gesto: se carga cuando llegue el contexto
    this.ctx = ctx;
    return (this.carga ??= this.importar<IMusicaModulo>(TAPS_MUSICA_URL).then(mod => {
      if (this.destruido) return null;
      const m = mod.crearMusica({ manifiesto: TAPS_MUSICA_MANIFIESTO });
      m.silenciar(this.silencio);
      this.pausas.forEach(p => m.pausar(p));
      if (this.document.hidden) m.pausar('oculta');
      m.encender(this.encendida());
      m.conectar(this.ctx!);
      this.pedido?.(m);
      this.musica = m;
      return m;
    }).catch(() => { this.carga = null; return null; }));
  }

  private destruir(): void {
    this.destruido = true;
    this.quitar?.();
    this.musica?.destruir();
    this.musica = null;
  }

  private leer(): string | null { try { return localStorage.getItem(MUSICA_KEY); } catch { return null; } }
  private escribir(v: string): void { try { localStorage.setItem(MUSICA_KEY, v); } catch { /* preferencia solo para esta visita */ } }

  /** Import por URL (no entra en el bundle). Aparte para poder sustituirlo en las pruebas. */
  protected importar<T>(url: string): Promise<T> { return import(/* @vite-ignore */ url) as Promise<T>; }
}

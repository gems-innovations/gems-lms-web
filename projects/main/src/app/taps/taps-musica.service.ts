import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { TapsAudioRelevo } from './taps-audio-relevo';
import { TapsSonidoService } from './taps-sonido.service';
import { ITap } from './taps.types';

/** Súbela cuando cambie taps-engine/audio/musica.js (la query evita que una caché vieja entregue el módulo anterior). */
export const TAPS_MUSICA_VERSION = '3';
export const TAPS_MUSICA_URL = `/taps-engine/audio/musica.js?v=${TAPS_MUSICA_VERSION}`;
/** Manifiesto de las pistas (scripts/procesar-musica-taps.mjs). nginx lo revalida siempre; el audio lleva hash en el nombre. */
export const TAPS_MUSICA_MANIFIESTO = '/taps-musica/musica.json';
export const MUSICA_KEY = 'gems-taps-musica';

/**
 * De qué depende la pista de un Tap: su id (la elección dentro del grupo es determinista por Tap), su mundo (scene.world,
 * sesga la elección), su categoría (topic, elige el grupo) y su motor (theme, grupo de respaldo).
 */
export interface ITapMusica { id: string; mundo: string; tema: string; motor: string }
export const musicaDe = (tap: ITap): ITapMusica => ({ id: tap.id, mundo: tap.scene.world, tema: tap.topic ?? tap.theme, motor: tap.theme });

/** Lo que usa este servicio de taps-engine/audio/musica.js (módulo ES servido aparte, fuera del bundle). */
interface IMusicaModulo { crearMusica(opciones: { manifiesto: string }): IMusica }
interface IMusica {
  conectar(ctx: AudioContext): void;
  encender(on: boolean): void;
  silenciar(muted: boolean): void;
  pausar(motivo?: string): void;
  reanudar(motivo?: string): void;
  alTap(info: ITapMusica, opciones?: { continuar?: boolean }): Promise<string | null>;
  alResultado(o: { perfecto?: boolean; racha?: boolean }): Promise<string | null>;
  anticipar(info: ITapMusica): Promise<void>;
  preparar(info: ITapMusica, ctx?: AudioContext | null): Promise<string | null>;
  voz(hablando: boolean): void;
  efecto(): void;
  destruir(): void;
}

/** Conexión de la persona: con ahorro de datos, 2G o 3G no se baja música antes de que la pida un gesto. */
export function redLimitada(): boolean {
  const c = (globalThis.navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } } | undefined)?.connection;
  return !!c && (c.saveData === true || /(^|-)(2g|3g)$/.test(c.effectiveType ?? ''));
}

/**
 * Música de fondo del feed de Taps (instrumentales de Eleven Music en public/taps-musica). Fina a propósito: el reproductor
 * vive en public/taps-engine/audio/musica.js y se carga por URL (0 bytes en el bundle).
 *
 * · Encendida por defecto en /taps y en la portada (producto/taps/voz-y-sonido.md §2.1), con la misma preferencia: si la
 *   persona la apaga, se recuerda (localStorage) y sigue apagada en las dos. La clave no se versiona: antes solo se escribía
 *   al tocar el control (el «apagada» de antes era la ausencia de clave), así que un 'off' guardado siempre es una decisión
 *   de la persona.
 * · Nada suena antes del primer gesto ni en el servidor. Para que el primer gesto ya tenga música (`precargar`): en reposo
 *   tras cargar, con la música y el sonido encendidos y sin ahorro de datos ni 2G, se baja la pista del primer Tap y se
 *   decodifica con un AudioContext creado suspendido; el gesto solo lo reanuda y la pista entra con un fundido corto.
 * · Suena solo si el sonido general está activo (el botón de sonido y M la callan con todo lo demás).
 * · Una pista del grupo de la categoría por Tap (variada, sin repetir la del anterior), con fundido cruzado al cambiar; canciones con letra solo al celebrar (5/5 o racha nueva) y la
 *   instrumental de premios en el resultado. Ducking con la voz y los efectos de respuesta; pausa con la pestaña oculta.
 * · Portada → /taps: el reproductor pasa al feed nuevo (taps-audio-relevo.ts) y la pista sigue si le vale al Tap que abre.
 */
@Injectable()
export class TapsMusicaService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly sonido = inject(TapsSonidoService);
  private readonly document = inject(DOCUMENT);
  private readonly relevo = inject(TapsAudioRelevo);
  /** El reproductor ya conectado al contexto (tras el gesto). */
  private musica: IMusica | null = null;
  /** El reproductor creado (con o sin contexto): se crea antes del gesto si se precarga. */
  private modulo: Promise<IMusica | null> | null = null;
  private carga: Promise<IMusica | null> | null = null;
  private ctx: AudioContext | null = null;
  private silencio = true;
  private destruido = false;
  private iniciado = false;
  private relevar = false;
  /** Vino de la portada con la música sonando: el primer Tap la sigue si le vale. */
  private continuar = false;
  /** Lo último que pidió el feed (pista de un Tap o la de resultado): se repite al terminar de cargar el reproductor. */
  private pedido: ((m: IMusica) => void) | null = null;
  private readonly pausas = new Set<string>();

  /** Preferencia de música (el control muestra este estado con aria-pressed). Suena solo si además el sonido está activo. */
  readonly encendida = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.destruir());
    const m = this.browser ? this.relevo.recoger<IMusica>('musica') : null;
    // Solo si el sonido también pasó (su contexto sigue vivo): si no, esta música no tiene dónde sonar y se cierra.
    const ctx = m ? this.sonido.contexto() : null;
    if (m && (!ctx || ctx.state === 'closed')) m.destruir();
    else if (m) {
      this.musica = m;
      this.modulo = this.carga = Promise.resolve(m);
      this.continuar = true;
    }
  }

  /** Tras hidratar. En la portada igual que en /taps: misma preferencia, mismo silencio general. */
  iniciar(): void {
    if (!this.browser || this.iniciado) return;
    this.iniciado = true;
    this.encendida.set(this.leer() !== 'off');
    this.musica?.encender(this.encendida());
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
   * En reposo tras cargar (antes de cualquier gesto): deja lista la pista de `tap` para que suene en cuanto llegue el primer
   * gesto. Solo con la música encendida (el feed comprueba además el sonido general), con la pestaña visible y sin ahorro
   * de datos, 2G ni 3G. Aquí solo baja el módulo, el manifiesto y los bytes de la pista; decodificar (CPU y ~11 MB) espera a
   * la primera señal de intención (intencion()). Nada se conecta ni suena.
   */
  precargar(tap: ITap): void {
    if (!this.browser || this.destruido || !this.encendida() || this.musica || this.document.hidden || redLimitada()) return;
    this.precarga = tap;
    void this.crear().then(m => {
      if (!m || this.destruido || this.musica) return;
      return m.preparar(musicaDe(tap), null);
    }).catch(() => undefined);
    if (this.quiere) this.intencion();
  }
  private precarga: ITap | null = null;
  private quiere = false;
  private decodificando = false;

  /**
   * Señal de que la persona va a jugar (toca la tarjeta, la mira 2 s o desplaza): decodifica la pista precargada con un
   * AudioContext suspendido, para que el primer gesto solo tenga que reanudarlo.
   */
  intencion(): void {
    this.quiere = true;
    const tap = this.precarga;
    if (!tap || this.decodificando || this.destruido || this.musica) return;
    this.decodificando = true;
    void this.crear().then(m => {
      if (!m || this.destruido || this.musica) return;
      const ctx = this.sonido.contexto() ?? this.sonido.contextoPrevio();
      return m.preparar(musicaDe(tap), ctx);
    }).catch(() => undefined);
  }

  /** Antes de navegar de la portada a /taps: el reproductor (y lo que suena) pasa al feed nuevo. */
  relevarAlSalir(on = true): void { this.relevar = on; }

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
    void this.musica.alTap(info, { continuar: this.continuar });
    this.continuar = false;
    if (siguiente) this.anticipar(siguiente);
  }

  /** El Tap que viene (el feed lo prevé): baja su pista sin sonar. */
  anticipar(tap: ITap): void { void this.musica?.anticipar(musicaDe(tap)); }

  /** Pantalla de resultado: 5/5 o racha nueva → fragmento de una canción con letra; si no, la instrumental de premios. */
  alResultado(o: { perfecto: boolean; racha: boolean }): void {
    // Si el reproductor aún carga, al llegar suena la instrumental de premios (una canción tardía no se pone).
    this.pedido = m => void m.alResultado({});
    this.continuar = false;
    if (!this.musica || !this.encendida()) return;
    void this.musica.alResultado(o);
  }

  pausar(motivo: string): void { this.pausas.add(motivo); this.musica?.pausar(motivo); }
  reanudar(motivo: string): void { this.pausas.delete(motivo); this.musica?.reanudar(motivo); }

  /** Importa el módulo y crea el reproductor (sin contexto: no pide nada ni suena hasta `preparar` o `conectar`). */
  private crear(): Promise<IMusica | null> {
    return (this.modulo ??= this.importar<IMusicaModulo>(TAPS_MUSICA_URL).then(mod => {
      if (this.destruido) return null;
      const m = mod.crearMusica({ manifiesto: TAPS_MUSICA_MANIFIESTO });
      m.silenciar(this.silencio);
      m.encender(this.encendida());
      return m;
    }).catch(() => { this.modulo = null; return null; }));
  }

  /** Conecta el reproductor al contexto (solo con la música encendida y tras un gesto: hay AudioContext). */
  private cargar(): Promise<IMusica | null> {
    if (!this.browser || this.destruido || !this.encendida()) return Promise.resolve(this.musica);
    const ctx = this.ctx ?? this.sonido.contexto();
    if (!ctx) return Promise.resolve(null);                      // aún sin gesto: se carga cuando llegue el contexto
    this.ctx = ctx;
    return (this.carga ??= this.crear().then(m => {
      if (!m || this.destruido) { this.carga = null; return null; }
      m.silenciar(this.silencio);
      this.pausas.forEach(p => m.pausar(p));
      if (this.document.hidden) m.pausar('oculta');
      m.encender(this.encendida());
      m.conectar(this.ctx!);
      this.pedido?.(m);
      this.musica = m;
      return m;
    }));
  }

  private destruir(): void {
    this.destruido = true;
    this.quitar?.();
    const m = this.musica;
    // Portada → /taps: lo que suena sigue en el feed nuevo (sin las pausas de este, que se van con él).
    if (this.relevar && m) {
      this.pausas.forEach(p => m.reanudar(p));
      this.relevo.entregar('musica', { valor: m, cerrar: () => m.destruir() });
    } else {
      m?.destruir();
      if (!m) void this.modulo?.then(x => x?.destruir());          // el precargado (sin conectar) suelta sus buffers
    }
    this.musica = null;
  }

  private leer(): string | null { try { return localStorage.getItem(MUSICA_KEY); } catch { return null; } }
  private escribir(v: string): void { try { localStorage.setItem(MUSICA_KEY, v); } catch { /* preferencia solo para esta visita */ } }

  /** Import por URL (no entra en el bundle). Aparte para poder sustituirlo en las pruebas. */
  protected importar<T>(url: string): Promise<T> { return import(/* @vite-ignore */ url) as Promise<T>; }
}

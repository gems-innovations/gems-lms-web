import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ITapsAudioMotor, ITapsVozMotor } from './taps.types';

/**
 * Súbela cuando cambie cualquier archivo de taps-engine/audio o taps-engine/voz, y en los imports internos de esos módulos
 * (`./efectos.js?v=…`, `./perfiles.js?v=…`): la query evita que una caché vieja entregue o mezcle módulos anteriores.
 */
export const TAPS_SONIDO_VERSION = '2';
export const TAPS_AUDIO_URL = `/taps-engine/audio/sonido.js?v=${TAPS_SONIDO_VERSION}`;
export const TAPS_VOZ_URL = `/taps-engine/voz/voz.js?v=${TAPS_SONIDO_VERSION}`;
/**
 * Manifiesto de voces pregeneradas en el build (scripts/generar-voz-taps.mjs --banco). `null` mientras no se publiquen: así
 * nadie pide un archivo que no existe. Al publicarlas: `'/taps-voz/manifiesto.json'`.
 */
export const TAPS_VOZ_MANIFIESTO: string | null = null;

export type TTapsEfecto = 'toque' | 'acierto' | 'fallo' | 'racha' | 'resultado' | 'deslizar' | 'tic';
/** Efectos de respuesta: bajo ellos la música hace ducking un instante. */
const EFECTOS_RESPUESTA: ReadonlySet<TTapsEfecto> = new Set<TTapsEfecto>(['acierto', 'fallo', 'racha', 'resultado']);
/** Un efecto pedido antes de que cargara sonido.js suena al llegar solo si fue hace menos que esto. */
export const EFECTO_TARDIO_MS = 300;
/** Teclas de moverse por la página: desbloquean los efectos, pero no arrancan la música. */
const TECLAS_SIN_MUSICA: ReadonlySet<string> = new Set(['Tab', 'Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'CapsLock', 'Escape']);
const ahoraMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Quien comparte el audio con este servicio (la música de fondo, taps-musica.service.ts): recibe el AudioContext cuando
 * existe (solo tras un gesto), el silencio, los efectos de respuesta y cuándo habla un personaje.
 */
export interface ITapsAudioOyente {
  contexto?(ctx: AudioContext): void;
  silencio?(muted: boolean): void;
  efecto?(nombre: TTapsEfecto): void;
  voz?(hablando: boolean): void;
}
export interface ITapsEfectoOpciones { tema?: string; nivel?: number; puntaje?: number }

/** Lo que usa este servicio de taps-engine/audio/sonido.js (módulo ES servido aparte, fuera del bundle). */
interface ISonidoModulo {
  crearSonido(): ISonido;
}
interface ISonido {
  readonly contexto: AudioContext | null;
  desbloquear(ctx?: AudioContext, opciones?: { gesto?: boolean }): boolean;
  silenciar(muted: boolean): void;
  atenuar(on: boolean): void;
  tocar(nombre: string, opciones?: ITapsEfectoOpciones): boolean;
  precalentar(tema: string): void;
  pausar(): void;
  reanudar(): void;
  paraMotor(): ITapsAudioMotor;
  destruir(): void;
}
/** Lo que usa este servicio de taps-engine/voz/voz.js. */
interface IVozModulo {
  crearVoz(opciones: { sonido: ISonido | null; manifiesto: string | null }): IVoz;
}
interface IVoz {
  preparar(): Promise<boolean>;
  hablar(texto: string, personaje?: string): Promise<void>;
  callar(): void;
}

/**
 * Sonido y voz del feed de Taps (producto/taps/voz-y-sonido.md). Fino a propósito: la síntesis y los motores de voz viven en
 * public/taps-engine/audio y public/taps-engine/voz y se cargan por URL bajo demanda (0 bytes en el bundle inicial).
 *
 * · Nada en el servidor (SSR/prerender): todo es no-op fuera del navegador.
 * · El AudioContext se crea DENTRO del gesto (`desbloquear`, síncrono). Si el módulo aún no llegó, se crea aquí y se le
 *   pasa cuando llegue. El efecto pedido antes de que llegue el módulo no tiene con qué sonar: se guarda el último y se toca
 *   al cargar solo si fue hace menos de EFECTO_TARDIO_MS (más tarde ya no acompaña al toque y es mejor perderlo).
 * · Tab y las teclas modificadoras (y los atajos con Ctrl, Alt o Cmd) desbloquean el audio para los efectos pero no
 *   arrancan la música: moverse con el teclado por la página no es empezar a jugar.
 * · Un solo AudioContext para todo: los escenarios del motor reciben `motorAudio` y no crean el suyo.
 * · La voz solo habla si la persona la encendió y el sonido está activo.
 * · Efectos y música encendidos por defecto, voz apagada (producto/taps/voz-y-sonido.md §2.1): el feed decide el silencio.
 */
@Injectable()
export class TapsSonidoService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private sonido: ISonido | null = null;
  private carga: Promise<ISonido | null> | null = null;
  private voz: IVoz | null = null;
  private cargaVoz: Promise<IVoz | null> | null = null;
  private ctx: AudioContext | null = null;
  private silencio = true;
  private vozOn = false;
  private destruido = false;
  private quitarGestos: (() => void) | null = null;
  private gesto = false;
  private oyente: ITapsAudioOyente | null = null;
  /** Hubo un gesto «de jugar» (toque, clic, tecla que no sea Tab ni modificadora): recién entonces la música recibe el contexto. */
  private arranca = false;
  /** El último efecto pedido antes de que cargara sonido.js (se toca al cargar si fue hace poco). */
  private pendiente: { nombre: TTapsEfecto; opciones: ITapsEfectoOpciones; t: number } | null = null;

  /** Este dispositivo tiene alguna voz utilizable (se sabe tras `prepararVoz`). */
  readonly vozDisponible = signal(false);

  /** Para `create(…, { audio })` del motor: existe desde el principio y reenvía al módulo cuando carga. */
  readonly motorAudio: ITapsAudioMotor = { play: (name, opts) => this.sonido?.paraMotor().play(name, opts) };
  /** Para `stage.setVoz()`: el `say()` del motor habla solo con la voz encendida y el sonido activo. */
  readonly motorVoz: ITapsVozMotor = {
    hablar: (texto, personaje) => (this.vozOn && !this.silencio ? this.voz?.hablar(texto, personaje) : undefined),
    callar: () => this.voz?.callar(),
  };

  /** Pide el módulo de sonido (en reposo, tras hidratar). Pequeño y sin red extra: los efectos se generan por código. */
  precargar(): Promise<ISonido | null> {
    if (!this.browser || this.destruido) return Promise.resolve(null);
    return (this.carga ??= this.importar<ISonidoModulo>(TAPS_AUDIO_URL).then(mod => {
      if (this.destruido) return null;
      const s = mod.crearSonido();
      s.silenciar(this.silencio);
      if (this.ctx) s.desbloquear(this.ctx, { gesto: false });   // ya no estamos en el gesto
      // La voz (voz.js) baja los efectos con `atenuar` mientras habla: el mismo aviso baja la música.
      const atenuar = s.atenuar.bind(s);
      s.atenuar = (on: boolean) => { atenuar(on); this.oyente?.voz?.(on); };
      this.sonido = s;
      this.avisarContexto();
      const p = this.pendiente;
      this.pendiente = null;
      if (p && ahoraMs() - p.t < EFECTO_TARDIO_MS) this.tocar(p.nombre, p.opciones);
      return s;
    }).catch(() => { this.carga = null; return null; }));
  }

  /**
   * Llamar DENTRO de un gesto (toque, clic, tecla): crea o reanuda el audio. `musica: false` (Tab, modificadoras) lo
   * desbloquea para los efectos sin arrancar la música.
   */
  desbloquear(opciones: { musica?: boolean } = {}): void {
    if (!this.browser || this.destruido) return;
    if (opciones.musica !== false) this.arranca = true;
    if (this.sonido) { this.sonido.desbloquear(); this.avisarContexto(); return; }
    // iOS 16.4+: «ambient» antes de crear el contexto, para que el interruptor de silencio calle Taps (y no corte la música
    // de la persona) también si el primer gesto llega antes que sonido.js, que lo declara igual al cargar.
    try {
      const nav = globalThis.navigator as Navigator & { audioSession?: { type: string } };
      if (nav?.audioSession) nav.audioSession.type = 'ambient';
    } catch { /* sin Audio Session API */ }
    if (!this.ctx) {
      const C = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      try { this.ctx = C ? new C({ latencyHint: 'interactive' }) : null; } catch { this.ctx = null; }
    }
    const estado = this.ctx?.state as string | undefined;
    if (estado === 'suspended' || estado === 'interrupted') this.ctx?.resume().catch(() => undefined);   // «interrupted»: iOS
    this.avisarContexto();
    void this.precargar();
  }

  /** El AudioContext compartido; null hasta el primer gesto (nunca se crea fuera de uno). */
  contexto(): AudioContext | null { return this.sonido?.contexto ?? this.ctx; }

  /** Conecta la música (u otro consumidor) al mismo audio. Un solo oyente. */
  escuchar(oyente: ITapsAudioOyente | null): void {
    this.oyente = oyente;
    oyente?.silencio?.(this.silencio);
    this.avisarContexto();
  }

  private avisarContexto(): void {
    const ctx = this.contexto();
    if (ctx && this.arranca) this.oyente?.contexto?.(ctx);
  }

  /**
   * Desbloquea con el primer gesto en cualquier parte mientras `permitido()` diga que sí (sonido no apagado). Solo eventos
   * que el navegador cuenta como activación (pointerup, click, keydown): con pointerdown, iOS no reanuda el audio y lo
   * programado se acumula. Captura y pasivo: no interfiere con nada.
   */
  escucharGestos(permitido: () => boolean): void {
    if (!this.browser || this.quitarGestos) return;
    const alGesto = (e: Event) => {
      this.gesto = true;
      if (!permitido()) return;
      const k = e as KeyboardEvent;
      const navegar = e.type === 'keydown' && (TECLAS_SIN_MUSICA.has(k.key) || k.ctrlKey || k.metaKey || k.altKey);
      this.desbloquear({ musica: !navegar });
    };
    const opts = { capture: true, passive: true };
    const tipos = ['pointerup', 'click', 'keydown'] as const;
    tipos.forEach(t => addEventListener(t, alGesto, opts));
    this.quitarGestos = () => tipos.forEach(t => removeEventListener(t, alGesto, opts));
  }

  /** Ya hubo un gesto de la persona en la página (requisito para hablar con Web Speech sin que el navegador lo bloquee). */
  huboGesto(): boolean {
    if (!this.browser) return false;
    const activacion = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    return this.gesto || !!activacion?.hasBeenActive;
  }

  silenciar(muted: boolean): void {
    this.silencio = muted;
    this.sonido?.silenciar(muted);
    this.oyente?.silencio?.(muted);
    if (muted) this.callar();
  }

  /**
   * Toca un efecto si el sonido está activo. Antes de cargar el módulo se guarda (solo el último) y suena al llegar si fue
   * hace menos de EFECTO_TARDIO_MS; nunca se espera ni se acumulan varios (el ritmo manda y no hay ráfagas).
   */
  tocar(nombre: TTapsEfecto, opciones: ITapsEfectoOpciones = {}): void {
    if (this.silencio || !this.browser) return;
    if (!this.sonido) { this.pendiente = { nombre, opciones, t: ahoraMs() }; return; }
    if (this.sonido.tocar(nombre, opciones) && EFECTOS_RESPUESTA.has(nombre)) this.oyente?.efecto?.(nombre);
  }

  /** Sintetiza en reposo los efectos de un tema para que el primer toque no espere ni 1 ms. */
  precalentar(tema: string): void { this.sonido?.precalentar(tema); }

  pausar(): void { this.callar(); this.sonido?.pausar(); }
  reanudar(): void { this.sonido?.reanudar(); }

  // ───────────── voz ─────────────
  /** Carga el módulo de voz y averigua si hay alguna voz utilizable (voces locales del sistema o audios pregenerados). */
  prepararVoz(): Promise<boolean> {
    if (!this.browser || this.destruido) return Promise.resolve(false);
    const voz = (this.cargaVoz ??= Promise.all([this.importar<IVozModulo>(TAPS_VOZ_URL), this.precargar()])
      .then(([mod, sonido]) => (this.voz = mod.crearVoz({ sonido, manifiesto: TAPS_VOZ_MANIFIESTO })))
      .catch(() => { this.cargaVoz = null; return null; }));
    return voz.then(v => v?.preparar() ?? false).then(ok => { this.vozDisponible.set(ok); return ok; }, () => false);
  }

  activarVoz(on: boolean): void {
    this.vozOn = on;
    if (!on) this.callar();
  }

  /** Dice un texto con el perfil del personaje sin pasar por el motor (si el escenario no cargó). */
  hablar(texto: string, personaje?: string): void { void this.motorVoz.hablar(texto, personaje); }

  callar(): void { this.voz?.callar(); }

  destruir(): void {
    this.destruido = true;
    this.oyente = null;
    this.quitarGestos?.();
    this.callar();
    this.sonido?.destruir();
    if (!this.sonido) this.ctx?.close().catch(() => undefined);
    this.sonido = null;
    this.voz = null;
  }

  /** Import por URL (no entra en el bundle). Aparte para poder sustituirlo en las pruebas. */
  protected importar<T>(url: string): Promise<T> { return import(/* @vite-ignore */ url) as Promise<T>; }
}

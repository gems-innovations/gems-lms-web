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
 *   pasa cuando llegue; así el primer acierto suena aunque el toque haya sido antes de la carga.
 * · Un solo AudioContext para todo: los escenarios del motor reciben `motorAudio` y no crean el suyo.
 * · La voz solo habla si la persona la encendió y el sonido está activo.
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
      this.sonido = s;
      return s;
    }).catch(() => { this.carga = null; return null; }));
  }

  /** Llamar DENTRO de un gesto (toque, clic, tecla): crea o reanuda el audio. */
  desbloquear(): void {
    if (!this.browser || this.destruido) return;
    if (this.sonido) { this.sonido.desbloquear(); return; }
    if (!this.ctx) {
      const C = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      try { this.ctx = C ? new C({ latencyHint: 'interactive' }) : null; } catch { this.ctx = null; }
    }
    const estado = this.ctx?.state as string | undefined;
    if (estado === 'suspended' || estado === 'interrupted') this.ctx?.resume().catch(() => undefined);   // «interrupted»: iOS
    void this.precargar();
  }

  /**
   * Desbloquea con el primer gesto en cualquier parte mientras `permitido()` diga que sí (sonido no apagado). Solo eventos
   * que el navegador cuenta como activación (pointerup, click, keydown): con pointerdown, iOS no reanuda el audio y lo
   * programado se acumula. Captura y pasivo: no interfiere con nada.
   */
  escucharGestos(permitido: () => boolean): void {
    if (!this.browser || this.quitarGestos) return;
    const alGesto = () => { this.gesto = true; if (permitido()) this.desbloquear(); };
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
    if (muted) this.callar();
  }

  /** Toca un efecto si el sonido está activo. Antes de cargar el módulo no suena (y no espera: el ritmo manda). */
  tocar(nombre: TTapsEfecto, opciones: ITapsEfectoOpciones = {}): void {
    if (this.silencio) return;
    this.sonido?.tocar(nombre, opciones);
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

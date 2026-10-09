import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from 'auth/core';
import { isGuestUser } from './guest-access.service';

/** Cabecera de las páginas públicas: cursos, instituciones y acceso normal a la plataforma. */
@Component({
  selector: 'gems-public-header',
  imports: [RouterLink],
  template: `
    <header class="ph">
      <a class="ph__brand" routerLink="/" aria-label="GEMS, inicio">
        <img src="/logo-144.png" width="34" height="34" alt="" />
        <span>GEMS</span>
      </a>
      <nav class="ph__nav" aria-label="Principal">
        <a routerLink="/" fragment="cursos">Cursos gratis</a>
        <a routerLink="/instituciones">Para instituciones</a>
      </nav>
      <div class="ph__actions">
        @if (signedIn()) {
          <a class="ph__btn ph__btn--primary" [routerLink]="home()">{{ guest() ? 'Mis cursos' : 'Ir a mi panel' }}</a>
        } @else {
          <!-- «Ya tengo cuenta» es para quien guardó su avance o recibió una cuenta de su institución;
               los cursos gratis no la necesitan. -->
          <a class="ph__btn ph__btn--ghost" routerLink="/auth/signin"><span class="ph__long">Ya tengo cuenta</span><span class="ph__short">Entrar</span></a>
          <a class="ph__btn ph__btn--primary" routerLink="/instituciones"><span class="ph__long">Para instituciones</span><span class="ph__short">Instituciones</span></a>
        }
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 50; }
    .ph {
      display: flex; align-items: center; gap: 20px;
      max-width: 1160px; margin: 0 auto; padding: 14px 20px;
      background: color-mix(in srgb, var(--color-fondo-principal) 82%, transparent);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--color-borde-principal);
    }
    .ph__brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--color-texto-principal);
      font: 800 20px/1 var(--font-titulo); letter-spacing: .02em; }
    .ph__nav { display: flex; gap: 18px; margin-left: 8px; }
    .ph__nav a { color: var(--color-texto-secundario); text-decoration: none; font-size: var(--font-size-sm); font-weight: 600; }
    .ph__nav a:hover { color: var(--color-texto-principal); }
    .ph__actions { display: flex; gap: 8px; margin-left: auto; }
    .ph__btn { display: inline-flex; align-items: center; padding: 9px 16px; border-radius: 10px; font-size: var(--font-size-sm);
      font-weight: 700; text-decoration: none; white-space: nowrap; transition: transform .15s ease, box-shadow .15s ease, background .15s; }
    .ph__btn--ghost { color: var(--color-texto-principal); border: 1px solid var(--color-borde-secundario); }
    .ph__btn--ghost:hover { border-color: var(--color-primario); }
    .ph__btn--primary { color: var(--color-sobre-primario); background: var(--color-primario-accion); }
    .ph__btn--primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px var(--color-primario-trans-20); }
    a:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 3px; border-radius: 8px; }
    .ph__short { display: none; }
    /* Celular: una sola línea. «Cursos gratis» es esta misma página e «Instituciones» lleva a /instituciones. */
    @media (max-width: 760px) {
      .ph { gap: 8px; padding: 10px 14px; }
      .ph__nav { display: none; }
      .ph__btn { padding: 8px 12px; min-height: 44px; }
      .ph__brand { min-height: 44px; }
    }
    @media (max-width: 420px) {
      .ph__long { display: none; }
      .ph__short { display: inline; }
      .ph__brand img { width: 30px; height: 30px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeaderComponent {
  private readonly session = inject(AuthSessionService);
  protected readonly signedIn = this.session.isAuthenticated;
  protected readonly guest = computed(() => isGuestUser(this.session.user()));
  protected readonly home = computed(() => this.guest() ? '/learn/my-learning' : this.session.getHomeRoute());
}

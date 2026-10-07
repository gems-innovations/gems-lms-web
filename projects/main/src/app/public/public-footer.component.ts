import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pie de las páginas públicas: aviso de no afiliación y enlaces legales. */
@Component({
  selector: 'gems-public-footer',
  imports: [RouterLink],
  template: `
    <footer class="pf">
      <nav class="pf__links" aria-label="Información legal">
        <a routerLink="/terminos">Términos de uso</a>
        <a routerLink="/privacidad">Privacidad y datos</a>
        <a routerLink="/instituciones">Enseña en GEMS</a>
        <a routerLink="/auth/signin">Iniciar sesión</a>
      </nav>
      <p>GEMS · Material de práctica con preguntas originales construidas a partir del análisis de exámenes oficiales publicados.
        No estamos afiliados a ninguna universidad, al ICFES ni al Ministerio de Educación. Los nombres de exámenes y universidades se usan solo para describir.</p>
    </footer>
  `,
  styles: [`
    .pf { display: grid; gap: 14px; justify-items: center; padding: 28px 20px calc(env(safe-area-inset-bottom, 0px) + 40px);
      text-align: center; border-top: 1px solid var(--color-borde-principal); background: var(--color-fondo-principal); }
    .pf__links { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; }
    .pf__links a { color: var(--color-texto-secundario); text-decoration: none; font-size: var(--font-size-sm); font-weight: 600; }
    .pf__links a:hover { color: var(--color-texto-principal); }
    .pf__links a:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 3px; border-radius: 6px; }
    p { margin: 0; max-width: 72ch; font-size: var(--font-size-xs); line-height: 1.6; color: var(--color-texto-terciario); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicFooterComponent {}

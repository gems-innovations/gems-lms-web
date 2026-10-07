import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';

/**
 * Términos de uso y política de privacidad de la parte pública (`data.doc`: 'terminos' | 'privacidad').
 * Borrador base: debe revisarlo un abogado antes del lanzamiento.
 */
@Component({
  selector: 'gems-legal-page',
  imports: [RouterLink, PublicHeaderComponent, PublicFooterComponent],
  template: `
    <gems-public-header />
    <main class="pub legal-doc">
      <a class="back" routerLink="/">← Volver al inicio</a>
      @if (doc() === 'terminos') {
        <h1>Términos de uso</h1>
        <p class="upd">Última actualización: octubre de 2026</p>
        <h2>1. Qué es GEMS</h2>
        <p>GEMS es una plataforma educativa que ofrece cursos gratuitos de preparación para exámenes de admisión y pruebas de Estado, y un servicio para que instituciones gestionen sus propios cursos.</p>
        <h2>2. Sin afiliación oficial</h2>
        <p>GEMS no está afiliado, patrocinado ni avalado por ninguna universidad, por el ICFES ni por el Ministerio de Educación Nacional. Los nombres de exámenes e instituciones se usan únicamente de forma descriptiva.</p>
        <h2>3. Material de práctica, sin garantías</h2>
        <p>Los cursos son material de apoyo. No garantizan un puntaje, la admisión a ningún programa ni resultados específicos. Puntajes de corte, fechas, cupos y requisitos mencionados son orientativos; la información válida es la publicada por cada institución.</p>
        <h2>4. Contenido original</h2>
        <p>Las preguntas y explicaciones son elaboradas por GEMS a partir del análisis de temas y formatos de exámenes publicados; no reproducen pruebas oficiales. Si consideras que algún contenido vulnera derechos de autor, escríbenos y lo revisaremos de inmediato.</p>
        <h2>5. Acceso como invitado y cuentas</h2>
        <p>Puedes estudiar como invitado sin dar datos personales. Si decides crear una cuenta, debes dar información veraz y cuidar tu contraseña. Los menores de 18 años deben hacerlo con el acompañamiento de su madre, padre o acudiente.</p>
        <h2>6. Uso adecuado</h2>
        <p>No está permitido copiar o revender el contenido, automatizar el acceso, intentar vulnerar la plataforma ni usarla para fines ilícitos. Podemos suspender el acceso ante usos indebidos.</p>
        <h2>7. Cambios</h2>
        <p>Podemos actualizar los cursos y estos términos. Publicaremos aquí la versión vigente con su fecha.</p>
        <h2>8. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de la República de Colombia.</p>
      } @else {
        <h1>Política de privacidad y tratamiento de datos</h1>
        <p class="upd">Última actualización: octubre de 2026</p>
        <h2>1. Responsable</h2>
        <p>GEMS es responsable del tratamiento de los datos personales recogidos en esta plataforma, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).</p>
        <h2>2. Qué datos tratamos</h2>
        <p><strong>Como invitado:</strong> solo un apodo opcional y tu avance (lecciones vistas, respuestas y puntajes) asociado a un identificador anónimo. <strong>Con cuenta:</strong> nombre, correo y contraseña cifrada. <strong>Instituciones:</strong> los datos de contacto del formulario de solicitud.</p>
        <h2>3. Para qué los usamos</h2>
        <p>Para mostrarte tu progreso, darte acceso a los cursos, mejorar el contenido con estadísticas agregadas y, en el caso de instituciones, contactarte sobre el servicio. No vendemos tus datos ni los usamos para publicidad de terceros.</p>
        <h2>4. Menores de edad</h2>
        <p>El acceso como invitado no requiere datos personales. Si eres menor de 18 años, crea tu cuenta con autorización de tu madre, padre o representante legal; respetamos el interés superior de niñas, niños y adolescentes.</p>
        <h2>5. Tus derechos</h2>
        <p>Puedes conocer, actualizar, rectificar y suprimir tus datos, revocar tu autorización y pedir prueba de ella, y presentar quejas ante la Superintendencia de Industria y Comercio. Para ejercerlos, escríbenos desde el correo de tu cuenta.</p>
        <h2>6. Seguridad y conservación</h2>
        <p>Aplicamos medidas técnicas razonables (conexiones cifradas, contraseñas con hash, acceso restringido). Conservamos los datos mientras tengas tu cuenta o sean necesarios para la finalidad informada.</p>
        <h2>7. Cookies y almacenamiento local</h2>
        <p>Usamos almacenamiento del navegador para mantener tu sesión y tus preferencias. No usamos cookies de publicidad.</p>
      }
      <p class="draft">¿Dudas sobre estos documentos? Escríbenos a través de <a routerLink="/instituciones">nuestro formulario de contacto</a>.</p>
    </main>
    <gems-public-footer />
  `,
  styleUrl: './public.scss',
  styles: [`
    .legal-doc { max-width: 760px; padding-block: 0 72px; }
    .back { display: inline-flex; margin-top: 24px; color: var(--color-texto-secundario); text-decoration: none; font-size: var(--font-size-sm); }
    h1 { margin: 18px 0 4px; font: 800 clamp(26px, 4vw, 38px)/1.15 var(--font-titulo); text-wrap: balance; }
    h2 { margin-top: 28px; font-size: 20px; }
    p { margin: 10px 0 0; line-height: 1.7; color: var(--color-texto-secundario); }
    strong { color: var(--color-texto-principal); }
    a { color: var(--color-texto-acento); }
    .upd, .draft { font-size: var(--font-size-sm); color: var(--color-texto-terciario); }
    .draft { margin-top: 36px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPageComponent {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  protected readonly doc = computed(() => this.data['doc'] as string);
}

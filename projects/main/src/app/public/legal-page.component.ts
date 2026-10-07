import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';

/**
 * Términos de uso y política de privacidad de la parte pública (`data.doc`: 'terminos' | 'privacidad').
 * Versión 2026-10 (la misma que guarda ms-auth al registrar la autorización). Debe revisarlo un abogado.
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
        <p class="upd">Versión 2026-10 · Vigente desde el 7 de octubre de 2026</p>
        <h2>1. Quién ofrece el servicio</h2>
        <p>GEMS es una plataforma educativa de {{ responsable.nombre }}{{ responsable.nit ? ', NIT ' + responsable.nit : '' }}. Ofrece cursos gratuitos abiertos y un servicio para que instituciones, empresas, profesores y grupos gestionen sus propios cursos. Contacto: <a [href]="'mailto:' + responsable.correo">{{ responsable.correo }}</a>.</p>
        <h2>2. Sin afiliación oficial</h2>
        <p>GEMS no está afiliado, patrocinado ni avalado por ninguna universidad, por el ICFES ni por el Ministerio de Educación Nacional. Los nombres de exámenes e instituciones se usan únicamente de forma descriptiva.</p>
        <h2>3. Material de práctica, sin garantías</h2>
        <p>Los cursos son material de apoyo. Los puntajes que ves en las prácticas y simulacros son <strong>orientativos</strong>: no equivalen al puntaje de ningún examen oficial y no garantizan un resultado, la admisión a un programa ni ningún logro específico. Fechas, cupos y requisitos mencionados son informativos; la información válida es la publicada por cada institución.</p>
        <h2>4. Cursos gratuitos</h2>
        <p>Los cursos abiertos de GEMS son gratuitos mientras se ofrezcan como tales. Podemos actualizarlos, cambiar su contenido o retirarlos; si algún día un curso deja de ser gratuito, lo informaremos antes y no se cobrará por el avance ya hecho.</p>
        <h2>5. Contenido original y derechos</h2>
        <p>Las lecciones, preguntas y explicaciones son elaboradas por GEMS y no reproducen pruebas oficiales. Solo puedes usarlas para tu estudio personal. Si consideras que algún contenido vulnera derechos de autor, escríbenos y lo revisaremos de inmediato.</p>
        <h2>6. Acceso como invitado y cuentas</h2>
        <p>Puedes estudiar como invitado sin dar datos personales. Si creas una cuenta, debes dar información veraz y cuidar tu contraseña. Los menores de 18 años deben crearla con autorización de su madre, padre o representante legal.</p>
        <h2>7. Uso adecuado</h2>
        <p>No está permitido copiar o revender el contenido, automatizar el acceso, intentar vulnerar la plataforma ni usarla para fines ilícitos. Podemos suspender el acceso ante usos indebidos.</p>
        <h2>8. Correos</h2>
        <p>Te escribimos sobre tu cuenta (por ejemplo, para confirmar tu correo o restablecer tu contraseña) y sobre tus cursos. Los recordatorios e ideas para seguir estudiando solo los recibes si los autorizas, nunca en domingo ni festivo, y puedes dejar de recibirlos desde el enlace que trae cada correo.</p>
        <h2>9. Cambios</h2>
        <p>Podemos actualizar estos términos. Publicaremos aquí la versión vigente con su fecha y, si el cambio es importante, te avisaremos.</p>
        <h2>10. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de la República de Colombia, incluido el Estatuto del Consumidor (Ley 1480 de 2011) en lo que aplique.</p>
      } @else {
        <h1>Política de tratamiento de datos personales</h1>
        <p class="upd">Versión 2026-10 · Vigente desde el 7 de octubre de 2026</p>
        <h2>1. Responsable</h2>
        <p>{{ responsable.nombre }}{{ responsable.nit ? ', NIT ' + responsable.nit : '' }}{{ responsable.direccion ? ', ' + responsable.direccion : '' }}. Correo para todo lo relacionado con tus datos: <a [href]="'mailto:' + responsable.correo">{{ responsable.correo }}</a>. Esta política sigue la Ley 1581 de 2012 y el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).</p>
        <h2>2. Qué datos tratamos</h2>
        <p><strong>Como invitado:</strong> solo un apodo opcional y tu avance (lecciones vistas, respuestas y puntajes), asociado a un identificador anónimo. <strong>Con cuenta:</strong> nombre, apellido, correo, contraseña cifrada, tu avance y tus preferencias de correo. <strong>Instituciones:</strong> los datos de contacto del formulario de solicitud. No tratamos datos sensibles.</p>
        <h2>3. Para qué los usamos</h2>
        <p>Para darte acceso a los cursos y guardar tu progreso; para enviarte correos sobre tu cuenta y tus cursos; para mejorar el contenido con estadísticas agregadas; para atender solicitudes de instituciones; y, <strong>solo si lo autorizas</strong>, para enviarte recordatorios e ideas para seguir estudiando. No vendemos tus datos ni los usamos para publicidad de terceros.</p>
        <h2>4. Tu autorización</h2>
        <p>Al crear tu cuenta marcas que autorizas este tratamiento, y guardamos la fecha y la versión de la política que aceptaste. Los recordatorios tienen una autorización aparte, opcional y desmarcada por defecto. Puedes revocar cualquiera de las dos cuando quieras.</p>
        <h2>5. Con quién los compartimos</h2>
        <p>Usamos proveedores que tratan los datos por nuestra cuenta y bajo nuestras instrucciones: <strong>Google (Google Workspace)</strong> y <strong>Brevo</strong> para enviar correos, y el proveedor de servidores donde funciona la plataforma. Algunos están fuera de Colombia, lo que constituye una transmisión internacional de datos; exigimos que los protejan con estándares equivalentes. Si estudias en una institución, ella también ve tu avance en sus cursos.</p>
        <h2>6. Menores de edad</h2>
        <p>El acceso como invitado no requiere datos personales. Si eres menor de 18 años, crea tu cuenta con autorización de tu madre, padre o representante legal. Respetamos el interés superior de niñas, niños y adolescentes y solo tratamos sus datos para fines educativos.</p>
        <h2>7. Tus derechos</h2>
        <p>Puedes conocer, actualizar, rectificar y suprimir tus datos; pedir prueba de tu autorización y revocarla; saber cómo los usamos; y presentar quejas ante la Superintendencia de Industria y Comercio después de haber acudido a nosotros. Ejercerlos es gratis.</p>
        <h2>8. Cómo ejercerlos</h2>
        <p>Escríbenos a <a [href]="'mailto:' + responsable.correo">{{ responsable.correo }}</a> desde el correo de tu cuenta. Respondemos las <strong>consultas en máximo 10 días hábiles</strong> y los <strong>reclamos en máximo 15 días hábiles</strong>, prorrogables en los casos que la ley permite. Para dejar de recibir correos basta con el enlace que trae cada uno.</p>
        <h2>9. Seguridad y conservación</h2>
        <p>Aplicamos medidas técnicas razonables: conexiones cifradas, contraseñas con hash y acceso restringido. Conservamos los datos mientras tengas tu cuenta o sean necesarios para la finalidad informada; las cuentas de invitado que nunca se convierten pueden eliminarse.</p>
        <h2>10. Cookies y almacenamiento local</h2>
        <p>Usamos el almacenamiento del navegador para mantener tu sesión y tus preferencias. No usamos cookies de publicidad.</p>
        <h2>11. Cambios a esta política</h2>
        <p>Si cambiamos algo importante, lo publicaremos aquí con la nueva versión y, cuando la ley lo exija, te pediremos de nuevo tu autorización.</p>
      }
      <p class="draft">¿Dudas sobre estos documentos? Escríbenos a <a [href]="'mailto:' + responsable.correo">{{ responsable.correo }}</a>.</p>
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
  /** Responsable del tratamiento. Completa razón social, NIT y dirección cuando estén confirmados. */
  protected readonly responsable = { nombre: 'GEMS Innovations', nit: '', direccion: '', correo: 'info@gemsinnovations.com' };
}

/** Punto de partida del modo «Landing propia». Los marcadores los reemplaza el sitio: ver la ayuda del editor. */
export const STARTER_HTML = `<header class="top">
  <a class="brand" href="/"><img class="brand__logo" src="{{logo}}" alt=""><span>{{nombre}}</span></a>
  <a class="btn" href="{{ingresar}}">Iniciar sesión</a>
</header>

<section class="hero">
  <h1>Bienvenidos a {{nombre}}</h1>
  <p>Aprende a tu ritmo con los cursos de nuestra institución.</p>
  <a class="btn btn--solid" href="{{ingresar}}">Ingresar a la plataforma</a>
</section>

<section class="courses">
  <h2>Nuestros cursos</h2>
  {{cursos}}
</section>

<footer class="foot">{{nombre}}</footer>`;

export const STARTER_CSS = `body { margin: 0; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 16px 48px; }
.brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 700; color: inherit; text-decoration: none; }
.brand__logo { height: 36px; }
.btn { padding: 10px 20px; border: 2px solid currentColor; border-radius: 999px; color: inherit; text-decoration: none; }
.btn--solid { background: var(--color-primario); border-color: var(--color-primario); color: #fff; }
.hero { padding: 96px 24px; text-align: center; background: linear-gradient(160deg, #0a3d62, #1e6091); color: #fff; }
.hero h1 { margin: 0 0 12px; font-size: 3rem; }
.hero p { margin: 0 0 24px; font-size: 1.2rem; }
.courses { max-width: 1100px; margin: 0 auto; padding: 48px 24px; }
.foot { padding: 24px; text-align: center; opacity: 0.7; }`;

export const BASE_BANNER_EXAMPLE = '<div class="aviso">Matrículas abiertas hasta el 30 de noviembre</div>';
export const BASE_CSS_EXAMPLE = `.tb-hero { background: linear-gradient(160deg, #0a3d62, #1e6091); color: #fff; }
.tb-hero p { color: #dbeafe; }
.aviso { padding: 10px; text-align: center; background: #fde68a; color: #422006; }`;

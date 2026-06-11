import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'edu-student-hero',
  template: `
    <section class="shero">
      <div class="shero__bg"></div>
      <div class="shero__inner">
        <div class="shero__left">
          <p class="shero__eyebrow">{{ greeting() }}</p>
          <h1 class="shero__title">Tu espacio de<br /><span class="shero__accent">aprendizaje</span></h1>
          <p class="shero__sub">Sigue tu progreso, retoma donde lo dejaste y descubre nuevo contenido.</p>
        </div>
        <div class="shero__stats">
          <div class="shero__stat">
            <span class="shero__stat-n">{{ enrolledCount() }}</span>
            <span class="shero__stat-l">Matriculados</span>
          </div>
          <div class="shero__divider"></div>
          <div class="shero__stat">
            <span class="shero__stat-n">{{ completedCount() }}</span>
            <span class="shero__stat-l">Completados</span>
          </div>
          <div class="shero__divider"></div>
          <div class="shero__stat">
            <span class="shero__stat-n">{{ activePathsCount() }}</span>
            <span class="shero__stat-l">Rutas activas</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './student-hero.scss'
})
export class StudentHero {
  readonly enrolledCount = input<number>(0);
  readonly completedCount = input<number>(0);
  readonly activePathsCount = input<number>(0);

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });
}

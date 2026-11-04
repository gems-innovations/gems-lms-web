import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageComponent, PageHeaderComponent, EmptyStateComponent } from 'shared';
import { SkeletonComponent } from 'shared/loading';
import { ITapReportado, TapsModerationService } from '../../../services/taps-moderation.service';

@Component({
  selector: 'adm-taps-moderation-container',
  imports: [DatePipe, PageComponent, PageHeaderComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './taps-moderation-container.html',
  styleUrl: './taps-moderation-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TapsModerationContainer implements OnInit {
  private readonly svc = inject(TapsModerationService);
  readonly comentarios = signal<ITapReportado[]>([]);
  readonly siguiente = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  /** id del comentario cuya acción está en curso (evita doble clic). */
  readonly enCurso = signal<number | null>(null);
  readonly fallo = signal<string | null>(null);

  ngOnInit(): void { this.cargar(); }

  cargar(antes: number | null = null): void {
    this.loading.set(true);
    this.error.set(false);
    this.svc.reportados(antes).subscribe({
      next: p => {
        this.comentarios.update(l => antes ? [...l, ...p.comentarios] : p.comentarios);
        this.siguiente.set(p.siguiente);
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  /** Ocultar o dejar visible: en ambos casos queda revisado y sale de la cola. */
  decidir(c: ITapReportado, oculto: boolean): void {
    this.enCurso.set(c.id);
    this.fallo.set(null);
    this.svc.cambiarOculto(c.id, oculto).subscribe({
      next: () => {
        this.comentarios.update(l => l.filter(x => x.id !== c.id));
        this.enCurso.set(null);
        if (!this.comentarios().length && this.siguiente()) this.cargar();   // quedaban más: no mostrar «Nada por revisar»
      },
      error: () => { this.fallo.set('No se pudo guardar. Inténtalo de nuevo.'); this.enCurso.set(null); },
    });
  }
}

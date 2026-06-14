import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursePlayerUseCase } from '../../../../application/course-player.usecase';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';
import { PlayerTopbar } from '../../components/player-topbar/player-topbar';
import { PlayerSidebar } from '../../components/player-sidebar/player-sidebar';
import { PlayerContentBlock } from '../../components/player-content-block/player-content-block';
import {
  IQuizSubmitPayload, IAssignmentSubmitPayload
} from '../../../../domain/model/player.model';

@Component({
  selector: 'edu-course-player-container',
  standalone: true,
  imports: [LoadingSkeletonComponent, EmptyStateComponent, PlayerTopbar, PlayerSidebar, PlayerContentBlock],
  templateUrl: './course-player-container.html',
  styleUrl: './course-player-container.scss',
  host: { style: 'display:block;height:100%' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePlayerContainer implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(CoursePlayerUseCase);

  protected readonly sidebarCollapsed = signal(false);
  // null = usar CSS default (30%). Solo se pone en píxeles cuando el usuario arrastra.
  protected readonly sidebarWidthPx   = signal<number | null>(null);

  ngOnInit(): void {
    const snap = this.route.snapshot;
    this.uc.init(
      snap.paramMap.get('id') ?? '',
      snap.queryParams['lesson'] ?? null,
      snap.queryParams['block']  ?? null,
    );
  }

  protected startSidebarResize(event: MouseEvent): void {
    event.preventDefault();
    // La primera vez que el usuario arrastra, necesitamos el ancho actual del elemento.
    // Lo leemos del DOM en el momento del drag.
    const handle = (event.target as HTMLElement).closest('aside') as HTMLElement | null;
    const startWidth = handle ? handle.offsetWidth : 400;
    const startX     = event.clientX;

    const onMove = (e: MouseEvent): void => {
      const delta  = startX - e.clientX;
      const newW   = Math.round(startWidth + delta);
      const bodyW  = (event.target as HTMLElement).closest('.course-player-container__body') as HTMLElement | null;
      const maxW   = bodyW ? Math.round(bodyW.offsetWidth * 0.60) : 900;
      this.sidebarWidthPx.set(Math.min(maxW, Math.max(200, newW)));
    };
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  protected goHome(): void { this.router.navigate(['/learn/home']); }

  protected handleQuizSubmit(payload: IQuizSubmitPayload): void { this.uc.handleQuizSubmit(payload); }
  protected handleAssignmentSubmit(payload: IAssignmentSubmitPayload): void { this.uc.handleAssignmentSubmit(payload); }
}

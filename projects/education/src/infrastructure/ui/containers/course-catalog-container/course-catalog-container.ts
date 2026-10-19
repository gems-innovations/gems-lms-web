import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseCatalogUseCase } from '../../../../application/course-catalog.usecase';
import { ICatalogItem } from '../../../../domain/model/catalog.model';
import { CatalogCard } from '../../components/catalog-card/catalog-card';
import { CatalogFilterBar } from '../../components/catalog-filter-bar/catalog-filter-bar';
import { CatalogHero } from '../../components/catalog-hero/catalog-hero';
import {
  PageComponent, CardGridComponent,
  LoadingSkeletonComponent, EmptyStateComponent, EMPTY_STATES,
} from 'shared';

@Component({
  selector: 'edu-course-catalog-container',
  standalone: true,
  host: { style: 'display:block' },
  imports: [
    PageComponent, CardGridComponent,
    LoadingSkeletonComponent, EmptyStateComponent,
    CatalogCard, CatalogFilterBar, CatalogHero,
  ],
  templateUrl: './course-catalog-container.html',
  styleUrl: './course-catalog-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCatalogContainer implements OnInit {
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  protected readonly uc   = inject(CourseCatalogUseCase);
  protected readonly copy = EMPTY_STATES;

  ngOnInit(): void {
    // ?tipo=rutas|cursos llega desde los estados vacíos de «Mi aprendizaje».
    const tipo = this.route.snapshot.queryParamMap.get('tipo');
    if (tipo === 'rutas') this.uc.setFilterKind('path');
    else if (tipo === 'cursos') this.uc.setFilterKind('course');
    this.uc.load();
  }

  protected enroll(item: ICatalogItem): void { this.uc.enroll(item); }

  protected open(item: ICatalogItem): void {
    if (item.kind === 'course') this.router.navigate(['/learn/courses', item.id]);
    else this.router.navigate(['/learn/preview', 'paths', item.id]);
  }

  protected preview(item: ICatalogItem): void {
    if (item.kind === 'path') this.router.navigate(['/learn/preview', 'paths', item.id]);
    else this.router.navigate(['/learn/preview', 'courses', item.id]);
  }
}

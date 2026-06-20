import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CourseCatalogUseCase } from '../../../../application/course-catalog.usecase';
import { ICatalogItem } from '../../../../domain/model/catalog.model';
import { CatalogCard } from '../../components/catalog-card/catalog-card';
import { CatalogFilterBar } from '../../components/catalog-filter-bar/catalog-filter-bar';
import { CatalogHero } from '../../components/catalog-hero/catalog-hero';
import {
  PageComponent, CardGridComponent,
  LoadingSkeletonComponent, EmptyStateComponent,
} from 'shared';

const CATALOG_PAGE_SIZE = 9;

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
  protected readonly uc   = inject(CourseCatalogUseCase);

  protected readonly catalogPage = signal(1);

  protected readonly catalogTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.uc.filtered().length / CATALOG_PAGE_SIZE))
  );

  protected readonly pagedItems = computed(() => {
    const page = this.catalogPage();
    return this.uc.filtered().slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  });

  constructor() {
    effect(() => {
      // Reset page to 1 when filters change
      this.uc.search();
      this.uc.filterKind();
      this.uc.filterLevel();
      this.catalogPage.set(1);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void { this.uc.load(); }

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

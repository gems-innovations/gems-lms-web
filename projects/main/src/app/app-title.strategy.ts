import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SITE_NAME, SeoService } from './seo.service';

/** Título de la pestaña y, en el mismo paso, los metadatos para buscadores y para compartir (SeoService). */
@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly seo = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(pageTitle ? `${pageTitle} | ${SITE_NAME}` : SITE_NAME);
    this.seo.apply(snapshot, pageTitle ?? SITE_NAME);
  }
}

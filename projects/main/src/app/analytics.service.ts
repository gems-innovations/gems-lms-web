import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

interface IGoatCounter {
  count?: (vars: { path: string; title?: string }) => void;
}

const SCRIPT_ID = 'goatcounter-script';
const NUMERIC_OR_UUID = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const LONG_TOKEN = /^[\w-]{16,}$/;

/** Path sent to the counter: no query string and no ids or tokens, so visits are grouped by screen. */
export function toAnalyticsPath(url: string): string {
  const path = url.split(/[?#]/)[0];
  const segments = path.split('/').map(segment => {
    if (NUMERIC_OR_UUID.test(segment)) return ':id';
    return LONG_TOKEN.test(segment) ? ':token' : segment;
  });
  return segments.join('/') || '/';
}

/** Page views for GoatCounter (cookie-less). The script is in index.html with no_onload, so the router reports every page, the first one included. */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private lastPath: string | null = null;

  start(): void {
    if (!this.isBrowser) return;
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(event => this.track(toAnalyticsPath(event.urlAfterRedirects)));
  }

  private track(path: string): void {
    this.lastPath = path;
    if (this.counter()?.count) { this.counter()!.count!({ path }); return; }
    // The script loads async: report the latest page once it is ready.
    document.getElementById(SCRIPT_ID)?.addEventListener('load', () => {
      if (this.lastPath !== null) this.counter()?.count?.({ path: this.lastPath });
    }, { once: true });
  }

  private counter(): IGoatCounter | undefined {
    return (window as unknown as { goatcounter?: IGoatCounter }).goatcounter;
  }
}

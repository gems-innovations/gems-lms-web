import { Injectable, PLATFORM_ID, DestroyRef, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, fromEvent, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class AppStatusService {
  readonly online = signal(true);
  readonly updateReady = signal(false);

  private readonly swUpdate = inject(SwUpdate);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (!this.isBrowser) return;

    this.online.set(navigator.onLine);
    merge(fromEvent(window, 'online'), fromEvent(window, 'offline'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.online.set(navigator.onLine));

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => this.updateReady.set(true));
    }
  }

  async applyUpdate(): Promise<void> {
    if (!this.isBrowser || !this.swUpdate.isEnabled) return;
    await this.swUpdate.activateUpdate();
    window.location.reload();
  }
}

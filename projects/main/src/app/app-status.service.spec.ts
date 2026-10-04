import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppStatusService } from './app-status.service';

describe('AppStatusService', () => {
  const versions = new Subject<VersionReadyEvent>();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{
        provide: SwUpdate,
        useValue: { isEnabled: true, versionUpdates: versions.asObservable(), activateUpdate: () => Promise.resolve(true) }
      }]
    });
  });

  it('announces when a new application version is ready', () => {
    const service = TestBed.inject(AppStatusService);

    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined }
    });

    expect(service.updateReady()).toBeTrue();
  });

  it('tracks browser connectivity changes', () => {
    const online = spyOnProperty(navigator, 'onLine', 'get');
    online.and.returnValue(true);
    const service = TestBed.inject(AppStatusService);

    online.and.returnValue(false);
    window.dispatchEvent(new Event('offline'));

    expect(service.online()).toBeFalse();
  });
});

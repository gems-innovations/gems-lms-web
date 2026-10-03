import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FileUploadService } from './file-upload.service';
import { environment } from '../ui/environments/environment';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let http: HttpTestingController;
  const origin = new URL(environment.apiBaseUrl).origin;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FileUploadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads the file with its scope and returns an absolute URL', () => {
    const file = new File(['hola'], 'tarea.txt', { type: 'text/plain' });
    let url = '';
    service.upload(file, 'private').subscribe(f => (url = f.url));

    const req = http.expectOne(`${environment.apiUrls.files}?scope=private`);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('file')).toBeTruthy();
    req.flush({ id: 'abc', name: 'tarea.txt', contentType: 'text/plain', size: 4, url: '/api/v1/files/abc' });

    expect(url).toBe(`${origin}/api/v1/files/abc`);
  });

  it('tells private API files apart from public images and external links', () => {
    expect(service.isPrivateApiFile(`${origin}/api/v1/files/abc`)).toBeTrue();
    expect(service.isPrivateApiFile(`${origin}/api/v1/files/public/abc`)).toBeFalse();
    expect(service.isPrivateApiFile('https://github.com/x/y/pull/1')).toBeFalse();
  });
});
